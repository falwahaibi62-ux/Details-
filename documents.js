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

    // ---------- After the job is saved: upload ----------
    async function attach(jobId, jobNo) {
        var file = selectedFile();
        if (!file || !jobId) return { ok: true, skipped: true };
        var hash = window.__wathekPendingHash || await sha256Hex(file);
        window.__wathekPendingHash = null;
        var path = String(jobId) + '/' + hash.slice(0, 24) + '.pdf';

        var up = await sb().storage.from(BUCKET).upload(path, file, { contentType: 'application/pdf', upsert: false });
        if (up.error) { alert('Job saved, but the document upload failed: ' + up.error.message); return { ok: false }; }

        var ins = await sb().from('job_documents').insert([{
            job_id: jobId, job_no: jobNo || null, file_path: path, file_name: file.name,
            file_size: file.size, file_hash: hash, uploaded_by: userEmail()
        }]);
        if (ins.error) {
            await sb().storage.from(BUCKET).remove([path]); // do not leave an orphan file
            var dup = /duplicate|unique/i.test(ins.error.message);
            alert('Job saved, but the document was not attached: ' + (dup ? 'this file (or this job) already has a document.' : ins.error.message));
            return { ok: false };
        }
        await loadIndex();
        return { ok: true };
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
        showButton: showButton, lotBadge: lotBadge, lotValues: lotValues,
        fillForm: fillForm, resetForm: resetForm, hasDoc: function (id) { return !!docsByJob[String(id)]; }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildLotControls);
    else buildLotControls();
})();
