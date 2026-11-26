/*
 * cashbox.js - Cash Box (Admin only).
 * Shows the cash that is with the Admin:
 *   + cash received  = payments written as Cash in PU Payment and Dest Payment of the jobs
 *   - cash spent     = Helpers and Drivers + every Diesel / Hotel / Truck rental / Warehouse amount written as Cash
 *   + added          = Opening balance and Top-ups taken from the company (entered here)
 *   - returned       = cash given back to the company (entered here)
 * The Foreman is not part of the cash. Payments with no method (Unspecified) are not counted as cash.
 * The job numbers come from the same rules as the Official PDF Report (reports.js), so the two always agree.
 */
(function () {
    'use strict';

    var state = { from: '', to: '', entries: [], ready: false, loading: false, open: {} };

    function $(id) { return document.getElementById(id); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function sb() { return window.supabaseClient || null; }
    function calc() { return window.WathekCalc || null; }
    function r2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
    function money(n) {
        n = r2(n);
        var s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        return (n < 0 ? '-$' : '$') + s;
    }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function keyOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function nice(key) {
        var p = String(key).split('-');
        if (p.length !== 3) return key;
        var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(p[1]) - 1];
        return Number(p[2]) + ' ' + m + ' ' + p[0];
    }
    function monthRange(offset) {
        var n = new Date(), a = new Date(n.getFullYear(), n.getMonth() + offset, 1), b = offset === 0 ? n : new Date(n.getFullYear(), n.getMonth() + offset + 1, 0);
        return { from: keyOf(a), to: keyOf(b) };
    }

    // ---------- the numbers ----------
    var COLS = ['pu', 'dest', 'helpers', 'drivers', 'diesel', 'hotel', 'rental', 'warehouse', 'other', 'added', 'returned'];
    function emptyDay() { var o = { unspec: 0, notes: [] }; COLS.forEach(function (c) { o[c] = 0; }); return o; }

    function compute() {
        var c = calc(), days = {}, skipped = 0;
        function day(k) { return days[k] || (days[k] = emptyDay()); }
        if (!c) return { days: days, keys: [], start: null, skipped: 0 };
        (Array.isArray(window.masterJobs) ? window.masterJobs : []).forEach(function (j) {
            var k = c.toDateKey(j.date || j.job_date || '');
            if (!k) { skipped++; return; }
            var o = c.computeSummary({ jobs: [j], rentals: [], warehouse: [] }), f = o.official, d = day(k);
            d.pu += f.cashPu; d.dest += f.cashDest; d.helpers += f.helpers; d.drivers += f.drivers; d.diesel += f.cashDiesel;
            String(j.hotel || j.hotel_expense || '').split('+').forEach(function (part) { if (c.detectMethod(part) === 'Cash') d.hotel += c.firstNumber(part); });
            d.unspec += o.payments.Unspecified;
        });
        var isCash = function (t) { return /cash(?!app)/.test(String(t || '').toLowerCase()); };
        (Array.isArray(window.currentTruckRentals) ? window.currentTruckRentals : []).forEach(function (r) {
            var k = c.toDateKey(r.date); if (!k) { skipped++; return; }
            if (isCash(c.rentalPayType(r))) day(k).rental += c.parseMoney(r.amount);
        });
        (Array.isArray(window.currentWarehouseRecords) ? window.currentWarehouseRecords : []).forEach(function (w) {
            var k = c.toDateKey(w.date); if (!k) { skipped++; return; }
            if (isCash(c.warehousePayType(w))) day(k).warehouse += c.parseMoney(w.amount);
        });
        var start = null;
        state.entries.forEach(function (e) {
            var k = String(e.entry_date).slice(0, 10), d = day(k), a = Number(e.amount) || 0;
            if (e.kind === 'Cash count') { d.notes.push('Cash count: ' + money(a) + (e.note ? ' - ' + e.note : '')); return; }
            if (e.kind === 'Returned to company') d.returned += a; else if (e.kind === 'Other expense') d.other += a; else d.added += a;
            d.notes.push(e.kind + ': ' + money(a) + (e.note ? ' - ' + e.note : ''));
            if (e.kind === 'Opening balance' && (!start || k < start)) start = k;
        });
        var keys = Object.keys(days).filter(function (k) { return !start || k >= start; }).sort();
        return { days: days, keys: keys, start: start, skipped: skipped };
    }
    function received(d) { return d.pu + d.dest; }
    function spent(d) { return d.helpers + d.drivers + d.diesel + d.hotel + d.rental + d.warehouse + d.other; }

    // Running balance for every day, then the figures of the chosen period
    function build() {
        var m = compute(), run = 0, before = 0, rows = [];
        var t = emptyDay(); delete t.notes;
        m.keys.forEach(function (k) {
            var d = m.days[k], net = received(d) - spent(d) + d.added - d.returned;
            if (state.from && k < state.from) { if (m.start) { run += net; before = run; } return; }
            if (state.to && k > state.to) return;
            run += net;
            COLS.forEach(function (c) { t[c] += d[c]; });
            t.unspec += d.unspec;
            if (net !== 0 || received(d) || spent(d) || d.added || d.returned) rows.push({ key: k, d: d, balance: run });
        });
        var lc = state.entries.filter(function (e) { return e.kind === 'Cash count'; }).sort(function (a, c) { return String(c.entry_date).localeCompare(String(a.entry_date)) || c.id - a.id; })[0], count = null;
        if (lc && m.start) {
            var cd = String(lc.entry_date).slice(0, 10), sys = 0;
            if (cd >= m.start) {
                m.keys.forEach(function (k) { if (k <= cd) { var d = m.days[k]; sys += received(d) - spent(d) + d.added - d.returned; } });
                count = { date: cd, counted: r2(lc.amount), system: r2(sys), diff: r2(Number(lc.amount) - sys) };
            }
        }
        return { m: m, rows: rows, before: r2(before), after: r2(run), t: t, count: count };
    }

    // ---------- screen ----------
    function shell() {
        var host = $('tab-cash');
        if (!host || host.getAttribute('data-ready')) return;
        host.setAttribute('data-ready', '1');
        host.innerHTML =
            '<div class="glass-panel p-5 rounded-2xl bg-white shadow-xs border border-surface-200 space-y-4">' +
              '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">' +
                '<div><h3 class="font-bold text-surface-900 text-base">Cash Box</h3>' +
                '<p class="text-xs text-surface-500">The cash received from customers, the cash spent, and the cash added from the company.</p></div>' +
                '<div class="flex gap-2"><button type="button" id="cbAdd" class="px-3 py-2 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition cursor-pointer"><i class="fa-solid fa-plus mr-1"></i> Add entry</button>' +
                '<button type="button" id="cbCountBtn" class="px-3 py-2 text-xs bg-surface-100 hover:bg-surface-200 text-surface-800 rounded-xl font-semibold transition cursor-pointer"><i class="fa-solid fa-calculator mr-1"></i> Count cash</button>' +
                '<button type="button" id="cbPdf" class="px-3 py-2 text-xs bg-surface-100 hover:bg-surface-200 text-surface-800 rounded-xl font-semibold transition cursor-pointer"><i class="fa-solid fa-file-pdf mr-1"></i> Save PDF</button></div>' +
              '</div>' +
              '<div class="flex flex-wrap items-center gap-2">' +
                '<button type="button" data-r="m0" class="cb-chip px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition">This month</button>' +
                '<button type="button" data-r="m1" class="cb-chip px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition">Last month</button>' +
                '<button type="button" data-r="all" class="cb-chip px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition">All</button>' +
                '<label class="text-[11px] text-surface-500 ml-2">From</label><input id="cbFrom" type="date" class="px-2 py-1.5 bg-surface-50 border border-surface-200 rounded-xl text-xs text-surface-800">' +
                '<label class="text-[11px] text-surface-500">To</label><input id="cbTo" type="date" class="px-2 py-1.5 bg-surface-50 border border-surface-200 rounded-xl text-xs text-surface-800">' +
              '</div>' +
            '</div>' +
            '<div id="cbNotes"></div>' +
            '<div id="cbCards" class="grid grid-cols-2 lg:grid-cols-3 gap-3"></div>' +
            '<div id="cbCount"></div>' +
            '<div id="cbSplit" class="grid grid-cols-1 md:grid-cols-2 gap-3"></div>' +
            '<div class="glass-panel rounded-2xl bg-white shadow-xs border border-surface-200 overflow-hidden"><div class="p-4 border-b border-surface-100 font-bold text-xs text-surface-900 uppercase tracking-wide">Cash entries</div><div id="cbEntries"></div></div>' +
            '<div class="glass-panel rounded-2xl bg-white shadow-xs border border-surface-200 overflow-hidden"><div class="p-4 border-b border-surface-100 font-bold text-xs text-surface-900 uppercase tracking-wide">Day by day</div><div id="cbDays"></div></div>';
        host.addEventListener('click', function (e) {
            var ch = e.target.closest('.cb-chip');
            if (ch) { var v = ch.getAttribute('data-r'); var r = v === 'all' ? { from: '', to: '' } : monthRange(v === 'm1' ? -1 : 0); state.from = r.from; state.to = r.to; paint(); return; }
            var row = e.target.closest('[data-day]');
            if (row) { var k = row.getAttribute('data-day'); state.open[k] = !state.open[k]; paint(); return; }
            var del = e.target.closest('[data-del]');
            var edt = e.target.closest('[data-edit]');
            if (edt) { var en = state.entries.filter(function (x) { return String(x.id) === edt.getAttribute('data-edit'); })[0]; if (en) addEntry(en); return; }
            if (del) { removeEntry(del.getAttribute('data-del')); return; }
            if (e.target.closest('#cbAdd')) addEntry();
            if (e.target.closest('#cbCountBtn')) addEntry(null, 'Cash count');
            if (e.target.closest('#cbRecordDiff')) recordDiff();
            if (e.target.closest('#cbPdf')) savePdf();
        });
        $('cbFrom').addEventListener('change', function () { state.from = this.value; paint(); });
        $('cbTo').addEventListener('change', function () { state.to = this.value; paint(); });
    }

    function card(label, value, sub, tone) {
        var color = tone === 'neg' ? 'text-alert-600' : (tone === 'main' ? 'text-primary-600' : 'text-surface-900');
        return '<div class="glass-panel p-4 rounded-2xl bg-white shadow-xs border border-surface-200"><div class="text-[11px] text-surface-500">' + label + '</div>' +
            '<div class="text-lg font-bold ' + color + '">' + value + '</div>' + (sub ? '<div class="text-[10px] text-surface-400 mt-0.5">' + sub + '</div>' : '') + '</div>';
    }
    function line(label, v) { return '<div class="flex justify-between text-xs py-1.5 border-b border-surface-100 last:border-0"><span class="text-surface-600">' + label + '</span><span class="font-semibold text-surface-900">' + money(v) + '</span></div>'; }

    function paint() {
        if (!$('cbCards')) return;
        var b = build(), t = b.t, chips = document.querySelectorAll('#tab-cash .cb-chip');
        $('cbFrom').value = state.from; $('cbTo').value = state.to;
        var cm = monthRange(0), lm = monthRange(-1);
        for (var i = 0; i < chips.length; i++) {
            var v = chips[i].getAttribute('data-r');
            var on = v === 'all' ? (!state.from && !state.to) : (v === 'm0' ? (state.from === cm.from && state.to === cm.to) : (state.from === lm.from && state.to === lm.to));
            chips[i].className = 'cb-chip px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition ' + (on ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200');
        }
        var notes = '';
        var warn = function (txt) { return '<div class="p-3 rounded-xl text-[11px] bg-warning-500/10 text-warning-700 border border-warning-500/30 mb-2">' + txt + '</div>'; };
        if (!b.m.start) notes += warn('Add an <b>Opening balance</b> entry (the cash you had on the day you start) so the balance is correct. Until then, each period starts from zero and shows only its own days.');
        if (t.unspec > 0) notes += warn(money(t.unspec) + ' of payments in this period have no payment method (Unspecified). They are <b>not</b> counted as cash.');
        if (b.m.skipped) notes += warn(b.m.skipped + ' record(s) have a date that cannot be read and are not counted.');
        $('cbNotes').innerHTML = notes;

        var rec = received(t), sp = spent(t);
        $('cbCards').innerHTML =
            card('Start of period', money(b.before), '') +
            card('Cash received', money(rec), 'PU ' + money(t.pu) + ' &middot; Dest ' + money(t.dest)) +
            card('Cash spent', money(sp), '') +
            card('Added from company', money(t.added), 'Opening balance + top-ups') +
            card('Returned to company', money(t.returned), '') +
            card('Cash in the box', money(b.after), 'End of period', b.after < 0 ? 'neg' : 'main');
        $('cbSplit').innerHTML =
            '<div class="glass-panel p-4 rounded-2xl bg-white shadow-xs border border-surface-200"><div class="font-bold text-xs text-surface-900 uppercase tracking-wide mb-1">Received</div>' + line('PU payments (cash)', t.pu) + line('Destination payments (cash)', t.dest) + line('<b>Total</b>', rec) + '</div>' +
            '<div class="glass-panel p-4 rounded-2xl bg-white shadow-xs border border-surface-200"><div class="font-bold text-xs text-surface-900 uppercase tracking-wide mb-1">Spent</div>' +
              line('Helpers', t.helpers) + line('Drivers', t.drivers) + line('Diesel (cash)', t.diesel) + line('Hotels (cash)', t.hotel) + line('Truck rentals (cash)', t.rental) + line('Warehouse (cash)', t.warehouse) + (t.other ? line('Other expenses', t.other) : '') + line('<b>Total</b>', sp) + '</div>';

        var cp = b.count;
        $('cbCount').innerHTML = cp ? '<div class="p-4 rounded-2xl border ' + (cp.diff === 0 ? 'bg-primary-50 border-primary-200' : 'bg-warning-500/10 border-warning-500/30') + ' flex flex-col sm:flex-row sm:items-center gap-3">' +
            '<div class="flex-1 text-xs text-surface-800"><div class="font-bold text-surface-900 mb-0.5">Last cash count &middot; ' + esc(nice(cp.date)) + '</div>' +
            'Counted <b>' + money(cp.counted) + '</b> &middot; System says <b>' + money(cp.system) + '</b> &middot; ' +
            (cp.diff === 0 ? '<b>Matches.</b>' : (cp.diff < 0 ? '<b class="text-alert-600">' + money(Math.abs(cp.diff)) + ' missing</b> (spent but not recorded?)' : '<b class="text-primary-600">' + money(cp.diff) + ' more</b> than the system')) + '</div>' +
            (cp.diff < 0 ? '<button type="button" id="cbRecordDiff" class="px-3 py-2 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold cursor-pointer">Record as Other expense</button>' : '') + '</div>' : '';

        var rows = b.rows.slice().reverse();
        $('cbDays').innerHTML = rows.length ? rows.map(function (x) {
            var d = x.d, open = state.open[x.key], net = d.added - d.returned;
            var det = open
                ? '<div class="px-4 pb-3 text-[11px] text-surface-600 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">' +
                  [['PU cash', d.pu], ['Dest cash', d.dest], ['Helpers', d.helpers], ['Drivers', d.drivers], ['Diesel', d.diesel], ['Hotels', d.hotel], ['Rentals', d.rental], ['Warehouse', d.warehouse], ['Other', d.other]]
                    .filter(function (p) { return p[1]; }).map(function (p) { return '<div>' + p[0] + ': <b>' + money(p[1]) + '</b></div>'; }).join('') +
                  d.notes.map(function (n) { return '<div class="col-span-2 sm:col-span-4 text-primary-600">' + esc(n) + '</div>'; }).join('') + '</div>'
                : '';
            return '<div class="border-b border-surface-100 last:border-0"><button type="button" data-day="' + x.key + '" class="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-surface-50">' +
                '<i class="fa-solid fa-chevron-' + (open ? 'down' : 'right') + ' text-[10px] text-surface-400 w-3"></i>' +
                '<span class="text-xs font-semibold text-surface-900 w-28 shrink-0">' + esc(nice(x.key)) + '</span>' +
                '<span class="flex-1 grid grid-cols-3 gap-2 text-[11px]"><span class="text-primary-600">+ ' + money(received(d)) + '</span><span class="text-alert-600">- ' + money(spent(d)) + '</span>' +
                '<span class="text-surface-500">' + (net ? (net > 0 ? '+ ' : '- ') + money(Math.abs(net)) : '') + '</span></span>' +
                '<span class="text-xs font-bold ' + (x.balance < 0 ? 'text-alert-600' : 'text-surface-900') + '">' + money(x.balance) + '</span></button>' + det + '</div>';
        }).join('') : '<div class="p-6 text-center text-xs text-surface-500">No cash activity in this period.</div>';

        var es = state.entries.slice().sort(function (a, c) { return String(c.entry_date).localeCompare(String(a.entry_date)) || c.id - a.id; });
        $('cbEntries').innerHTML = es.length ? es.map(function (e) {
            var minus = e.kind === 'Returned to company' || e.kind === 'Other expense', cnt = e.kind === 'Cash count';
            return '<div class="flex items-center gap-3 px-4 py-3 border-b border-surface-100 last:border-0"><div class="min-w-0 flex-1"><div class="text-xs font-semibold text-surface-900">' + esc(e.kind) + ' &middot; <span class="' + (cnt ? 'text-surface-500' : (minus ? 'text-alert-600' : 'text-primary-600')) + '">' + (cnt ? '' : (minus ? '- ' : '+ ')) + money(e.amount) + '</span></div>' +
                '<div class="text-[11px] text-surface-500">' + esc(nice(String(e.entry_date).slice(0, 10))) + (e.note ? ' &middot; ' + esc(e.note) : '') + '</div></div>' +
                '<button type="button" data-edit="' + e.id + '" aria-label="Edit entry" class="w-8 h-8 rounded-lg bg-primary-50 hover:bg-primary-100 text-primary-600 text-xs cursor-pointer mr-1.5"><i class="fa-solid fa-pen"></i></button>' +
                '<button type="button" data-del="' + e.id + '" aria-label="Delete entry" class="w-8 h-8 rounded-lg bg-danger-50 hover:bg-danger-100 text-danger-600 text-xs cursor-pointer"><i class="fa-solid fa-trash-can"></i></button></div>';
        }).join('') : '<div class="p-6 text-center text-xs text-surface-500">No entries yet. Add the Opening balance first, then each top-up, other expense or cash count.</div>';
    }

    // ---------- data ----------
    function loadEntries() {
        var c = sb();
        if (!c) return Promise.resolve();
        return Promise.resolve(c.from('cash_box_entries').select('*').order('entry_date', { ascending: true }).order('id', { ascending: true })).then(function (res) {
            if (res.error) throw res.error;
            state.entries = res.data || [];
        });
    }
    function render() {
        if (window.currentUserRole !== 'Admin') return;
        shell();
        if (!state.from && !state.to && !state.ready) { var r = monthRange(0); state.from = r.from; state.to = r.to; }
        state.ready = true;
        var jobs = [];
        if (typeof window.loadPrivateTruckRentals === 'function') jobs.push(window.loadPrivateTruckRentals());
        if (typeof window.loadWarehouseData === 'function') jobs.push(window.loadWarehouseData());
        jobs.push(loadEntries());
        paint();
        Promise.all(jobs.map(function (p) { return Promise.resolve(p).catch(function () {}); })).then(paint);
    }

    function addEntry(old, preset) {
        if (window.currentUserRole !== 'Admin' || !window.WDialog) return;
        var ed = !!old;
        WDialog.form({
            title: ed ? 'Edit cash entry' : 'Add cash entry',
            intro: 'Opening balance: the cash you had on the day you start. Top-up: cash taken from the company. Returned: cash given back. Other expense: cash spent that is not recorded elsewhere. Cash count: the cash you counted in the box (does not change the balance).',
            submitText: ed ? 'Save changes' : 'Save entry',
            fields: [
                { name: 'kind', label: 'Type', type: 'select', required: true, value: ed ? old.kind : (preset || 'Top-up'), options: [
                    { value: 'Opening balance', label: 'Opening balance' }, { value: 'Top-up', label: 'Top-up from the company' }, { value: 'Returned to company', label: 'Returned to the company' }, { value: 'Other expense', label: 'Other expense (cash)' }, { value: 'Cash count', label: 'Cash count (what is in the box)' }] },
                { name: 'entry_date', label: 'Date', type: 'date', required: true, value: ed ? String(old.entry_date).slice(0, 10) : keyOf(new Date()) },
                { name: 'amount', label: 'Amount ($)', type: 'number', required: true, maxLength: 12, value: ed ? String(old.amount) : '', validate: function (v, all) {
                    var n = Number(String(v).replace(/,/g, '')), zero = all && all.kind === 'Cash count';
                    return (isNaN(n) || (zero ? n < 0 : !(n > 0)) || n > 10000000) ? (zero ? 'Enter the counted amount (zero or more).' : 'Enter an amount greater than zero.') : '';
                } },
                { name: 'note', label: 'Note (optional)', type: 'text', maxLength: 200, value: ed ? (old.note || '') : '' }
            ]
        }).then(function (v) {
            if (!v) return;
            if (!/^\d{4}-\d{2}-\d{2}$/.test(v.entry_date)) { WDialog.alert('Please choose a valid date.', { title: 'Cash entry', type: 'error' }); return; }
            var body = { kind: v.kind, entry_date: v.entry_date, amount: r2(Number(String(v.amount).replace(/,/g, ''))), note: v.note || null };
            var q = ed ? sb().from('cash_box_entries').update(body).eq('id', old.id) : sb().from('cash_box_entries').insert([body]);
            return Promise.resolve(q).then(function (res) {
                if (res.error) { WDialog.alert('The entry could not be saved. Please try again.', { title: 'Cash entry', type: 'error' }); return; }
                return loadEntries().then(paint);
            });
        });
    }
    function recordDiff() {
        var cp = build().count;
        if (!cp || cp.diff >= 0 || window.currentUserRole !== 'Admin' || !window.WDialog) return;
        var amt = r2(Math.abs(cp.diff));
        WDialog.confirm('Record ' + money(amt) + ' as an Other expense on ' + nice(cp.date) + '? The balance will then match your count.', { title: 'Other expense', confirmText: 'Record' }).then(function (ok) {
            if (!ok) return;
            return Promise.resolve(sb().from('cash_box_entries').insert([{ kind: 'Other expense', entry_date: cp.date, amount: amt, note: 'Cash count difference' }])).then(function (res) {
                if (res.error) { WDialog.alert('The entry could not be saved. Please try again.', { title: 'Other expense', type: 'error' }); return; }
                return loadEntries().then(paint);
            });
        });
    }
    function removeEntry(id) {
        if (window.currentUserRole !== 'Admin' || !window.WDialog) return;
        var e = state.entries.filter(function (x) { return String(x.id) === String(id); })[0];
        if (!e) return;
        WDialog.confirm('Delete this entry (' + e.kind + ', ' + money(e.amount) + ' on ' + nice(String(e.entry_date).slice(0, 10)) + ')? The cash box balance will change. This cannot be undone, but it stays in the History Log.',
            { title: 'Delete entry', confirmText: 'Delete', danger: true }).then(function (ok) {
            if (!ok) return;
            return Promise.resolve(sb().from('cash_box_entries').delete().eq('id', e.id)).then(function (res) {
                if (res.error) { WDialog.alert('The entry could not be deleted.', { title: 'Delete entry', type: 'error' }); return; }
                return loadEntries().then(paint);
            });
        });
    }

    // ---------- PDF ----------
    function savePdf() {
        var b = build(), t = b.t, cells = ['pu', 'dest', 'helpers', 'drivers', 'diesel', 'hotel', 'rental', 'warehouse'];
        var me = window.currentLoggedInUser || {};
        var head = ['Date', 'PU cash', 'Dest cash', 'Received', 'Helpers', 'Drivers', 'Diesel', 'Hotels', 'Rentals', 'Warehouse', 'Other', 'Spent', 'Added', 'Returned', 'Balance'];
        var body = b.rows.map(function (x) {
            var d = x.d;
            return '<tr><td class="nw">' + esc(nice(x.key)) + '</td>' + [d.pu, d.dest, received(d), d.helpers, d.drivers, d.diesel, d.hotel, d.rental, d.warehouse, d.other, spent(d), d.added, d.returned].map(function (v) { return '<td class="r">' + (v ? money(v) : '-') + '</td>'; }).join('') +
                '<td class="r b' + (x.balance < 0 ? ' neg' : '') + '">' + money(x.balance) + '</td></tr>';
        }).join('');
        var foot = '<tr class="tot"><td>Total</td>' + [t.pu, t.dest, received(t), t.helpers, t.drivers, t.diesel, t.hotel, t.rental, t.warehouse, t.other, spent(t), t.added, t.returned].map(function (v) { return '<td class="r">' + money(v) + '</td>'; }).join('') + '<td class="r b">' + money(b.after) + '</td></tr>';
        var kpi = function (l, v, neg) { return '<div class="k"><div class="l">' + l + '</div><div class="v' + (neg ? ' neg' : '') + '">' + v + '</div></div>'; };
        var period = state.from || state.to ? (state.from ? nice(state.from) : 'Start') + ' to ' + (state.to ? nice(state.to) : 'today') : 'All dates';
        var entries = state.entries.filter(function (e) { var k = String(e.entry_date).slice(0, 10); return (!state.from || k >= state.from) && (!state.to || k <= state.to); });
        var css = 'body{font-family:Inter,Arial,sans-serif;color:#1b2540;margin:0;font-size:9.5px}.sheet{padding:10mm;box-sizing:border-box;-webkit-box-decoration-break:clone;box-decoration-break:clone}' +
            '@page{size:A4 landscape;margin:0}.hero{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #4a6fd0;padding-bottom:8px;margin-bottom:10px}' +
            '.brand{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#4a6fd0}h1{margin:2px 0 0;font-size:21px}.gen{text-align:right;font-size:9px;color:#5c6882}' +
            '.ks{display:flex;gap:6px;margin-bottom:10px}.k{flex:1;border:1px solid #d8deea;border-radius:8px;padding:6px 9px}.l{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#6b7791}.v{font-size:13px;font-weight:700}.neg{color:#c0392b}' +
            'table{width:100%;border-collapse:collapse}th{background:#eef2fb;font-size:8px;text-transform:uppercase;padding:4px;border:1px solid #d8deea;text-align:right}th:first-child{text-align:left}td{padding:3px 4px;border:1px solid #e1e6f0}.r{text-align:right}.nw{white-space:nowrap}.b{font-weight:700}' +
            'thead{display:table-header-group}tr{page-break-inside:avoid}.tot td{background:#eef2fb;font-weight:700}.sec{font-size:11px;font-weight:700;margin:12px 0 5px;text-transform:uppercase;color:#33415f}.note{margin-top:10px;font-size:8.5px;color:#5c6882;border-top:1px solid #d8deea;padding-top:6px}';
        var html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Our System - Cash Box</title><style>' + css + '</style></head><body><div class="sheet">' +
            '<div class="hero"><div><div class="brand">Our System</div><h1>Cash Box</h1><div style="font-size:10px;color:#5c6882;margin-top:2px">' + esc(period) + '</div></div>' +
            '<div class="gen">Generated ' + esc(nice(keyOf(new Date()))) + '<br>by ' + esc(me.name || me.email || 'Admin') + '</div></div>' +
            '<div class="ks">' + kpi('Start of period', money(b.before)) + kpi('Cash received', money(received(t))) + kpi('Cash spent', money(spent(t))) + kpi('Added from company', money(t.added)) + kpi('Returned', money(t.returned)) + kpi('Cash in the box', money(b.after), b.after < 0) + '</div>' +
            (t.unspec > 0 ? '<div class="note" style="border:0;margin:0 0 8px">Not counted as cash: ' + money(t.unspec) + ' of payments with no method (Unspecified).</div>' : '') +
            '<div class="sec">Day by day</div>' +
            (b.rows.length ? '<table><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + body + foot + '</tbody></table>' : '<div>No cash activity in this period.</div>') +
            (entries.length ? '<div class="sec">Cash entries</div><table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Note</th></tr></thead><tbody>' +
                entries.map(function (e) { return '<tr><td class="nw">' + esc(nice(String(e.entry_date).slice(0, 10))) + '</td><td>' + esc(e.kind) + '</td><td class="r">' + money(e.amount) + '</td><td>' + esc(e.note || '') + '</td></tr>'; }).join('') + '</tbody></table>' : '') +
            '<div class="note">Cash received = payments written as Cash in PU and Destination payments. Cash spent = Helpers and Drivers plus Diesel, Hotels, Truck rentals and Warehouse amounts written as Cash, plus any Other expense entered here. The Foreman is not included.</div>' +
            '<script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script></div></body></html>';
        var url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
        var w = window.open(url, '_blank');
        if (!w) { URL.revokeObjectURL(url); if (window.WDialog) WDialog.alert('The PDF window was blocked by the browser. Please allow pop-ups for this site and try again.'); return; }
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
        if (window.WathekLog) window.WathekLog('Reports', 'Cash Box', 'Saved as PDF - ' + period);
    }

    window.WathekCashBox = { render: render, _build: build };
})();
