/* Wathek - Document Review (Admin only). Display only: it never changes job records.
   Shows what the AI read from each attached PDF next to what is in the system, and lets the Admin tick "Reviewed". */
(function () {
    'use strict';
    function sb() { return window.supabaseClient; }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function money(s) { var n = parseFloat(String(s == null ? '' : s).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : null; }
    function norm(s) { return String(s || '').replace(/\s+/g, '').toUpperCase(); }
    function fmt(n) { return n === null || n === undefined ? '-' : '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }); }

    var rows = [];      // built table rows
    var declined = [];
    var onlyCheck = true;   // by default only documents that have notes are listed
    var onlyUnread = false;

    function flagsFor(job, rv) {
        var f = [];
        if (!rv) return (job && window.WathekDocs && !window.WathekDocs.isPdf(job.id)) ? [] : ['Not read by AI']; // only PDFs are read by AI
        if (rv.order_read && norm(rv.order_read) !== norm(job.jobNo || job.job_no)) f.push('Order number differs from Job No');
        if (!rv.order_read) f.push('Order number not read');
        if (rv.order_conf === 'low') f.push('Low confidence on order number');
        if (rv.lot_read && job.lot_no && norm(rv.lot_read) !== norm(job.lot_no)) f.push('Lot differs from the system');
        if (rv.lot_read && !job.lot_no) f.push('Lot read but not saved in the system');
        if (rv.total_read != null && rv.deposit_read != null) {
            var sys = money(job.total_amount || job.total), exp = Number(rv.total_read) - Number(rv.deposit_read);
            if (sys !== null && Math.abs(sys - exp) > 2) f.push('Amount differs (system ' + sys + ' vs document ' + exp + ')');
        }
        (rv.warnings || []).forEach(function (w) { if (f.indexOf(w) < 0) f.push(w); });
        return f;
    }

    async function load() {
        var box = document.getElementById('reviewBody'); if (!box) return;
        box.innerHTML = '<tr><td colspan="9" class="p-4 text-center text-surface-500 text-xs">Loading...</td></tr>';
        var jobs = window.masterJobs || [];
        var q = await sb().from('job_document_review').select('*');
        if (q.error) { box.innerHTML = '<tr><td colspan="9" class="p-4 text-center text-danger-600 text-xs">Could not load: ' + esc(q.error.message) + '</td></tr>'; return; }
        var byJob = {}; (q.data || []).forEach(function (r) { byJob[String(r.job_id)] = r; });
        rows = [];
        jobs.forEach(function (j) {
            var has = window.WathekDocs && window.WathekDocs.hasDoc(j.id), rv = byJob[String(j.id)];
            if (!has && !rv) return;
            rows.push({ job: j, rv: rv || null, has: !!has, flags: flagsFor(j, rv) });
        });
        var dq = await sb().from('orders_not_created').select('*').order('declined_at', { ascending: false });
        declined = dq.error ? [] : (dq.data || []);
        rows.sort(function (a, b) { return (a.flags.length ? 0 : 1) - (b.flags.length ? 0 : 1); });
        draw();
    }

    function drawDeclined() {
        var box = document.getElementById('declinedBody'); if (!box) return;
        var jobs = window.masterJobs || [];
        var c = document.getElementById('declinedCount'); if (c) c.textContent = declined.length + ' order number(s)';
        if (!declined.length) { box.innerHTML = '<tr><td colspan="6" class="p-5 text-center text-surface-500 text-xs">No declined orders.</td></tr>'; return; }
        box.innerHTML = declined.map(function (d) {
            var inSys = jobs.some(function (j) { return norm(j.jobNo || j.job_no) === d.order_no; });
            return '<tr class="border-b border-surface-100"><td class="p-3 text-xs font-semibold">' + esc(d.order_raw || d.order_no) + '</td>' +
                '<td class="p-3 text-xs">' + esc(d.file_name || '-') + '</td><td class="p-3 text-xs">' + esc(d.declined_by || '-') + '</td>' +
                '<td class="p-3 text-xs whitespace-nowrap">' + esc(String(d.declined_at || '').slice(0, 10)) + '</td>' +
                '<td class="p-3 text-xs">' + (inSys ? '<span class="text-success-600 font-semibold">Now in the system</span>' : '<span class="text-surface-500">Not created</span>') + '</td>' +
                '<td class="p-3 text-xs"><a href="#" data-undo="' + esc(d.order_no) + '" class="text-danger-600 font-semibold">Remove from list</a></td></tr>';
        }).join('');
        box.querySelectorAll('[data-undo]').forEach(function (a) {
            a.addEventListener('click', async function (e) {
                e.preventDefault();
                if (!confirm('Remove this order number from the list?')) return;
                var x = await sb().from('orders_not_created').delete().eq('order_no', a.getAttribute('data-undo'));
                if (x.error) { alert('Could not remove: ' + x.error.message); return; }
                declined = declined.filter(function (z) { return z.order_no !== a.getAttribute('data-undo'); });
                drawDeclined();
            });
        });
    }

    // Save any review table as a PDF (landscape A4). Uses the html2pdf library already loaded by index.html.
    function toPdf(title, table, file) {
        if (!window.html2pdf) { alert('The PDF tool is not loaded. Check your internet connection and refresh the page.'); return; }
        var wrap = document.createElement('div');
        wrap.style.cssText = 'padding:16px;font-family:Arial,sans-serif;color:#111;background:#fff;width:1050px';
        var h = '<h2 style="margin:0 0 4px;font-size:18px">' + esc(title) + '</h2><p style="margin:0 0 12px;font-size:11px;color:#555">Wathek - ' +
            new Date().toLocaleDateString('en-US') + ' - ' + (table.length - 1) + ' row(s)</p><table style="width:100%;border-collapse:collapse;font-size:10px">';
        table.forEach(function (r, i) {
            var tag = i ? 'td' : 'th';
            h += '<tr style="page-break-inside:avoid">' + r.map(function (c) {
                return '<' + tag + ' style="border:1px solid #ccc;padding:4px 6px;text-align:left;vertical-align:top;' + (i ? '' : 'background:#eee;font-weight:bold;') + '">' + esc(c) + '</' + tag + '>';
            }).join('') + '</tr>';
        });
        wrap.innerHTML = h + '</table>';
        html2pdf().set({ margin: 8, filename: file, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }, pagebreak: { mode: ['css', 'legacy'] } }).from(wrap).save();
    }
    function today() { return new Date().toISOString().slice(0, 10); }

    function exportDeclined() {
        var tbl = [['Order / Job No', 'Document file', 'Declined by', 'Declined on']].concat(declined.map(function (d) { return [d.order_raw || d.order_no, d.file_name || '', d.declined_by || '', String(d.declined_at || '').slice(0, 10)]; }))
        toPdf('Orders declined (not created)', tbl, 'orders-not-created-' + today() + '.pdf');
    }

    var noDocQuery = '';
    function noDocList() {
        var q = norm(noDocQuery);
        return (window.masterJobs || []).filter(function (j) {
            var no = String(j.jobNo || j.job_no || '').trim();
            if (!/^[A-Za-z]{1,2}\d{5,8}$/.test(no)) return false; // real order numbers only (no cancel, delivery, storage or name entries)
            if (window.WathekDocs && window.WathekDocs.hasDoc(j.id)) return false;
            return !q || norm(no).indexOf(q) >= 0;
        });
    }
    function drawNoDoc() {
        var box = document.getElementById('noDocBody'); if (!box) return;
        var list = noDocList();
        var c = document.getElementById('noDocCount'); if (c) c.textContent = list.length + ' job(s) without a document';
        if (!list.length) { box.innerHTML = '<tr><td colspan="5" class="p-5 text-center text-surface-500 text-xs">Every job has a document.</td></tr>'; return; }
        box.innerHTML = list.map(function (j) {
            return '<tr class="border-b border-surface-100"><td class="p-3 text-xs whitespace-nowrap">' + esc(String(j.date || '').split(' ')[0]) + '</td>' +
                '<td class="p-3 text-xs font-semibold">' + esc(j.jobNo || j.job_no) + '</td><td class="p-3 text-xs">' + esc(j.route || '') + '</td>' +
                '<td class="p-3 text-xs">' + esc(j.total_amount || j.total || '') + '</td>' +
                '<td class="p-3 text-xs">' + (j.lot_no ? esc(j.lot_no) + (j.tape_color ? ' (' + esc(j.tape_color) + ')' : '') : '-') + '</td></tr>';
        }).join('');
    }
    function exportNoDoc() {
        var tbl = [['Date', 'Job No', 'Route', 'Amount', 'Lot']].concat(noDocList().map(function (j) { return [String(j.date || '').split(' ')[0], j.jobNo || j.job_no || '', j.route || '', j.total_amount || j.total || '', j.lot_no || '']; }))
        toPdf('Jobs without a document', tbl, 'jobs-without-document-' + today() + '.pdf');
    }

    function draw() {
        drawNoDoc();
        drawDeclined();
        var box = document.getElementById('reviewBody'); if (!box) return;
        var list = rows.filter(function (r) { if (onlyUnread && r.rv) return false; return !onlyCheck || (r.flags.length && !(r.rv && r.rv.reviewed)); });
        var c = document.getElementById('reviewCount');
        var need = rows.filter(function (r) { return r.flags.length && !(r.rv && r.rv.reviewed); }).length;
        if (c) c.textContent = rows.length + ' documents, ' + need + ' need checking';
        if (!list.length) { box.innerHTML = '<tr><td colspan="9" class="p-6 text-center text-surface-500 text-xs">' + (onlyCheck ? 'No documents with notes.' : 'Nothing to show.') + '</td></tr>'; return; }
        box.innerHTML = list.map(function (r, i) {
            var j = r.job, rv = r.rv, ok = !r.flags.length;
            var lotSys = j.lot_no ? esc(j.lot_no) + (j.tape_color ? ' (' + esc(j.tape_color) + ')' : '') : '-';
            var lotRead = rv && rv.lot_read ? esc(rv.lot_read) + (rv.color_read ? ' (' + esc(rv.color_read) + ')' : '') : '-';
            var exp = rv && rv.total_read != null && rv.deposit_read != null ? Number(rv.total_read) - Number(rv.deposit_read) : null;
            return '<tr class="border-b border-surface-100 ' + (ok ? '' : 'bg-warning-50/40') + '">' +
                '<td class="p-3 text-xs whitespace-nowrap">' + esc(String(j.date || '').split(' ')[0]) + '</td>' +
                '<td class="p-3 text-xs font-semibold">' + esc(j.jobNo || j.job_no || '-') + '<div class="font-normal text-surface-500">' + esc(j.route || '') + '</div></td>' +
                '<td class="p-3 text-xs">' + (r.has ? '<a href="#" data-view="' + esc(j.id) + '" class="text-primary-600 font-semibold">View</a>' : '-') + '</td>' +
                '<td class="p-3 text-xs">' + esc(rv && rv.order_read || '-') + '</td>' +
                '<td class="p-3 text-xs">' + lotSys + '<div class="text-surface-500">read: ' + lotRead + '</div></td>' +
                '<td class="p-3 text-xs">' + fmt(money(j.total_amount || j.total)) + '<div class="text-surface-500">doc: ' + fmt(exp) + '</div></td>' +
                '<td class="p-3 text-xs">' + (ok ? '<span class="text-success-600 font-semibold">OK</span>' : '<span class="text-warning-600 font-semibold">Check</span>' + r.flags.map(function (x) { return '<div class="text-surface-600">' + esc(x) + '</div>'; }).join('')) + '</td>' +
                '<td class="p-3 text-xs text-center">' + (rv ? '<input type="checkbox" data-rev="' + esc(j.id) + '" ' + (rv.reviewed ? 'checked' : '') + '>' : '') + '</td>' +
                '<td class="p-3 text-xs whitespace-nowrap">' + esc(rv && rv.read_at ? String(rv.read_at).slice(0, 10) : '') + (r.has ? '<div><a href="#" data-read="' + esc(j.id) + '" class="text-primary-600 font-semibold">' + (rv ? 'Read again' : 'Read with AI') + '</a></div>' : '') + '</td></tr>';
        }).join('');
        box.querySelectorAll('[data-view]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); window.WathekDocs.show(a.getAttribute('data-view')); }); });
        box.querySelectorAll('[data-read]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); readRow(a.getAttribute('data-read')); }); });
        box.querySelectorAll('[data-rev]').forEach(function (cb) {
            cb.addEventListener('change', async function () {
                var id = cb.getAttribute('data-rev'), on = cb.checked;
                var email = (window.currentLoggedInUser && window.currentLoggedInUser.email) || null;
                var u = await sb().from('job_document_review').update({ reviewed: on, reviewed_by: on ? email : null, reviewed_at: on ? new Date().toISOString() : null }).eq('job_id', id);
                if (u.error) { alert('Could not save: ' + u.error.message); cb.checked = !on; return; }
                var row = rows.find(function (x) { return String(x.job.id) === String(id); }); if (row && row.rv) row.rv.reviewed = on;
                draw();
            });
        });
    }

    function exportCsv() {
        var head = ['Date', 'Job No', 'Route', 'Order read', 'Lot (system)', 'Lot (read)', 'Amount (system)', 'Total (doc)', 'Deposit (doc)', 'Status', 'Notes', 'Reviewed'];
        var shown = rows.filter(function (r) { if (onlyUnread && r.rv) return false; return !onlyCheck || (r.flags.length && !(r.rv && r.rv.reviewed)); }); // same rows as on screen
        var out = [head].concat(shown.map(function (r) {
            var j = r.job, rv = r.rv || {};
            return [String(j.date || '').split(' ')[0], j.jobNo || j.job_no || '', j.route || '', rv.order_read || '', j.lot_no || '', rv.lot_read || '', money(j.total_amount || j.total) == null ? '' : money(j.total_amount || j.total),
                rv.total_read == null ? '' : rv.total_read, rv.deposit_read == null ? '' : rv.deposit_read, r.flags.length ? 'Check' : 'OK', r.flags.join(' | '), rv.reviewed ? 'Yes' : 'No'];
        }));
        toPdf('Document Review - Jobs with notes', out, 'document-review-' + today() + '.pdf');
    }

    // ---------- Read stored documents with AI (Admin) ----------
    function toB64(blob) {
        return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result).split(',')[1] || ''); }; fr.onerror = rej; fr.readAsDataURL(blob); });
    }
    async function readOne(jobId, force) {
        var j = (window.masterJobs || []).find(function (x) { return String(x.id) === String(jobId); }) || {};
        if (!window.WathekDocs.isPdf(jobId)) return 'AI reads PDF files only';
        var blob = await window.WathekDocs.getBlob(jobId);
        if (!blob) return 'Could not open the document';
        if (blob.size > 10 * 1024 * 1024) return 'Too large for AI reading (over 10 MB)';
        var res = await sb().functions.invoke('extract-job', { body: { pdf_base64: await toB64(blob), force: force === true } });
        if (res.error || !res.data || !res.data.fields) {
            var msg = 'Could not read';
            try { if (res.error && res.error.context && res.error.context.json) { var e = await res.error.context.json(); if (e && e.error) msg = e.error; } } catch (x) {}
            return msg;
        }
        var f = res.data.fields, v = function (k) { return f[k] && f[k].value != null ? f[k].value : null; }, cf = function (k) { return (f[k] && f[k].confidence) || 'low'; };
        var rec = {
            job_id: jobId, order_read: v('order_no'), order_conf: cf('order_no'), lot_read: v('lot_no'), color_read: v('tape_color'), lot_conf: cf('lot_no'),
            total_read: typeof v('total_amount') === 'number' ? v('total_amount') : null, deposit_read: typeof v('prepaid_deposit') === 'number' ? v('prepaid_deposit') : null,
            balance_read: typeof v('balance_due_at_destination') === 'number' ? v('balance_due_at_destination') : null,
            warnings: (res.data.warnings || []).filter(function (w) { return !/^Total \(/.test(w); }),
            read_at: new Date().toISOString(), read_by: (window.currentLoggedInUser && window.currentLoggedInUser.email) || null,
            reviewed: false, reviewed_by: null, reviewed_at: null
        };
        var up = await sb().from('job_document_review').upsert(rec, { onConflict: 'job_id' });
        if (up.error) return 'Could not save: ' + up.error.message;
        var row = rows.find(function (x) { return String(x.job.id) === String(jobId); });
        if (row) { row.rv = rec; row.flags = flagsFor(row.job, rec); }
        return null;
    }
    async function readIds(ids, force) {
        var n = 0, fails = [], c = document.getElementById('reviewCount');
        async function worker() {
            while (n < ids.length) {
                var id = ids[n++];
                if (c) c.textContent = 'Reading with AI... ' + n + ' of ' + ids.length;
                var err = await readOne(id, force);
                if (err) fails.push((rows.find(function (x) { return String(x.job.id) === String(id); }) || { job: {} }).job.jobNo + ': ' + err);
            }
        }
        await Promise.all([worker(), worker()]);
        draw();
        if (fails.length) alert('Some documents could not be read:\n' + fails.slice(0, 8).join('\n'));
    }
    function readRow(jobId) {
        var row = rows.find(function (x) { return String(x.job.id) === String(jobId); });
        if (row && row.rv && !confirm('This document was already read. Read it again? This replaces the saved reading and clears its Reviewed tick.')) return;
        readIds([jobId], !!(row && row.rv));
    }
    function readAllUnread() {
        var ids = rows.filter(function (r) { return r.has && !r.rv && window.WathekDocs.isPdf(r.job.id); }).map(function (r) { return r.job.id; });
        if (!ids.length) { alert('Every document already has a saved reading.'); return; }
        if (!confirm('Hello Wathek, the Checker will read the document.')) return;
        readIds(ids);
    }

    window.WathekReview = {
        exportDeclined: exportDeclined,
        exportNoDoc: exportNoDoc,
        searchNoDoc: function (v) { noDocQuery = v || ''; drawNoDoc(); },
        readRow: readRow, readAllUnread: readAllUnread,
        render: function () { if (window.currentUserRole !== 'Admin') return; load(); },
        toggleShowAll: function (v) { onlyCheck = !v; draw(); },
        toggleOnlyUnread: function (v) { onlyUnread = !!v; draw(); },
        exportCsv: exportCsv
    };
})();
