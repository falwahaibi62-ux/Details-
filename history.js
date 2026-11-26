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
                '<button type="button" id="hlExport" class="px-3 py-2 text-xs bg-surface-100 hover:bg-surface-200 text-surface-800 rounded-xl font-semibold transition cursor-pointer"><i class="fa-solid fa-file-excel mr-1"></i> Save Excel</button>' +
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
        if (state.who) q = q.eq('actor_email', state.who);
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
