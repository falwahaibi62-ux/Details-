/**
 * Wathek - Job documents (private PDF per job) and Lot sticker badge
 *
 * - One PDF per job, stored in the PRIVATE Supabase bucket "job-documents".
 * - Duplicate protection: the SHA-256 of the file is checked before upload (the database also enforces it).
 * - "Show Job" opens the PDF from the private bucket as a temporary in-memory blob (no public or shareable link).
 * - Lot field = sticker code written on a background of the sticker color (columns jobs_report.lot_no / tape_color).
 * - The file name in storage never contains customer data (path = <jobId>/<hash>.pdf).
 */
(function () {
    'use strict';

    var BUCKET = 'job-documents';
    var MAX_BYTES = 15 * 1024 * 1024;

    var COLORS = {
        orange: { label: 'Orange', bg: '#f97316', fg: '#ffffff' },
        yellow: { label: 'Yellow', bg: '#facc15', fg: '#422006' },
        green:  { label: 'Green',  bg: '#22c55e', fg: '#ffffff' },
        blue:   { label: 'Blue',   bg: '#3b82f6', fg: '#ffffff' },
        red:    { label: 'Red',    bg: '#ef4444', fg: '#ffffff' },
        pink:   { label: 'Pink',   bg: '#ec4899', fg: '#ffffff' },
        purple: { label: 'Purple', bg: '#8b5cf6', fg: '#ffffff' },
        white:  { label: 'White',  bg: '#ffffff', fg: '#334155', border: '#94a3b8' }
    };

    var docsByJob = {};          // job_id -> document row
    var currentBlobUrl = null;

    function sb() { return window.supabaseClient; }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function role() { return window.currentUserRole || 'Viewer'; }
    function userEmail() { return (window.currentLoggedInUser && window.currentLoggedInUser.email) || null; }

    // ---------- Lot badge ----------
    function colorKey(c) {
        var k = String(c || '').trim().toLowerCase();
        return COLORS[k] ? k : '';
    }

    function lotBadge(lot, color) {
        var code = String(lot || '').trim();
        if (!code) return '<span class="text-surface-300">-</span>';
        var c = COLORS[colorKey(color)];
        var style = c
            ? 'background:' + c.bg + ';color:' + c.fg + ';' + (c.border ? 'border:1px solid ' + c.border + ';' : '')
            : 'background:#e2e8f0;color:#334155;';
        return '<span style="' + style + 'padding:2px 8px;border-radius:999px;font-weight:700;font-size:11px;letter-spacing:.03em;white-space:nowrap;display:inline-block">' + esc(code) + '</span>';
    }

    function paintLotPreview() {
        var el = document.getElementById('jobLotPreview');
        if (!el) return;
        var code = (document.getElementById('jobLotNo') || {}).value || '';
        var col = (document.getElementById('jobTapeColor') || {}).value || '';
        el.innerHTML = code.trim() ? lotBadge(code, col) : '';
        var box = document.getElementById('jobLotColors');
        if (box) {
            box.querySelectorAll('button').forEach(function (b) {
                var on = b.getAttribute('data-color') === col;
                b.style.outline = on ? '2px solid #0f172a' : 'none';
                b.style.outlineOffset = '2px';
            });
        }
    }

    function buildLotControls() {
        var box = document.getElementById('jobLotColors');
        if (!box || box.getAttribute('data-built')) return;
        box.setAttribute('data-built', '1');
        Object.keys(COLORS).forEach(function (k) {
            var c = COLORS[k];
            var b = document.createElement('button');
            b.type = 'button';
            b.title = c.label;
            b.setAttribute('data-color', k);
            b.style.cssText = 'width:22px;height:22px;border-radius:999px;cursor:pointer;background:' + c.bg + ';border:1px solid ' + (c.border || 'rgba(0,0,0,.15)');
            b.addEventListener('click', function () {
                var h = document.getElementById('jobTapeColor');
                h.value = h.value === k ? '' : k; // click again to clear
                paintLotPreview();
            });
            box.appendChild(b);
        });
        var inp = document.getElementById('jobLotNo');
        if (inp) inp.addEventListener('input', function () { inp.value = inp.value.toUpperCase().replace(/\s+/g, ''); paintLotPreview(); });
    }

    function resetForm() {
        buildLotControls();
        var h = document.getElementById('jobTapeColor'); if (h) h.value = '';
        var f = document.getElementById('jobDocFile'); if (f) f.value = '';
        setDocStatus('');
        paintLotPreview();
    }

    function fillForm(job) {
        buildLotControls();
        var lot = document.getElementById('jobLotNo'); if (lot) lot.value = job.lot_no || '';
        var col = document.getElementById('jobTapeColor'); if (col) col.value = colorKey(job.tape_color);
        var f = document.getElementById('jobDocFile'); if (f) f.value = '';
        var d = docsByJob[String(job.id)];
        setDocStatus(d ? 'Attached: ' + (d.file_name || 'document.pdf') + ' (to replace it, ask the Admin to remove it first)' : '');
        paintLotPreview();
    }

    function lotValues() {
        var lot = ((document.getElementById('jobLotNo') || {}).value || '').trim().toUpperCase();
        var col = colorKey((document.getElementById('jobTapeColor') || {}).value);
        return { lot_no: lot || null, tape_color: lot ? (col || null) : null };
    }

    function setDocStatus(text, isError) {
        var el = document.getElementById('jobDocStatus');
        if (!el) return;
        el.textContent = text || '';
        el.style.color = isError ? '#b91c1c' : '#64748b';
    }

    // ---------- Hashing / validation ----------
    async function sha256Hex(file) {
        var buf = await file.arrayBuffer();
        var digest = await crypto.subtle.digest('SHA-256', buf);
        return Array.prototype.map.call(new Uint8Array(digest), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }

    async function looksLikePdf(file) {
        var head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
        return String.fromCharCode.apply(null, head) === '%PDF-';
    }

    function selectedFile() {
        var f = document.getElementById('jobDocFile');
        return f && f.files && f.files[0] ? f.files[0] : null;
    }

    // ---------- Index of existing documents ----------
    async function loadIndex() {
        if (!sb()) return;
        var r = await sb().from('job_documents').select('id,job_id,job_no,file_path,file_name,file_hash,created_at,uploaded_by');
        if (r.error) { console.error('Documents index error:', r.error.message); return; }
        docsByJob = {};
        (r.data || []).forEach(function (d) { docsByJob[String(d.job_id)] = d; });
        if (typeof window.renderTable === 'function' && window.masterJobs) {
            var rows = (window.currentFilteredJobs && window.currentFilteredJobs.length) ? window.currentFilteredJobs : window.masterJobs;
            window.renderTable(rows);
        }
    }

    function showButton(jobId) {
        var has = !!docsByJob[String(jobId)];
        if (!has) return '<span class="inline-block p-1.5 text-surface-300 text-xs" title="No document attached"><i class="fa-regular fa-file"></i></span>';
        return '<button type="button" onclick="WathekDocs.show(\'' + esc(jobId) + '\')" class="show-job-btn px-2 py-1 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg text-[10px] font-bold transition cursor-pointer" title="Show Job document"><i class="fa-solid fa-file-pdf"></i> Show Job</button>';
    }

    // ---------- Before saving the job: duplicate checks ----------
    // Returns { ok:true } or { ok:false } (a message has already been shown)
    async function precheck(editId, lotNo) {
        var file = selectedFile();

        // Lot already used by another job? (soft warning)
        if (lotNo) {
            var q = sb().from('jobs_report').select('id,job_no,date').eq('lot_no', lotNo).or('is_deleted.is.null,is_deleted.eq.false');
            if (editId) q = q.neq('id', editId);
            var lr = await q.limit(3);
            if (!lr.error && lr.data && lr.data.length) {
                var o = lr.data[0];
                if (!window.confirm('Lot ' + lotNo + ' is already used by job "' + (o.job_no || '-') + '" (' + o.date + ').\n\nSave anyway?')) return { ok: false };
            }
        }

        if (!file) return { ok: true };

        if (file.size > MAX_BYTES) { setDocStatus('File is larger than 15 MB.', true); alert('The PDF is larger than 15 MB.'); return { ok: false }; }
        if (!(await looksLikePdf(file))) { setDocStatus('This is not a valid PDF file.', true); alert('This is not a valid PDF file.'); return { ok: false }; }

        if (editId && docsByJob[String(editId)] && role() !== 'Admin') {
            alert('This job already has a document. Ask the Admin to remove it before attaching another one.');
            return { ok: false };
        }
        if (editId && docsByJob[String(editId)] && role() === 'Admin') {
            alert('This job already has a document. Open "Show Job" and use "Remove document" first, then attach the new file.');
            return { ok: false };
        }

        var hash = await sha256Hex(file);
        var dr = await sb().from('job_documents').select('job_id,job_no,file_name,created_at').eq('file_hash', hash).limit(1);
        if (dr.error) { alert('Could not check for duplicates: ' + dr.error.message); return { ok: false }; }
        if (dr.data && dr.data.length) {
            var d = dr.data[0];
            var msg = 'This exact file is already attached to job "' + (d.job_no || ('#' + d.job_id)) + '". Duplicate files are not allowed.';
            setDocStatus(msg, true);
            alert(msg);
            return { ok: false };
        }
        window.__wathekPendingHash = hash;
        return { ok: true };
    }

    // ---------- Upload one file for one job (shared by the job form and the bulk page) ----------
    async function uploadDoc(jobId, jobNo, file, hash) {
        var path = String(jobId) + '/' + hash.slice(0, 24) + '.pdf';
        var up = await sb().storage.from(BUCKET).upload(path, file, { contentType: 'application/pdf', upsert: false });
        if (up.error) return { ok: false, message: up.error.message };

        var ins = await sb().from('job_documents').insert([{
            job_id: jobId, job_no: jobNo || null, file_path: path, file_name: file.name,
            file_size: file.size, file_hash: hash, uploaded_by: userEmail()
        }]);
        if (ins.error) {
            await sb().storage.from(BUCKET).remove([path]); // do not leave an orphan file
            var dup = /duplicate|unique/i.test(ins.error.message);
            return { ok: false, message: dup ? 'this file (or this job) already has a document' : ins.error.message };
        }
        return { ok: true };
    }

    // ---------- After the job is saved: upload ----------
    async function attach(jobId, jobNo) {
        var file = selectedFile();
        if (!file || !jobId) return { ok: true, skipped: true };
        var hash = window.__wathekPendingHash || await sha256Hex(file);
        window.__wathekPendingHash = null;
        var r = await uploadDoc(jobId, jobNo, file, hash);
        if (!r.ok) { alert('Job saved, but the document was not attached: ' + r.message); return { ok: false }; }
        await loadIndex();
        return { ok: true };
    }

    // ---------- Bulk attach (old documents) ----------
    // The scan date in the file name (YYYY-MM-DD_HH-MM) suggests the job; you confirm every match before anything is uploaded.
    function dateParts(s) {
        var m = String(s || '').trim().split(' ')[0].split('/');
        return m.length === 3 ? { m: +m[0], d: +m[1], y: +m[2] } : null;
    }
    function nameDate(fileName) {
        var m = /(\d{4})-(\d{2})-(\d{2})/.exec(fileName);
        return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
    }
    function sameDay(a, b) { return a && b && a.y === b.y && a.m === b.m && a.d === b.d; }
    function jobLabel(j) {
        return (j.jobNo || j.job_no || '-') + '  |  ' + (j.route || '') + '  |  ' + (j.total_amount || j.total || '') + '  |  ' + String(j.date || '').split(' ')[0];
    }

    function isDelivery(j) { return /^\s*delivery/i.test(String(j.jobNo || j.job_no || '')); }

    var bulkRows = [];

    function closeBulk() { var m = document.getElementById('wd-bulk'); if (m) m.remove(); bulkRows = []; }

    function openBulk() {
        if (role() !== 'Admin' && role() !== 'Member') { alert('You do not have permission to attach documents.'); return; }
        closeBulk();
        var wrap = document.createElement('div');
        wrap.id = 'wd-bulk';
        wrap.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.65);display:flex;align-items:center;justify-content:center;padding:12px';
        wrap.innerHTML =
            '<div style="background:#fff;border-radius:16px;width:100%;max-width:1000px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.35)">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #e2e8f0"><strong style="font-size:15px">Attach documents to jobs</strong><button id="wd-bulk-x" type="button" style="font-size:22px;background:none;border:0;cursor:pointer;color:#475569">&times;</button></div>' +
            '<div style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#475569">Choose PDF files (one file per job). The scan date in each file name suggests jobs from the 3 days before it; check every match, then press Attach. Duplicate files and jobs that already have a document are skipped.' +
            '<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;align-items:center"><input id="wd-bulk-files" type="file" accept="application/pdf,.pdf" multiple>' +
            '<button id="wd-bulk-ai" type="button" disabled style="background:#1e293b;color:#fff;border:0;border-radius:10px;padding:7px 14px;font-weight:700;font-size:12px;cursor:pointer;opacity:.5">Read docs</button></div>' +
            '<div style="margin-top:4px;font-size:11px;color:#94a3b8">AI reading sends each selected PDF to the Claude service to read only the order number, lot and tape color. It costs a small amount per file. Check every match before pressing Attach.</div></div>' +
            '<div id="wd-bulk-list" style="padding:8px 16px;overflow:auto;flex:1;font-size:12px"></div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 16px;border-top:1px solid #e2e8f0"><span id="wd-bulk-msg" style="font-size:12px;color:#64748b"></span>' +
            '<button id="wd-bulk-go" type="button" disabled style="background:#0f766e;color:#fff;border:0;border-radius:10px;padding:9px 18px;font-weight:700;font-size:13px;cursor:pointer;opacity:.5">Attach</button></div></div>';
        document.body.appendChild(wrap);
        document.getElementById('wd-bulk-x').addEventListener('click', closeBulk);
        document.getElementById('wd-bulk-files').addEventListener('change', onBulkFiles);
        document.getElementById('wd-bulk-go').addEventListener('click', runBulk);
        document.getElementById('wd-bulk-ai').addEventListener('click', readAllAI);
        document.getElementById('wd-bulk-list').addEventListener('click', function (e) {
            var t = e.target.closest ? e.target.closest('button[data-accept],button[data-decline]') : null;
            if (!t) return;
            if (t.hasAttribute('data-accept')) acceptNew(+t.getAttribute('data-accept'));
            else declineNew(+t.getAttribute('data-decline'));
        });
    }

    function bulkMsg(t, err) { var e = document.getElementById('wd-bulk-msg'); if (e) { e.textContent = t || ''; e.style.color = err ? '#b91c1c' : '#64748b'; } }

    async function onBulkFiles(ev) {
        var files = Array.prototype.slice.call(ev.target.files || []);
        bulkRows = [];
        var seenHash = {};
        var jobs = (window.masterJobs || []).filter(function (j) { return !isDelivery(j); });
        bulkMsg('Checking ' + files.length + ' file(s)...');
        for (var i = 0; i < files.length; i++) {
            var f = files[i], row = { file: f, hash: null, problem: null, jobId: '' };
            try {
                if (f.size > MAX_BYTES) row.problem = 'Larger than 15 MB';
                else if (!(await looksLikePdf(f))) row.problem = 'Not a valid PDF';
                else {
                    row.hash = await sha256Hex(f);
                    if (seenHash[row.hash]) row.problem = 'Same file chosen twice';
                    seenHash[row.hash] = true;
                }
            } catch (e) { row.problem = 'Could not read the file'; }
            bulkRows.push(row);
        }
        // already attached (same content)?
        var hashes = bulkRows.filter(function (r) { return r.hash && !r.problem; }).map(function (r) { return r.hash; });
        if (hashes.length) {
            var q = await sb().from('job_documents').select('file_hash,job_no').in('file_hash', hashes);
            if (!q.error) (q.data || []).forEach(function (d) {
                bulkRows.forEach(function (r) { if (r.hash === d.file_hash && !r.problem) r.problem = 'Already attached to job ' + (d.job_no || '-'); });
            });
        }
        // suggest the job from the scan date
        bulkRows.forEach(function (r) {
            if (r.problem) return;
            var nd = nameDate(r.file.name);
            var cands = nd ? jobs.filter(function (j) {
                var p = dateParts(j.date);
                if (!p || docsByJob[String(j.id)]) return false;
                var diff = (Date.UTC(nd.y, nd.m - 1, nd.d) - Date.UTC(p.y, p.m - 1, p.d)) / 86400000;
                return diff >= 0 && diff <= 3; // scanned on, or up to 3 days after, the job date
            }) : [];
            r.cands = cands;
            if (cands.length === 1) r.jobId = String(cands[0].id);
        });
        renderBulk();
        var aib = document.getElementById('wd-bulk-ai');
        if (aib) { var any = bulkRows.some(function (r) { return !r.problem; }); aib.disabled = !any; aib.style.opacity = any ? '1' : '.5'; }
    }

    function renderBulk() {
        var box = document.getElementById('wd-bulk-list');
        if (!box) return;
        var jobs = (window.masterJobs || []).filter(function (j) { return !isDelivery(j) && !docsByJob[String(j.id)]; });
        var html = '<table style="width:100%;border-collapse:collapse"><thead><tr style="text-align:left;color:#64748b;font-size:11px"><th style="padding:6px">File</th><th style="padding:6px">Job</th><th style="padding:6px">Status</th></tr></thead><tbody>';
        bulkRows.forEach(function (r, i) {
            html += '<tr style="border-top:1px solid #f1f5f9"><td style="padding:6px;word-break:break-all">' + esc(r.file.name) + (r.problem ? '' : ' <a href="#" class="wd-bulk-view" data-i="' + i + '" style="color:#0f766e;font-weight:700">View</a>') + '</td><td style="padding:6px">';
            if (r.problem) html += '<span style="color:#94a3b8">-</span>';
            else {
                var list = (r.cands && r.cands.length ? r.cands : jobs);
                html += '<select data-i="' + i + '" class="wd-bulk-sel" style="max-width:420px;width:100%;padding:5px;border:1px solid #cbd5e1;border-radius:8px"><option value="">' + (r.cands && r.cands.length > 1 ? 'Choose the job (' + r.cands.length + ' in the last 3 days)...' : (r.cands && r.cands.length ? '' : 'No job in the last 3 days - choose...')) + '</option>';
                list.forEach(function (j) { html += '<option value="' + esc(j.id) + '"' + (String(j.id) === r.jobId ? ' selected' : '') + '>' + esc(jobLabel(j)) + '</option>'; });
                html += '</select><input class="wd-bulk-no" data-i="' + i + '" placeholder="or type Job No" style="margin-top:4px;width:100%;max-width:420px;padding:5px;border:1px solid #cbd5e1;border-radius:8px">';
            }
            html += '</td><td style="padding:6px;white-space:nowrap" id="wd-st-' + i + '">' + (r.problem ? '<span style="color:#b91c1c">' + esc(r.problem) + '</span>' : (r.jobId ? '<span style="color:#0f766e">Ready</span>' : '<span style="color:#b45309">Choose a job</span>')) + '</td></tr>';
        });
        html += '</tbody></table>';
        box.innerHTML = bulkRows.length ? html : '';
        box.querySelectorAll('.wd-bulk-sel').forEach(function (s) {
            s.addEventListener('change', function () { bulkRows[+s.getAttribute('data-i')].jobId = s.value; refreshBulkState(); });
        });
        box.querySelectorAll('.wd-bulk-view').forEach(function (v) {
            v.addEventListener('click', function (e) { e.preventDefault(); window.open(URL.createObjectURL(bulkRows[+v.getAttribute('data-i')].file), '_blank'); });
        });
        box.querySelectorAll('.wd-bulk-no').forEach(function (inp) {
            inp.addEventListener('change', function () {
                var i = +inp.getAttribute('data-i'), want = inp.value.trim().toLowerCase();
                if (!want) return;
                var hit = (window.masterJobs || []).filter(function (j) { return String(j.jobNo || j.job_no || '').trim().toLowerCase() === want; });
                var st = document.getElementById('wd-st-' + i);
                if (hit.length === 1 && isDelivery(hit[0])) { bulkRows[i].jobId = ''; if (st) st.innerHTML = '<span style="color:#b91c1c">Delivery jobs do not take documents</span>'; return; }
                if (hit.length === 1 && !docsByJob[String(hit[0].id)]) {
                    bulkRows[i].jobId = String(hit[0].id);
                    var sel = box.querySelector('.wd-bulk-sel[data-i="' + i + '"]');
                    if (sel) { if (!sel.querySelector('option[value="' + hit[0].id + '"]')) { var o = document.createElement('option'); o.value = hit[0].id; o.textContent = jobLabel(hit[0]); sel.appendChild(o); } sel.value = String(hit[0].id); }
                    refreshBulkState();
                } else if (st) {
                    bulkRows[i].jobId = '';
                    st.innerHTML = '<span style="color:#b91c1c">' + (hit.length > 1 ? 'Several jobs have this number - use the list' : (hit.length ? 'This job already has a document' : 'No job with this number')) + '</span>';
                    refreshBulkState();
                }
            });
        });
        refreshBulkState();
    }


    // ---------- AI reading of order number / lot / color (optional, per click) ----------
    function money(s) { var n = parseFloat(String(s == null ? '' : s).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : null; }
    function normNo(s) { return String(s || '').replace(/\s+/g, '').toUpperCase(); }
    function fileToBase64(file) {
        return new Promise(function (resolve, reject) {
            var fr = new FileReader();
            fr.onload = function () { resolve(String(fr.result).split(',')[1] || ''); };
            fr.onerror = function () { reject(new Error('read failed')); };
            fr.readAsDataURL(file);
        });
    }
    function clearSel(i) {
        if (bulkRows[i]) bulkRows[i].jobId = '';
        var sel = document.querySelector('#wd-bulk-list .wd-bulk-sel[data-i="' + i + '"]');
        if (sel) sel.value = '';
    }
    function setSel(i, jobId) {
        var sel = document.querySelector('#wd-bulk-list .wd-bulk-sel[data-i="' + i + '"]');
        if (!sel) return;
        if (!sel.querySelector('option[value="' + jobId + '"]')) {
            var j = (window.masterJobs || []).find(function (x) { return String(x.id) === String(jobId); });
            var o = document.createElement('option'); o.value = jobId; o.textContent = j ? jobLabel(j) : String(jobId); sel.appendChild(o);
        }
        sel.value = String(jobId);
    }
    // ---------- New order (no job in the system yet): Accept creates it, Decline only records the number ----------
    function slashDate(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return m ? (+m[2]) + '/' + (+m[3]) + '/' + m[1] : ''; }
    function newJobPayload(r) {
        var a = r.ai, date = slashDate(a.pickup), from = String(a.origin || '').toUpperCase(), to = String(a.dest || '').toUpperCase();
        var missing = [];
        if (!a.order) missing.push('order number');
        if (!date) missing.push('pick up date');
        if (!/^[A-Z]{2}$/.test(from) || !/^[A-Z]{2}$/.test(to)) missing.push('route');
        if (a.total === null || a.deposit === null) missing.push('amounts');
        if (missing.length) return { missing: missing };
        var amount = Math.round(a.total - a.deposit);
        var okColor = ['orange', 'yellow', 'green', 'blue', 'red', 'pink', 'purple', 'white'].indexOf(String(a.color).toLowerCase()) >= 0;
        var p = {
            date: date, job_no: String(a.order).trim(), route: from + ' \u2192 ' + to, foreman_name: '', foreman_cost: amount > 0 ? String(Math.round(amount * 0.1)) : '0',
            total_amount: '$' + amount, helpers_cost: '-', drivers_cost: '-', pu_payments: '-', destination_payments: '-', diesel_expense: '-', hotel_expense: '-', storage: '-'
        };
        if (a.lot && a.lotConf !== 'low') { p.lot_no = String(a.lot).toUpperCase(); p.tape_color = okColor ? String(a.color).toLowerCase() : null; }
        return { payload: p };
    }
    function newOrderHtml(i, r) {
        var np = newJobPayload(r);
        var h = '<span style="color:#b45309;font-weight:700">New order: no job ' + esc(r.ai.order) + ' in the system.</span>';
        if (r.ai.conf === 'low') return h + '<br><span style="color:#b45309">Low confidence on the number - check it with View.</span>';
        if (np.missing) return h + '<br><span style="color:#b45309">Cannot create it automatically (missing: ' + esc(np.missing.join(', ')) + '). Add the job manually.</span>' +
            ' <button type="button" data-decline="' + i + '" class="wd-btn" style="border:1px solid #cbd5e1;border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer">Decline</button>';
        var p = np.payload;
        return h + '<div style="margin-top:3px;font-size:11px;color:#334155">Will create: ' + esc(p.job_no) + ' &middot; ' + esc(p.date) + ' &middot; ' + esc(p.route) + ' &middot; ' + esc(p.total_amount) +
            (p.lot_no ? ' &middot; Lot ' + esc(p.lot_no) : '') + '<br>Other fields (costs, payments, diesel, hotel) stay empty - complete them from Edit.</div>' +
            '<div style="margin-top:4px;display:flex;gap:6px"><button type="button" data-accept="' + i + '" style="background:#0f766e;color:#fff;border:0;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;cursor:pointer">Accept</button>' +
            '<button type="button" data-decline="' + i + '" style="border:1px solid #cbd5e1;border-radius:6px;padding:3px 10px;font-size:11px;cursor:pointer">Decline</button></div>';
    }
    function setRowNote(i, html) { var r = bulkRows[i]; if (!r) return; r.aiNote = html; refreshBulkState(); }
    async function acceptNew(i) {
        var r = bulkRows[i]; if (!r || !r.ai || r.done) return;
        var np = newJobPayload(r); if (!np.payload) return;
        var p = np.payload;
        if (!window.confirm('Create job ' + p.job_no + '?\n\nDate: ' + p.date + '\nRoute: ' + p.route + '\nAmount: ' + p.total_amount + (p.lot_no ? '\nLot: ' + p.lot_no : '') + '\n\nThe document will be attached to it.')) return;
        setRowNote(i, 'Creating job...');
        if (p.lot_no) { // a lot code already used by another job is not copied
            var lr = await sb().from('jobs_report').select('id').eq('lot_no', p.lot_no).or('is_deleted.is.null,is_deleted.eq.false').limit(1);
            if (!lr.error && lr.data && lr.data.length) { delete p.lot_no; delete p.tape_color; }
        }
        var ins = await sb().from('jobs_report').insert([p]).select('id');
        if (ins.error || !ins.data || !ins.data[0]) {
            var dup = ins.error && /duplicate|unique/i.test(ins.error.message);
            setRowNote(i, '<span style="color:#b91c1c">' + (dup ? 'A job with this number already exists.' : 'Could not create the job: ' + esc(ins.error ? ins.error.message : 'unknown error')) + '</span>');
            return;
        }
        var newId = ins.data[0].id;
        var up = await uploadDoc(newId, p.job_no, r.file, r.hash);
        if (typeof window.initMasterJobsData === 'function') { try { await window.initMasterJobsData(); } catch (e) {} }
        await loadIndex();
        if (r.ai) {
            await sb().from('job_document_review').upsert({
                job_id: newId, order_read: r.ai.order || null, order_conf: r.ai.conf, lot_read: r.ai.lot || null, color_read: r.ai.color || null, lot_conf: r.ai.lotConf,
                total_read: r.ai.total, deposit_read: r.ai.deposit, balance_read: r.ai.balance, warnings: r.ai.warnings || [], read_at: new Date().toISOString(), read_by: userEmail()
            }, { onConflict: 'job_id' });
        }
        r.done = true; r.jobId = String(newId);
        setRowNote(i, up.ok ? '<span style="color:#0f766e;font-weight:700">Job created and document attached</span>' : '<span style="color:#b91c1c">Job created, but the document was not attached: ' + esc(up.message) + '</span>');
        var st = document.getElementById('wd-st-' + i); if (st) st.innerHTML = r.aiNote;
    }
    async function declineNew(i) {
        var r = bulkRows[i]; if (!r || !r.ai || r.done) return;
        var key = normNo(r.ai.order);
        if (!key) { setRowNote(i, 'Declined (no readable order number to record).'); r.done = true; return; }
        var res = await sb().from('orders_not_created').upsert({ order_no: key, order_raw: r.ai.order, file_name: r.file.name, declined_by: userEmail() }, { onConflict: 'order_no', ignoreDuplicates: true });
        r.done = true; r.jobId = '';
        var html = res.error ? '<span style="color:#b91c1c">Could not record the decline: ' + esc(res.error.message) + '</span>' : '<span style="color:#475569;font-weight:700">Declined. Only the order number is recorded (Document Review).</span>';
        setRowNote(i, html);
        var st = document.getElementById('wd-st-' + i); if (st) st.innerHTML = html;
    }

    async function readOneAI(i) {
        var r = bulkRows[i], st = document.getElementById('wd-st-' + i);
        if (!r || r.problem || r.done) return;
        if (r.file.size > 10 * 1024 * 1024) { r.aiNote = '<span style="color:#b45309">Too large for AI reading - choose manually</span>'; refreshBulkState(); return; }
        if (st) st.textContent = 'Reading...';
        try {
            var b64 = await fileToBase64(r.file);
            var res = await sb().functions.invoke('extract-job', { body: { pdf_base64: b64 } });
            if (res.error || !res.data || !res.data.fields) {
                var msg = 'Could not read';
                try { if (res.error && res.error.context && res.error.context.json) { var j = await res.error.context.json(); if (j && j.error) msg = j.error; } } catch (e) {}
                r.aiNote = '<span style="color:#b91c1c">' + esc(msg) + '</span>'; refreshBulkState();
                return;
            }
            var f = res.data.fields, ord = f.order_no || {}, lot = f.lot_no || {}, col = f.tape_color || {};
            var amt = function (k) { return f[k] && typeof f[k].value === 'number' ? f[k].value : null; };
            r.ai = { order: ord.value || '', conf: ord.confidence || 'low', lot: lot.value || '', lotConf: lot.confidence || 'low', color: col.value || '',
                     total: amt('total_amount'), deposit: amt('prepaid_deposit'), balance: amt('balance_due_at_destination'),
                     pickup: (f.pickup_date && f.pickup_date.value) || '', origin: (f.origin_state && f.origin_state.value) || '', dest: (f.destination_state && f.destination_state.value) || '',
                     warnings: (res.data.warnings || []).filter(function (w) { return !/^Total \(/.test(w); }) };
            var want = normNo(r.ai.order), note = 'Read: ' + esc(r.ai.order || '-') + (r.ai.lot ? ' · Lot ' + esc(r.ai.lot) + (r.ai.color ? ' ' + esc(r.ai.color) : '') : '');
            var hit = want ? (window.masterJobs || []).filter(function (j) { return !isDelivery(j) && normNo(j.jobNo || j.job_no) === want; }) : [];
            var detail;
            if (!want) detail = '<span style="color:#b45309">Order number not readable</span>';
            else if (hit.length === 0) { r.newOrder = true; clearSel(i); detail = newOrderHtml(i, r); }
            else if (hit.length > 1) { clearSel(i); detail = '<span style="color:#b45309">Several jobs have this number - use the list</span>'; }
            else if (docsByJob[String(hit[0].id)]) { clearSel(i); detail = '<span style="color:#b91c1c">Job already has a document</span>'; }
            else if (r.ai.conf === 'low') { clearSel(i); detail = '<span style="color:#b45309">Low confidence - check the number, then choose the job</span>'; }
            else { r.jobId = String(hit[0].id); setSel(i, hit[0].id); detail = ''; }
            if (hit.length === 1 && r.ai.total !== null && r.ai.deposit !== null) {
                var sys = money(hit[0].total_amount || hit[0].total), exp = r.ai.total - r.ai.deposit;
                if (sys !== null && Math.abs(sys - exp) > 2) r.ai.warnings.push('System amount ' + sys + ' differs from the document (total - deposit = ' + exp + ').');
            }
            r.aiNote = note + (detail ? '<br>' + detail : '') + (r.ai.warnings.length ? '<br><span style="color:#b45309">' + esc(r.ai.warnings[0]) + '</span>' : '');
            refreshBulkState();
        } catch (e) {
            r.aiNote = '<span style="color:#b91c1c">Could not read</span>'; refreshBulkState();
        }
    }
    async function readAllAI() {
        var btn = document.getElementById('wd-bulk-ai');
        if (btn) { btn.disabled = true; btn.style.opacity = '.5'; }
        var idx = [];
        bulkRows.forEach(function (r, i) { if (!r.problem && !r.done && !r.ai) idx.push(i); });
        var n = 0;
        async function worker() { while (n < idx.length) { var k = idx[n++]; await readOneAI(k); } }
        await Promise.all([worker(), worker()]);
        refreshBulkState(true);
        bulkMsg('AI reading finished. Check every row before pressing Attach.');
    }

    function refreshBulkState(keepNotes) {
        // a job can take one document only
        var used = {}, dupJob = {};
        bulkRows.forEach(function (r, i) { if (!r.problem && r.jobId) { if (used[r.jobId] !== undefined) dupJob[i] = dupJob[used[r.jobId]] = true; else used[r.jobId] = i; } });
        var ready = 0;
        bulkRows.forEach(function (r, i) {
            var st = document.getElementById('wd-st-' + i);
            if (!st || r.problem || r.done) return;
            var note = r.aiNote ? '<div style="font-size:11px;color:#475569;margin-top:2px">' + r.aiNote + '</div>' : '';
            if (!r.jobId) st.innerHTML = '<span style="color:#b45309">Choose a job</span>' + note;
            else if (dupJob[i]) st.innerHTML = '<span style="color:#b91c1c">Two files for one job</span>' + note;
            else { st.innerHTML = '<span style="color:#0f766e">Ready</span>' + note; ready++; }
        });
        var go = document.getElementById('wd-bulk-go');
        if (go) { go.disabled = !ready; go.style.opacity = ready ? '1' : '.5'; go.textContent = ready ? 'Attach ' + ready + ' document' + (ready > 1 ? 's' : '') : 'Attach'; }
        bulkMsg(bulkRows.length ? bulkRows.length + ' file(s) chosen, ' + ready + ' ready' : '');
    }

    async function runBulk() {
        var go = document.getElementById('wd-bulk-go');
        if (go) { go.disabled = true; go.style.opacity = '.5'; }
        var jobs = window.masterJobs || [], used = {}, ok = 0, failed = 0;
        for (var i = 0; i < bulkRows.length; i++) {
            var r = bulkRows[i], st = document.getElementById('wd-st-' + i);
            if (r.problem || !r.jobId || r.done) continue;
            if (used[r.jobId]) { if (st) st.innerHTML = '<span style="color:#b91c1c">Two files for one job - skipped</span>'; continue; }
            used[r.jobId] = true;
            if (st) st.textContent = 'Uploading...';
            var job = jobs.find(function (j) { return String(j.id) === String(r.jobId); }) || {};
            var res = await uploadDoc(r.jobId, job.jobNo || job.job_no, r.file, r.hash);
            r.done = true;
            if (res.ok) {
                ok++;
                var extra = '';
                if (r.ai && r.ai.lot && r.ai.lotConf !== 'low' && !job.lot_no) {
                    var color = ['orange','yellow','green','blue','red','pink','purple','white'].indexOf(String(r.ai.color).toLowerCase()) >= 0 ? String(r.ai.color).toLowerCase() : null;
                    var up = await sb().from('jobs_report').update({ lot_no: String(r.ai.lot).toUpperCase(), tape_color: color }).eq('id', r.jobId);
                    if (!up.error) { job.lot_no = String(r.ai.lot).toUpperCase(); job.tape_color = color; extra = ' + Lot ' + esc(job.lot_no); }
                }
                if (r.ai) {
                    await sb().from('job_document_review').upsert({
                        job_id: r.jobId, order_read: r.ai.order || null, order_conf: r.ai.conf, lot_read: r.ai.lot || null, color_read: r.ai.color || null, lot_conf: r.ai.lotConf,
                        total_read: r.ai.total, deposit_read: r.ai.deposit, balance_read: r.ai.balance, warnings: r.ai.warnings || [],
                        read_at: new Date().toISOString(), read_by: userEmail()
                    }, { onConflict: 'job_id' });
                }
                if (st) st.innerHTML = '<span style="color:#0f766e;font-weight:700">Attached' + extra + '</span>';
            }
            else { failed++; if (st) st.innerHTML = '<span style="color:#b91c1c">Failed: ' + esc(res.message) + '</span>'; }
        }
        await loadIndex();
        if (go) { go.textContent = 'Attach'; }
        bulkMsg('Done: ' + ok + ' attached' + (failed ? ', ' + failed + ' failed' : '') + '.', failed > 0);
    }

    // ---------- Show Job viewer ----------
    function closeViewer() {
        var m = document.getElementById('wd-viewer');
        if (m) m.remove();
        if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }
    }

    async function show(jobId) {
        var d = docsByJob[String(jobId)];
        if (!d) { alert('No document attached to this job.'); return; }
        closeViewer();

        var dl = await sb().storage.from(BUCKET).download(d.file_path);
        if (dl.error || !dl.data) { alert('Could not open the document: ' + (dl.error ? dl.error.message : 'unknown error')); return; }
        currentBlobUrl = URL.createObjectURL(new Blob([dl.data], { type: 'application/pdf' }));

        var job = (window.masterJobs || []).find(function (j) { return String(j.id) === String(jobId); }) || {};
        var wrap = document.createElement('div');
        wrap.id = 'wd-viewer';
        wrap.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.65);display:flex;align-items:center;justify-content:center;padding:12px';
        wrap.innerHTML =
            '<div style="background:#fff;border-radius:16px;width:100%;max-width:980px;height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.35)">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-bottom:1px solid #e2e8f0;flex-wrap:wrap">' +
            '<div style="display:flex;align-items:center;gap:10px;min-width:0"><strong style="font-size:14px">Job ' + esc(job.jobNo || job.job_no || d.job_no || '-') + '</strong>' +
            lotBadge(job.lot_no, job.tape_color) +
            '<span style="font-size:11px;color:#64748b">' + esc(job.date || '') + '</span></div>' +
            '<div style="display:flex;gap:8px;align-items:center">' +
            '<a id="wd-open" href="' + currentBlobUrl + '" target="_blank" rel="noopener" style="font-size:12px;color:#0f766e;font-weight:600;text-decoration:none">Open in new tab</a>' +
            (role() === 'Admin' ? '<button id="wd-remove" type="button" style="font-size:12px;color:#b91c1c;font-weight:600;background:none;border:0;cursor:pointer">Remove document</button>' : '') +
            '<button id="wd-close" type="button" style="font-size:20px;line-height:1;background:none;border:0;cursor:pointer;color:#475569" aria-label="Close">&times;</button></div></div>' +
            '<iframe title="Job document" src="' + currentBlobUrl + '" style="flex:1;border:0;width:100%"></iframe>' +
            '<div style="padding:6px 14px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0">Private document - opened for you only, no shareable link is created.</div>' +
            '</div>';
        document.body.appendChild(wrap);
        document.getElementById('wd-close').addEventListener('click', closeViewer);
        wrap.addEventListener('click', function (e) { if (e.target === wrap) closeViewer(); });
        document.addEventListener('keydown', function esc1(e) { if (e.key === 'Escape') { closeViewer(); document.removeEventListener('keydown', esc1); } });
        var rm = document.getElementById('wd-remove');
        if (rm) rm.addEventListener('click', function () { removeDoc(jobId); });
    }

    async function removeDoc(jobId) {
        var d = docsByJob[String(jobId)];
        if (!d || role() !== 'Admin') return;
        if (!window.confirm('Remove this document permanently from the job?')) return;
        var r1 = await sb().storage.from(BUCKET).remove([d.file_path]);
        if (r1.error) { alert('Could not remove the file: ' + r1.error.message); return; }
        var r2 = await sb().from('job_documents').delete().eq('id', d.id);
        if (r2.error) { alert('File removed, but the record could not be deleted: ' + r2.error.message); }
        closeViewer();
        await loadIndex();
    }

    window.WathekDocs = {
        loadIndex: loadIndex, precheck: precheck, attach: attach, show: show, remove: removeDoc,
        showButton: showButton, openBulk: openBulk, lotBadge: lotBadge, lotValues: lotValues,
        getBlob: async function (jobId) {
            var x = docsByJob[String(jobId)];
            if (!x) return null;
            var dl = await sb().storage.from(BUCKET).download(x.file_path);
            return dl.error ? null : dl.data;
        },
        fillForm: fillForm, resetForm: resetForm, hasDoc: function (id) { return !!docsByJob[String(id)]; }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildLotControls);
    else buildLotControls();
})();
