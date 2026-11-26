/*
 * history.js - History Log (Admin only).
 * Shows who did what and when: jobs, truck rentals, warehouse expenses, users and documents.
 * The records are written by the database itself (triggers), so nobody can skip or edit them from the screen.
 * Display only: this screen never changes any data.
 */
(function () {
    'use strict';

    var PAGE = 50;
    var state = { period: '7', area: '', who: '', q: '', rows: [], done: false, loading: false, token: 0 };

    var AREAS = ['Jobs', 'Truck rental', 'Warehouse', 'Documents', 'Users', 'Reports', 'Backup'];
    var ACTIONS = {
        created:           { label: 'Created',        icon: 'fa-plus',              tone: 'primary' },
        updated:           { label: 'Changed',        icon: 'fa-pen',               tone: 'info' },
        trashed:           { label: 'Recycle Bin',    icon: 'fa-trash-can',         tone: 'warn' },
        restored:          { label: 'Restored',       icon: 'fa-rotate-left',       tone: 'primary' },
        deleted:           { label: 'Deleted',        icon: 'fa-xmark',             tone: 'danger' },
        saved:             { label: 'Saved',          icon: 'fa-floppy-disk',       tone: 'info' },
        signed_in:         { label: 'Signed in',      icon: 'fa-right-to-bracket',  tone: 'muted' },
        reminder_accepted: { label: 'Reminder',       icon: 'fa-circle-check',      tone: 'muted' }
    };
    var TONES = {
        primary: 'bg-primary-500/10 text-primary-600',
        info: 'bg-info-500/10 text-info-600',
        warn: 'bg-warning-500/10 text-warning-600',
        danger: 'bg-alert-500/10 text-alert-600',
        muted: 'bg-surface-200 text-surface-600'
    };
    var FIELDS = {
        date: 'Date', job_no: 'Job no.', route: 'Route', foreman_name: 'Foreman', foreman_cost: 'Foreman cost', helpers_cost: 'Helpers',
        drivers_cost: 'Drivers', total_amount: 'Total', pu_payments: 'PU payments', destination_payments: 'Destination payments',
        diesel_expense: 'Diesel', hotel_expense: 'Hotels', storage: 'Storage', is_deleted: 'In Recycle Bin', lot_no: 'Lot no.', tape_color: 'Tape color',
        Days: 'Days', amount: 'Amount', paymentType: 'Payment method', paidBy: 'Paid by', truckLabel: 'Truck', services: 'Service', details: 'Details',
        name: 'Name', email: 'Email', role: 'Role', status: 'Status', reminder_required: 'Reminder required', file_name: 'File', file_path: 'File path'
    };

    function $(id) { return document.getElementById(id); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function sb() { return window.supabaseClient || window.supabase_client || null; }

    function when(v) {
        var d = new Date(v);
        if (isNaN(d.getTime())) return '';
        var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
        var p = function (n) { return (n < 10 ? '0' : '') + n; };
        return d.getDate() + ' ' + m + ' ' + d.getFullYear() + ', ' + p(d.getHours()) + ':' + p(d.getMinutes());
    }
    function who(email) {
        if (!email || email === 'system') return 'System';
        var u = (window.systemUsers || []).filter(function (x) { return String(x.email || '').toLowerCase() === String(email).toLowerCase(); })[0];
        return u && u.name ? u.name : email;
    }
    function field(f) { return FIELDS[f] || String(f).replace(/_/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }); }
    function sinceISO() {
        if (state.period === 'all') return null;
        var d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - (Number(state.period) - 1));
        return d.toISOString();
    }

    function shell() {
        var host = $('tab-history');
        if (!host || host.getAttribute('data-ready')) return;
        host.setAttribute('data-ready', '1');
        var chip = function (v, t) { return '<button type="button" data-p="' + v + '" class="hl-chip px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition"></button>'.replace('></button>', '>' + t + '</button>'); };
        host.innerHTML =
            '<div class="glass-panel p-5 rounded-2xl bg-white shadow-xs border border-surface-200 space-y-4">' +
              '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">' +
                '<div><h3 class="font-bold text-surface-900 text-base">History Log</h3>' +
                '<p class="text-xs text-surface-500">Who did what, and when. Recorded automatically; it cannot be edited.</p></div>' +
                '<div class="flex gap-2">' +
                  '<button type="button" id="hlPdf" class="px-3 py-2 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition cursor-pointer"><i class="fa-solid fa-file-pdf mr-1"></i> Save PDF</button>' +
                  '<button type="button" id="hlExport" class="px-3 py-2 text-xs bg-surface-100 hover:bg-surface-200 text-surface-800 rounded-xl font-semibold transition cursor-pointer"><i class="fa-solid fa-file-excel mr-1"></i> Save Excel</button>' +
                '</div>' +
              '</div>' +
              '<div class="flex flex-wrap items-center gap-2">' +
                chip('1', 'Today') + chip('7', '7 days') + chip('30', '30 days') + chip('all', 'All') +
                '<select id="hlArea" class="px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-semibold text-surface-700"><option value="">All areas</option>' +
                AREAS.map(function (a) { return '<option>' + a + '</option>'; }).join('') + '</select>' +
                '<select id="hlWho" class="px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-semibold text-surface-700"><option value="">Everyone</option></select>' +
                '<input id="hlQ" type="search" placeholder="Search a job, name or word" class="flex-1 min-w-[160px] px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs text-surface-800 focus:outline-none focus:border-primary-500">' +
              '</div>' +
            '</div>' +
            '<div class="glass-panel rounded-2xl bg-white shadow-xs border border-surface-200 overflow-hidden">' +
              '<div id="hlList"></div>' +
              '<div id="hlMore" class="p-4 text-center"></div>' +
            '</div>';
        host.addEventListener('click', function (e) {
            var c = e.target.closest('.hl-chip');
            if (c) { state.period = c.getAttribute('data-p'); reload(); return; }
            var t = e.target.closest('[data-toggle]');
            if (t) { var box = $('hlc' + t.getAttribute('data-toggle')); if (box) box.classList.toggle('hidden'); return; }
            if (e.target.closest('#hlMore button')) { load(); return; }
            if (e.target.closest('#hlExport')) exportCsv();
            if (e.target.closest('#hlPdf')) exportPdf();
        });
        $('hlArea').addEventListener('change', function () { state.area = this.value; reload(); });
        $('hlWho').addEventListener('change', function () { state.who = this.value; reload(); });
        var timer;
        $('hlQ').addEventListener('input', function () { var v = this.value; clearTimeout(timer); timer = setTimeout(function () { state.q = v.trim(); reload(); }, 350); });
    }

    function paintChips() {
        var chips = document.querySelectorAll('#tab-history .hl-chip');
        for (var i = 0; i < chips.length; i++) {
            var on = chips[i].getAttribute('data-p') === state.period;
            chips[i].className = 'hl-chip px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition ' +
                (on ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200');
        }
    }
    function paintWho() {
        var sel = $('hlWho');
        if (!sel) return;
        var seen = {}, opts = '<option value="">Everyone</option>';
        (window.systemUsers || []).forEach(function (u) { if (u.email && !seen[u.email.toLowerCase()]) { seen[u.email.toLowerCase()] = 1; opts += '<option value="' + esc(u.email) + '">' + esc(u.name || u.email) + '</option>'; } });
        opts += '<option value="system">System</option>';
        sel.innerHTML = opts;
        sel.value = state.who;
    }

    function rowHtml(r, i) {
        var a = ACTIONS[r.action] || { label: r.action, icon: 'fa-circle', tone: 'muted' };
        var ch = Array.isArray(r.changes) ? r.changes : [];
        var more = ch.length
            ? '<button type="button" data-toggle="' + i + '" class="mt-1 text-[11px] font-semibold text-primary-600 cursor-pointer">Show changes (' + ch.length + ')</button>' +
              '<div id="hlc' + i + '" class="hidden mt-2 rounded-xl border border-surface-200 overflow-hidden"><table class="w-full text-[11px]"><tbody>' +
              ch.map(function (c) {
                  return '<tr class="border-b border-surface-100 last:border-0"><td class="p-2 font-semibold text-surface-700 whitespace-nowrap align-top">' + esc(field(c.f)) + '</td>' +
                      '<td class="p-2 text-surface-500 break-all align-top">' + esc(c.from || '-') + '</td>' +
                      '<td class="p-2 text-surface-400 align-top"><i class="fa-solid fa-arrow-right"></i></td>' +
                      '<td class="p-2 text-surface-900 font-medium break-all align-top">' + esc(c.to || '-') + '</td></tr>';
              }).join('') + '</tbody></table></div>'
            : '';
        return '<div class="flex gap-3 p-4 border-b border-surface-100 last:border-0">' +
            '<div class="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs ' + (TONES[a.tone] || TONES.muted) + '"><i class="fa-solid ' + a.icon + '"></i></div>' +
            '<div class="min-w-0 flex-1">' +
              '<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">' +
                '<span class="text-xs font-bold text-surface-900 break-all">' + esc(r.label || '-') + '</span>' +
                '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ' + (TONES[a.tone] || TONES.muted) + '">' + esc(a.label) + '</span>' +
                '<span class="text-[10px] text-surface-400">' + esc(r.area) + '</span>' +
              '</div>' +
              '<div class="text-[11px] text-surface-600 mt-0.5">' + esc(ch.length ? 'Changed ' + ch.map(function (c) { return field(c.f); }).join(', ') : (r.summary || '')) + '</div>' +
              '<div class="text-[10px] text-surface-400 mt-0.5">' + esc(who(r.actor_email)) + (r.actor_role ? ' (' + esc(r.actor_role) + ')' : '') + ' &middot; ' + esc(when(r.at)) + '</div>' +
              more +
            '</div></div>';
    }

    function paint() {
        var list = $('hlList'), more = $('hlMore');
        if (!list) return;
        list.innerHTML = state.rows.length
            ? state.rows.map(rowHtml).join('')
            : '<div class="p-8 text-center text-xs text-surface-500">' + (state.loading ? 'Loading...' : 'Nothing recorded for this selection. The log started on the day it was switched on.') + '</div>';
        more.innerHTML = state.rows.length && !state.done
            ? '<button type="button" class="px-4 py-2 text-xs bg-surface-100 hover:bg-surface-200 text-surface-800 rounded-xl font-semibold cursor-pointer">' + (state.loading ? 'Loading...' : 'Show more') + '</button>'
            : (state.rows.length ? '<span class="text-[11px] text-surface-400">End of the list</span>' : '');
    }

    function query(from, to) {
        var c = sb();
        if (!c) return null;
        var q = c.from('audit_log').select('*').order('at', { ascending: false }).order('id', { ascending: false }).range(from, to);
        var s = sinceISO();
        if (s) q = q.gte('at', s);
        if (state.area) q = q.eq('area', state.area);
        if (state.who) q = q.ilike('actor_email', state.who.replace(/[\\%_]/g, function (m) { return '\\' + m; })); // not case sensitive
        if (state.q) {
            var t = state.q.replace(/[%,()*]/g, ' ').trim();
            if (t) q = q.or('label.ilike.%' + t + '%,summary.ilike.%' + t + '%,actor_email.ilike.%' + t + '%');
        }
        return q;
    }

    function load() {
        if (state.loading || state.done) return;
        var token = state.token;
        var q = query(state.rows.length, state.rows.length + PAGE - 1);
        if (!q) return;
        state.loading = true; paint();
        Promise.resolve(q).then(function (res) {
            if (token !== state.token) return;
            state.loading = false;
            if (res.error) { $('hlList').innerHTML = '<div class="p-8 text-center text-xs text-alert-600">The log could not be loaded. Please try again.</div>'; $('hlMore').innerHTML = ''; return; }
            var data = res.data || [];
            state.rows = state.rows.concat(data);
            if (data.length < PAGE) state.done = true;
            paint();
        }).catch(function () { if (token === state.token) { state.loading = false; paint(); } });
    }

    function reload() {
        state.token++; state.rows = []; state.done = false; state.loading = false;
        paintChips(); paintWho();
        load();
    }

    function exportCsv() {
        if (window.WathekLog) window.WathekLog('Reports', 'History Log', 'Saved as Excel file');
        var head = ['Date and time', 'Person', 'Role', 'Area', 'Record', 'Action', 'Summary', 'Changes'];
        var lines = [head].concat(state.rows.map(function (r) {
            var ch = (Array.isArray(r.changes) ? r.changes : []).map(function (c) { return field(c.f) + ': ' + (c.from || '-') + ' -> ' + (c.to || '-'); }).join(' | ');
            return [when(r.at), who(r.actor_email), r.actor_role || '', r.area, r.label || '', (ACTIONS[r.action] || {}).label || r.action, r.summary || '', ch];
        }));
        var csv = '﻿' + lines.map(function (l) { return l.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        a.download = 'history-log.csv';
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }


    // ---------- Save PDF: the whole selection (not only the rows on screen), for emergencies and accountability ----------
    var PDF_LIMIT = 5000;
    function fetchAll() {
        var rows = [];
        function next() {
            var q = query(rows.length, rows.length + 999);
            if (!q) return Promise.resolve({ rows: rows, capped: false });
            return Promise.resolve(q).then(function (res) {
                if (res.error) throw res.error;
                var d = res.data || [];
                rows = rows.concat(d);
                if (d.length < 1000) return { rows: rows, capped: false };
                if (rows.length >= PDF_LIMIT) return { rows: rows.slice(0, PDF_LIMIT), capped: true };
                return next();
            });
        }
        return next();
    }
    function periodName() { return { '1': 'Today', '7': 'Last 7 days', '30': 'Last 30 days', 'all': 'All time' }[state.period] || ''; }

    function buildPdfHtml(rows, capped) {
        var person = null, e = String(state.who || '').toLowerCase();
        if (e && e !== 'system') person = (window.systemUsers || []).filter(function (u) { return String(u.email || '').toLowerCase() === e; })[0] || { email: state.who };
        var me = window.currentLoggedInUser || {};
        var byAction = {}, byArea = {};
        rows.forEach(function (r) { byAction[r.action] = (byAction[r.action] || 0) + 1; byArea[r.area] = (byArea[r.area] || 0) + 1; });
        var chips = function (o, label) {
            var keys = Object.keys(o);
            return keys.length ? keys.map(function (k) { return '<span class="chip">' + esc(label(k)) + ' <b>' + o[k] + '</b></span>'; }).join('') : '<span class="muted">None</span>';
        };
        var title = person ? 'User Activity Report' : 'History Log Report';
        var info = function (l, v) { return '<div class="i"><div class="l">' + l + '</div><div class="v">' + (v === '' || v == null ? '-' : esc(v)) + '</div></div>'; };
        var who1 = person ? (person.name || person.email) : (state.who === 'system' ? 'System' : 'All users');
        var head = person
            ? info('Name', person.name || '') + info('Email', person.email || '') + info('Role', person.role || '') + info('Status', person.status || '') + info('Last login', person.last_login ? when(person.last_login) : '')
            : info('Selection', who1);
        var body = rows.map(function (r, i) {
            var a = ACTIONS[r.action] || { label: r.action };
            var ch = Array.isArray(r.changes) ? r.changes : [];
            var det = ch.length
                ? ch.map(function (c) { return '<div><b>' + esc(field(c.f)) + ':</b> ' + esc(c.from || '-') + ' &rarr; ' + esc(c.to || '-') + '</div>'; }).join('')
                : esc(r.summary || '');
            return '<tr><td class="n">' + (i + 1) + '</td><td class="nw">' + esc(when(r.at)) + '</td>' +
                (person ? '' : '<td>' + esc(who(r.actor_email)) + (r.actor_role ? '<div class="muted">' + esc(r.actor_role) + '</div>' : '') + '</td>') +
                '<td>' + esc(r.area) + '</td><td class="b">' + esc(r.label || '-') + '</td><td>' + esc(a.label) + '</td><td>' + det + '</td></tr>';
        }).join('');
        var css = 'body{font-family:Inter,Arial,sans-serif;color:#1b2540;margin:0;padding:22px;font-size:10px}' +
            '.hero{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #4a6fd0;padding-bottom:10px;margin-bottom:12px}' +
            '.brand{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#4a6fd0}h1{margin:2px 0 0;font-size:22px}' +
            '.gen{text-align:right;font-size:9px;color:#5c6882}.grid{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}' +
            '.i{flex:1 1 150px;border:1px solid #d8deea;border-radius:8px;padding:6px 9px}.l{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#6b7791}.v{font-size:11px;font-weight:700;margin-top:1px;word-break:break-all}' +
            '.sec{font-size:11px;font-weight:700;margin:12px 0 5px;text-transform:uppercase;letter-spacing:.06em;color:#33415f}' +
            '.chip{display:inline-block;border:1px solid #d8deea;background:#f4f7fd;border-radius:99px;padding:2px 9px;margin:0 4px 4px 0}.muted{color:#7a869f;font-size:8.5px}' +
            'table{width:100%;border-collapse:collapse}th{background:#eef2fb;text-align:left;font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;padding:5px 6px;border:1px solid #d8deea}' +
            'td{padding:4px 6px;border:1px solid #e1e6f0;vertical-align:top}thead{display:table-header-group}tr{page-break-inside:avoid}.n{color:#7a869f;width:24px}.nw{white-space:nowrap}.b{font-weight:700;word-break:break-all}' +
            '.note{margin-top:10px;font-size:8.5px;color:#5c6882;border-top:1px solid #d8deea;padding-top:6px}.warn{background:#fff6e5;border:1px solid #f0c36d;border-radius:6px;padding:5px 8px;margin-bottom:8px}' +
            '@page{size:A4 landscape;margin:0}.sheet{padding:10mm;box-sizing:border-box;-webkit-box-decoration-break:clone;box-decoration-break:clone}';
        return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Our System - ' + esc(title) + '</title><style>' + css + '</style></head><body><div class="sheet">' +
            '<div class="hero"><div><div class="brand">Our System</div><h1>' + title + '</h1></div>' +
            '<div class="gen">Generated ' + esc(when(new Date().toISOString())) + '<br>by ' + esc(me.name || me.email || 'Admin') + (me.email && me.name ? ' (' + esc(me.email) + ')' : '') + '</div></div>' +
            '<div class="grid">' + head + info('Period', periodName()) + info('Area', state.area || 'All areas') + info('Records', String(rows.length)) + '</div>' +
            (capped ? '<div class="warn">Only the most recent ' + PDF_LIMIT + ' records are shown. Narrow the period to see the rest.</div>' : '') +
            '<div class="sec">Summary by action</div><div>' + chips(byAction, function (k) { return (ACTIONS[k] || {}).label || k; }) + '</div>' +
            '<div class="sec">Summary by area</div><div>' + chips(byArea, function (k) { return k; }) + '</div>' +
            '<div class="sec">Records (newest first)</div>' +
            (rows.length
                ? '<table><thead><tr><th>#</th><th>Date and time</th>' + (person ? '' : '<th>Person</th>') + '<th>Area</th><th>Record</th><th>Action</th><th>Details</th></tr></thead><tbody>' + body + '</tbody></table>'
                : '<div class="muted">Nothing was recorded for this selection.</div>') +
            '<div class="note">This report comes from the automatic History Log of Our System. The records are written by the system itself and cannot be edited or deleted from the application.</div>' +
            '<script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script></div></body></html>';
    }

    function exportPdf() {
        var btn = $('hlPdf');
        if (btn && btn.disabled) return;
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Preparing...'; }
        var done = function () { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-file-pdf mr-1"></i> Save PDF'; } };
        fetchAll().then(function (res) {
            var url = URL.createObjectURL(new Blob([buildPdfHtml(res.rows, res.capped)], { type: 'text/html;charset=utf-8' }));
            var w = window.open(url, '_blank');
            if (!w) {
                URL.revokeObjectURL(url);
                if (window.WDialog) WDialog.alert('The PDF window was blocked by the browser. Please allow pop-ups for this site and try again.');
            } else {
                setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
                if (window.WathekLog) window.WathekLog('Reports', 'History Log - ' + (state.who ? who(state.who) : 'All users'), 'Saved as PDF - ' + periodName());
            }
            done();
        }).catch(function () {
            done();
            if (window.WDialog) WDialog.alert('The report could not be prepared. Please try again.', { title: 'Save PDF', type: 'error' });
        });
    }

    // Other files call this when someone saves a report, a backup or an Excel file (best effort, never blocks the save)
    window.WathekLog = function (area, label, summary) {
        try {
            var c = sb();
            if (c) Promise.resolve(c.rpc('log_event', { p_area: area, p_action: 'saved', p_label: label, p_summary: summary })).then(function () {}, function () {});
        } catch (e) {}
    };

    window.WathekHistory = {
        render: function () {
            if (window.currentUserRole !== 'Admin') return;
            shell(); paintChips(); paintWho();
            reload();
            // Make sure the names are known (otherwise the e-mail is shown); redraw when they arrive
            if (!(window.systemUsers || []).length && typeof window.fetchUsersFromSupabase === 'function') {
                Promise.resolve(window.fetchUsersFromSupabase()).then(function () { paintWho(); paint(); }).catch(function () {});
            }
        }
    };
})();
