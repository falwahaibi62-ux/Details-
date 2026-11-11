/**
 * Wathek - Financial & Operations Reports Module
 *
 * - The report period is date-only (From / To are inclusive, time of day and time zone are ignored).
 * - The Reports page has its own filter; it no longer shares state with the Jobs page filter.
 * - Total Expenses = Diesel + Hotel + Warehouse + Truck Rentals (inside the selected period).
 * - Summary view, Detailed view and the PDF are all built from the same filtered data.
 */
(function () {
    'use strict';

    const RENTALS_KEY = 'movepro_private_truck_rentals';
    const WAREHOUSE_KEY = 'movepro_warehouse_records';

    // ==========================================
    // 1. BASIC HELPERS
    // ==========================================
    const $ = (id) => document.getElementById(id);

    function esc(value) {
        return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    // First number inside a text: "$3,795" -> 3795, "500 Cash" -> 500, "-" -> 0
    function firstNumber(text) {
        const m = String(text === null || text === undefined ? '' : text).match(/\d[\d,]*(?:\.\d+)?/);
        return m ? (parseFloat(m[0].replace(/,/g, '')) || 0) : 0;
    }

    function parseMoney(value) {
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        return firstNumber(value);
    }

    const fmt = (value) => Math.round(parseMoney(value)).toLocaleString('en-US');
    const money = (value) => '$' + fmt(value);

    // "150 Cash + 100 Zelle" -> 250
    function sumPlusSeparated(text) {
        const raw = String(text === null || text === undefined ? '' : text).trim();
        if (!raw || raw === '-' || raw === '---') return 0;
        return raw.split('+').reduce((sum, part) => sum + firstNumber(part), 0);
    }

    // Helpers / Drivers: "2 (400)" -> 400, "400" -> 400, "-" -> 0
    function laborCost(text) {
        const raw = String(text === null || text === undefined ? '' : text).trim();
        if (!raw || raw === '-') return 0;
        const inBrackets = raw.match(/\(\s*(\d[\d,]*(?:\.\d+)?)\s*\)/);
        if (inBrackets) return parseFloat(inBrackets[1].replace(/,/g, '')) || 0;
        return firstNumber(raw);
    }

    // ==========================================
    // 2. DATE HANDLING (date only, never time)
    // ==========================================
    function makeKey(y, m, d) {
        const yy = Number(y), mm = Number(m), dd = Number(d);
        if (!(yy >= 1900 && yy <= 2200 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31)) return '';
        return yy + '-' + String(mm).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
    }

    // Any stored date -> "YYYY-MM-DD" (or '' when it cannot be read).
    // Supports YYYY-MM-DD (a time part is ignored) and M/D/YYYY (D/M/YYYY when the first number is above 12).
    function toDateKey(value) {
        if (value === null || value === undefined) return '';
        const s = String(value).trim();
        if (!s) return '';
        let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (m) return makeKey(m[1], m[2], m[3]);
        m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);
        if (m) {
            const a = Number(m[1]), b = Number(m[2]);
            return (a > 12 && b <= 12) ? makeKey(m[3], b, a) : makeKey(m[3], a, b);
        }
        return '';
    }

    function parseLocalDate(value) {
        const key = toDateKey(value);
        if (!key) return null;
        const p = key.split('-').map(Number);
        return new Date(p[0], p[1] - 1, p[2], 0, 0, 0, 0);
    }

    function niceDate(key) {
        const d = parseLocalDate(key);
        return d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : key;
    }

    function periodText(start, end) {
        if (start && end) return niceDate(start) + '  \u2192  ' + niceDate(end);
        if (start) return 'From ' + niceDate(start);
        if (end) return 'Up to ' + niceDate(end);
        return 'All dates';
    }

    function inPeriod(dateValue, start, end) {
        if (!start && !end) return true;
        const key = toDateKey(dateValue);
        if (!key) return false;
        if (start && key < start) return false;
        if (end && key > end) return false;
        return true;
    }

    // ==========================================
    // 3. REPORT DATA (its own filter, its own state)
    // ==========================================
    function getFilters() {
        const startEl = $('reportStartDate');
        const endEl = $('reportEndDate');
        const typeEl = $('reportJobType');
        return {
            start: toDateKey(startEl ? startEl.value : ''),
            end: toDateKey(endEl ? endEl.value : ''),
            type: (typeEl && typeEl.value) || 'all'
        };
    }

    function readStored(key) {
        try {
            const parsed = JSON.parse(localStorage.getItem(key));
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    const sourceJobs = () => (Array.isArray(window.masterJobs) ? window.masterJobs : []);
    const sourceRentals = () => (Array.isArray(window.currentTruckRentals) ? window.currentTruckRentals : readStored(RENTALS_KEY));
    const sourceWarehouse = () => (Array.isArray(window.currentWarehouseRecords) ? window.currentWarehouseRecords : readStored(WAREHOUSE_KEY));

    const jobNoOf = (j) => String(j.jobNo || j.job_no || j.job_number || '').trim();
    const jobTotalOf = (j) => parseMoney(j.total || j.total_amount || 0);
    const jobDateOf = (j) => j.date || j.job_date || '';
    const isDeliveryJob = (j) => jobNoOf(j).toLowerCase().includes('delivery');

    function matchesJobType(j, type) {
        if (type === 'all') return true;
        const delivery = isDeliveryJob(j) || String(j.route || '').toLowerCase().includes('delivery');
        return type === 'delivery' ? delivery : !delivery;
    }

    function getReportData() {
        const f = getFilters();
        return {
            start: f.start,
            end: f.end,
            type: f.type,
            jobs: sourceJobs().filter((j) => inPeriod(jobDateOf(j), f.start, f.end) && matchesJobType(j, f.type)),
            rentals: sourceRentals().filter((r) => inPeriod(r.date, f.start, f.end)),
            warehouse: sourceWarehouse().filter((w) => inPeriod(w.date, f.start, f.end))
        };
    }

    // Truck rental / warehouse field readers (the records come straight from Supabase)
    const rentalLabel = (r) => r.truckLabel || r.truck_label || r.truckNo || r.truck_no || r.label || r.name || '-';
    const rentalPaidBy = (r) => r.paidBy || r.paid_by || '-';
    const rentalPayType = (r) => String(r.paymentType || r.payment_type || r.paymentMethod || r.payment_method || '');
    const rentalDays = (r) => parseInt(String(r.days !== undefined && r.days !== null ? r.days : (r.Days || '0')).replace(/[^0-9]/g, ''), 10) || 0;
    const warehousePayType = (w) => String(w.paymentType || w.payment_type || w.paymentMethod || w.payment_method || '');

    // ==========================================
    // 4. PAYMENT TEXT PARSING
    // ==========================================
    const METHOD_PATTERNS = [
        ['Cash', /(^|[^a-z])cash([^a-z]|$)/],
        ['Zelle', /(^|[^a-z])zelle([^a-z]|$)/],
        ['Others', /(^|[^a-z])(cheque|check|chq|ck)([^a-z]|$)/],
        ['PMO', /(^|[^a-z])pmo([^a-z]|$)/],
        ['BC', /(^|[^a-z])bc([^a-z]|$)/],
        ['PC', /(^|[^a-z])pc([^a-z]|$)/],
        ['CC', /(^|[^a-z])(cc|card)([^a-z]|$)/],
        ['WT', /(^|[^a-z])wt([^a-z]|$)/],
        ['Others', /(^|[^a-z])others?([^a-z]|$)/]
    ];

    function detectMethod(text) {
        const lower = String(text === null || text === undefined ? '' : text).toLowerCase();
        for (let i = 0; i < METHOD_PATTERNS.length; i++) {
            if (METHOD_PATTERNS[i][1].test(lower)) return METHOD_PATTERNS[i][0];
        }
        return 'Unspecified';
    }

    // "500 Cash, 300 Zelle" -> [{amount:500, method:'Cash'}, {amount:300, method:'Zelle'}]
    // A comma between digits ("1,200 Cash") is a thousands separator, not an entry separator.
    function parsePaymentEntries(text) {
        const raw = String(text === null || text === undefined ? '' : text).trim();
        if (!raw || raw === '-' || raw === '---' || raw.toUpperCase() === 'NULL') return [];
        return raw
            .split(/,(?!\d{3}(?:\D|$))|\//)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p) => ({ amount: firstNumber(p), method: detectMethod(p) }))
            .filter((e) => e.amount > 0);
    }

    // ==========================================
    // 5. SUMMARY NUMBERS
    // ==========================================
    function computeSummary(data) {
        const s = {
            jobs: data.jobs.length,
            deliveries: 0,
            revenue: 0,
            diesel: 0,
            hotel: 0,
            breakdown: { G: { n: 0, rev: 0 }, C: { n: 0, rev: 0 }, P: { n: 0, rev: 0 }, T: { n: 0, rev: 0 }, Other: { n: 0, rev: 0 } },
            payments: { Cash: 0, Zelle: 0, PMO: 0, BC: 0, PC: 0, CC: 0, WT: 0, Others: 0, Unspecified: 0 },
            official: { foreman: 0, helpers: 0, drivers: 0, cashDiesel: 0, cashPu: 0, cashDest: 0, pmoPu: 0, puOther: 0, destOther: 0, pmoDeliveries: 0, destZelle: 0, total: 0 },
            rental: { count: 0, days: 0, cash: 0, other: 0, total: 0 },
            warehouse: { count: 0, cash: 0, other: 0, total: 0 }
        };

        data.jobs.forEach((j) => {
            const total = jobTotalOf(j);
            const delivery = isDeliveryJob(j);
            const dieselText = j.diesel || j.diesel_expense || '';
            const hotelText = j.hotel || j.hotel_expense || '';

            s.revenue += total;
            s.official.total += total;
            s.official.foreman += total > 0 ? total * 0.1 : 0;
            s.official.helpers += laborCost(j.helpers || j.helpers_cost);
            s.official.drivers += laborCost(j.drivers || j.drivers_cost);

            s.diesel += sumPlusSeparated(dieselText);
            s.hotel += sumPlusSeparated(hotelText);
            String(dieselText).split('+').forEach((part) => {
                if (detectMethod(part) === 'Cash') s.official.cashDiesel += firstNumber(part);
            });

            if (delivery) {
                s.deliveries++;
            } else {
                // A job number belongs to G / C / P / T only when it is ONE letter followed by digits (G101, C205).
                // CANCEL 12, none, or an empty number are still counted, but under Other.
                const match = jobNoOf(j).toUpperCase().match(/^([A-Z])\d+/);
                const first = match ? match[1] : '';
                const bucket = ['G', 'C', 'P', 'T'].indexOf(first) !== -1 ? s.breakdown[first] : s.breakdown.Other;
                bucket.n++;
                bucket.rev += total;
            }

            const puEntries = parsePaymentEntries(j.pu || j.pu_payments);
            const destEntries = parsePaymentEntries(j.dest || j.destination || j.destination_payments);

            puEntries.forEach((e) => {
                s.payments[e.method] += e.amount;
                if (e.method === 'Cash') s.official.cashPu += e.amount;
                else if (e.method === 'PMO') {
                    s.official.pmoPu += e.amount;
                    if (delivery) s.official.pmoDeliveries += e.amount;
                } else s.official.puOther += e.amount;
            });

            destEntries.forEach((e) => {
                s.payments[e.method] += e.amount;
                if (e.method === 'Cash') s.official.cashDest += e.amount;
                else if (e.method === 'PMO') {
                    if (delivery) s.official.pmoDeliveries += e.amount;
                } else {
                    s.official.destOther += e.amount;
                    if (e.method === 'Zelle') s.official.destZelle += e.amount;
                }
            });
        });

        data.rentals.forEach((r) => {
            const amount = parseMoney(r.amount);
            s.rental.count++;
            s.rental.days += rentalDays(r);
            s.rental.total += amount;
            if (rentalPayType(r).toLowerCase().includes('cash')) s.rental.cash += amount;
            else s.rental.other += amount;
        });

        data.warehouse.forEach((w) => {
            const amount = parseMoney(w.amount);
            s.warehouse.count++;
            s.warehouse.total += amount;
            if (warehousePayType(w).toLowerCase().includes('cash')) s.warehouse.cash += amount;
            else s.warehouse.other += amount;
        });

        s.nonDeliveryJobs = Math.max(0, s.jobs - s.deliveries);
        s.categorizedJobs = Object.keys(s.breakdown).reduce((n, k) => n + s.breakdown[k].n, 0);
        s.categorizedRevenue = Object.keys(s.breakdown).reduce((n, k) => n + s.breakdown[k].rev, 0);
        // Total Expenses = Diesel + Hotel + Warehouse + Truck Rentals
        s.expenses = s.diesel + s.hotel + s.warehouse.total + s.rental.total;
        return s;
    }

    // ==========================================
    // 6. SUMMARY TABLES (screen)
    // ==========================================
    function breakdownHTML(s) {
        const b = s.breakdown;
        return `
        <div class="glass-panel p-5 rounded-2xl bg-white shadow-xs space-y-3 mb-4 w-full">
            <h3 class="font-bold text-surface-900 text-sm uppercase tracking-wide">Jobs Breakdown by Prefix (G, C, P, T & Others)</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-center border-collapse text-xs min-w-[700px]">
                    <thead>
                        <tr class="bg-surface-50 text-surface-700 uppercase text-[10px] tracking-wider border-b border-surface-200">
                            <th class="p-2.5 border-r">Category</th>
                            <th class="p-2.5 border-r text-primary-700 font-bold">G (${b.G.n})</th>
                            <th class="p-2.5 border-r text-info-700 font-bold">C (${b.C.n})</th>
                            <th class="p-2.5 border-r text-warning-700 font-bold">P (${b.P.n})</th>
                            <th class="p-2.5 border-r text-accent-700 font-bold">T (${b.T.n})</th>
                            <th class="p-2.5 border-r text-surface-600 font-bold">Other (${b.Other.n})</th>
                            <th class="p-2.5 bg-primary-600 text-white font-extrabold">Grand Total (${s.categorizedJobs})</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="font-bold text-xs">
                            <td class="p-3 border-r bg-surface-50 text-surface-800">Total Revenue</td>
                            <td class="p-3 border-r text-primary-600">${money(b.G.rev)}</td>
                            <td class="p-3 border-r text-info-600">${money(b.C.rev)}</td>
                            <td class="p-3 border-r text-warning-600">${money(b.P.rev)}</td>
                            <td class="p-3 border-r text-accent-600">${money(b.T.rev)}</td>
                            <td class="p-3 border-r text-surface-600">${money(b.Other.rev)}</td>
                            <td class="p-3 bg-primary-50 text-primary-800 font-extrabold text-sm">${money(s.categorizedRevenue)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    }

    function paymentHTML(s) {
        const p = s.payments;
        const grand = Object.keys(p).reduce((n, k) => n + p[k], 0);
        return `
        <div class="glass-panel p-5 rounded-2xl bg-white shadow-xs space-y-3 mb-4">
            <div>
                <h3 class="font-bold text-surface-900 text-base">Payment Methods Summary Breakdown</h3>
                <p class="text-xs text-surface-500">Detailed distribution of revenue from PU Payments and Destination Payments</p>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-center border-collapse text-xs min-w-[1000px]">
                    <thead>
                        <tr class="bg-surface-50 text-surface-700 uppercase text-[10px] tracking-wider border-b border-surface-200">
                            <th class="p-2 border-r">Cash</th>
                            <th class="p-2 border-r">Zelle</th>
                            <th class="p-2 border-r">PMO</th>
                            <th class="p-2 border-r">BC</th>
                            <th class="p-2 border-r">PC</th>
                            <th class="p-2 border-r">CC</th>
                            <th class="p-2 border-r">WT</th>
                            <th class="p-2 border-r">Others</th>
                            <th class="p-2 border-r">Unspecified</th>
                            <th class="p-2 bg-primary-600 text-white font-bold">Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="font-bold text-xs">
                            <td class="p-3 border-r text-primary-600">${money(p.Cash)}</td>
                            <td class="p-3 border-r text-info-600">${money(p.Zelle)}</td>
                            <td class="p-3 border-r text-accent-600">${money(p.PMO)}</td>
                            <td class="p-3 border-r text-extra1-600">${money(p.BC)}</td>
                            <td class="p-3 border-r text-extra2-600">${money(p.PC)}</td>
                            <td class="p-3 border-r text-extra3-600">${money(p.CC)}</td>
                            <td class="p-3 border-r text-highlight-600">${money(p.WT)}</td>
                            <td class="p-3 border-r text-warning-600">${money(p.Others)}</td>
                            <td class="p-3 border-r text-surface-600">${money(p.Unspecified)}</td>
                            <td class="p-3 bg-primary-50 text-primary-800 font-extrabold text-sm">${money(grand)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    }

    function officialHTML(s) {
        const o = s.official;
        return `
        <div class="space-y-6">
            <div class="bg-white rounded-2xl shadow-sm border border-surface-200/80 p-6 space-y-4 mt-6 print:p-2">
                <div class="border-b border-surface-100 pb-3 flex flex-wrap justify-between items-center gap-2">
                    <div>
                        <h3 class="text-sm font-bold text-surface-800">Official Period Financial Summary</h3>
                        <p class="text-[11px] text-surface-400">Labor fees, cash, Zelle, and PMO summary</p>
                    </div>
                </div>
                <div class="overflow-x-auto rounded-xl border border-surface-100">
                    <table class="w-full text-left border-collapse text-[11px]">
                        <thead>
                            <tr class="bg-surface-50 text-surface-600 uppercase font-bold border-b border-surface-200/80 text-[10px]">
                                <th class="p-2.5 border-r text-center">Foreman</th>
                                <th class="p-2.5 border-r text-center">Helpers</th>
                                <th class="p-2.5 border-r text-center">Drivers</th>
                                <th class="p-2.5 border-r text-center text-warning-700 bg-warning-50/50">Cash Diesel</th>
                                <th class="p-2.5 border-r text-center text-primary-700 bg-primary-50/30">Cash PU Payment</th>
                                <th class="p-2.5 border-r text-center text-primary-700 bg-primary-50/30">Cash Dest-Balance</th>
                                <th class="p-2.5 border-r text-center">PMO PU Payment</th>
                                <th class="p-2.5 border-r text-center text-info-700 bg-info-50/30">PU (No Cash/PMO)</th>
                                <th class="p-2.5 border-r text-center text-info-700 bg-info-50/30">Balance (No Cash/PMO)</th>
                                <th class="p-2.5 border-r text-center">PMO Deliveries</th>
                                <th class="p-2.5 border-r text-center text-accent-700 bg-accent-50/30">Dest Balance Zelle</th>
                                <th class="p-2.5 text-center bg-primary-600 text-white font-extrabold">Total After Deposit</th>
                            </tr>
                        </thead>
                        <tbody class="font-semibold text-surface-700 divide-y divide-surface-100">
                            <tr class="hover:bg-surface-50 transition-colors">
                                <td class="p-2.5 border-r text-center">${money(o.foreman)}</td>
                                <td class="p-2.5 border-r text-center">${money(o.helpers)}</td>
                                <td class="p-2.5 border-r text-center">${money(o.drivers)}</td>
                                <td class="p-2.5 border-r text-center text-warning-700 font-bold bg-warning-50/20">${money(o.cashDiesel)}</td>
                                <td class="p-2.5 border-r text-center text-primary-600 font-bold">${money(o.cashPu)}</td>
                                <td class="p-2.5 border-r text-center text-primary-600 font-bold">${money(o.cashDest)}</td>
                                <td class="p-2.5 border-r text-center">${money(o.pmoPu)}</td>
                                <td class="p-2.5 border-r text-center text-info-600 font-bold">${money(o.puOther)}</td>
                                <td class="p-2.5 border-r text-center text-info-600 font-bold">${money(o.destOther)}</td>
                                <td class="p-2.5 border-r text-center">${money(o.pmoDeliveries)}</td>
                                <td class="p-2.5 border-r text-center text-accent-600 font-bold">${money(o.destZelle)}</td>
                                <td class="p-2.5 border-r text-center bg-primary-50 text-primary-800 font-extrabold text-xs">${money(o.total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;
    }

    function smallSummaryHTML(opts) {
        return `
        <div class="bg-white rounded-2xl shadow-sm border border-surface-200/80 p-6 space-y-4 mt-6 print:p-2">
            <div class="border-b border-surface-100 pb-3 flex flex-wrap justify-between items-center gap-2">
                <div>
                    <h3 class="text-sm font-bold text-surface-800">${opts.title}</h3>
                    <p class="text-[11px] text-surface-400">${opts.subtitle}</p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-surface-700 bg-surface-100 px-3 py-1 rounded-xl">
                        Total Records: <span class="${opts.countClass}">${opts.count}</span>
                    </span>
                </div>
            </div>
            <div class="overflow-x-auto rounded-xl border border-surface-100">
                <table class="w-full text-left border-collapse text-[11px]">
                    <thead>
                        <tr class="bg-surface-50 text-surface-600 uppercase font-bold border-b border-surface-200/80 text-[10px]">
                            <th class="p-2.5 border-r text-center">${opts.firstHead}</th>
                            <th class="p-2.5 border-r text-center text-primary-700 bg-primary-50/30">Cash Payments</th>
                            <th class="p-2.5 border-r text-center text-info-700 bg-info-50/30">Other Payments</th>
                            <th class="p-2.5 text-center ${opts.totalHeadClass} text-white font-extrabold">Grand Total Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="font-semibold text-surface-700 ${opts.rowClass}">
                            <td class="p-2.5 border-r text-center font-bold">${opts.firstValue}</td>
                            <td class="p-2.5 border-r text-center text-primary-600 font-bold">${money(opts.cash)}</td>
                            <td class="p-2.5 border-r text-center text-info-600 font-bold">${money(opts.other)}</td>
                            <td class="p-2.5 text-center ${opts.totalValueClass} font-extrabold">${money(opts.total)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    }

    function rentalSummaryHTML(s) {
        return smallSummaryHTML({
            title: 'Private Truck Rental Financial Summary',
            subtitle: 'Summary of rental duration, cash payments, and total costs',
            count: s.rental.count, countClass: 'text-primary-600',
            firstHead: 'Total Days', firstValue: s.rental.days + ' Days',
            cash: s.rental.cash, other: s.rental.other, total: s.rental.total,
            totalHeadClass: 'bg-warning-600', rowClass: 'bg-warning-50/20', totalValueClass: 'text-warning-900'
        });
    }

    function warehouseSummaryHTML(s) {
        return smallSummaryHTML({
            title: 'Warehouse & Others Financial Summary',
            subtitle: 'Summary of warehouse expenses and operational costs',
            count: s.warehouse.count, countClass: 'text-accent-600',
            firstHead: 'Total Items', firstValue: s.warehouse.count + ' Items',
            cash: s.warehouse.cash, other: s.warehouse.other, total: s.warehouse.total,
            totalHeadClass: 'bg-accent-700', rowClass: 'bg-accent-50/20', totalValueClass: 'text-accent-900'
        });
    }

    // ==========================================
    // 7. DETAILED TABLES (shared by the Detailed page and the PDF)
    // ==========================================
    const JOB_COLS = [
        { h: 'Date' }, { h: 'Job No', b: 1 }, { h: 'From State' }, { h: 'To State' }, { h: 'Foreman Name' },
        { h: 'Foreman 10%', b: 1, tone: 'emerald' }, { h: 'Helpers' }, { h: 'Drivers' },
        { h: 'Diesel', b: 1, tone: 'amber' }, { h: 'Hotel', b: 1, tone: 'blue' },
        { h: 'Total After Deposit', b: 1, tone: 'emerald' }, { h: 'P.U Payment' }, { h: 'Dest Balance' }
    ];
    const RENTAL_COLS = [
        { h: 'Date' }, { h: 'Truck / Label', b: 1 }, { h: 'Days' }, { h: 'Paid By' },
        { h: 'Payment Type' }, { h: 'Amount', b: 1, tone: 'amber' }
    ];
    const WAREHOUSE_COLS = [
        { h: 'Date' }, { h: 'Category / Type', b: 1 }, { h: 'Description / Facility' },
        { h: 'Payment Method' }, { h: 'Amount', b: 1, tone: 'purple' }
    ];

    const displayDate = (value) => toDateKey(value) || String(value || '-');

    function jobCells(j) {
        const total = jobTotalOf(j);
        const route = routeParts(j);
        const helpers = j.helpers || j.helpers_cost;
        const drivers = j.drivers || j.drivers_cost;
        return [
            displayDate(jobDateOf(j)),
            jobNoOf(j) || '-',
            route[0],
            route[1],
            j.foreman || j.foremanName || j.foreman_name || '-',
            total > 0 ? money(total * 0.1) : '-',
            typeof window.parseHelpersDisplay === 'function' ? window.parseHelpersDisplay(helpers) : (helpers || '-'),
            typeof window.parseDriversDisplay === 'function' ? window.parseDriversDisplay(drivers) : (drivers || '-'),
            j.diesel || j.diesel_expense || '-',
            j.hotel || j.hotel_expense || '-',
            money(total),
            j.pu || j.pu_payments || '-',
            j.dest || j.destination || j.destination_payments || '-'
        ];
    }

    function routeParts(j) {
        const r = String(j.route || '');
        const arrow = r.indexOf('\u2192') !== -1 ? '\u2192' : (r.indexOf('->') !== -1 ? '->' : '');
        if (arrow) {
            const p = r.split(arrow);
            return [p[0].trim() || '-', (p[1] || '').trim() || '-'];
        }
        if (r.trim()) return [r.trim(), '-'];
        return [j.route_from || '-', j.route_to || '-'];
    }

    function rentalCells(r) {
        return [displayDate(r.date), rentalLabel(r), rentalDays(r) + ' Days', rentalPaidBy(r), rentalPayType(r) || '-', money(r.amount)];
    }

    function warehouseCells(w) {
        return [displayDate(w.date), w.services || w.category || '-', w.details || w.description || '-', warehousePayType(w) || '-', money(w.amount)];
    }

    function detailSections(data, s) {
        return [
            {
                key: 'jobs', title: '1. Dispatch Operations Detailed Records', subtitle: 'Detailed job operations, crew allocations, and revenues',
                badge: data.jobs.length + ' Jobs', tone: 'emerald', cols: JOB_COLS, rows: data.jobs.map(jobCells),
                footLabel: 'Total (' + data.jobs.length + ' records)', footSpan: 10, footValue: money(s.revenue), footTail: 2
            },
            {
                key: 'rentals', title: '2. Private Truck Rental Detailed Records', subtitle: 'External truck rentals inside the selected period',
                badge: data.rentals.length + ' Records', tone: 'amber', cols: RENTAL_COLS, rows: data.rentals.map(rentalCells),
                footLabel: 'Total (' + data.rentals.length + ' records)', footSpan: 5, footValue: money(s.rental.total), footTail: 0
            },
            {
                key: 'warehouse', title: '3. Warehouse & Expenses Detailed Records', subtitle: 'Facility costs, storage units and miscellaneous expenses',
                badge: data.warehouse.length + ' Records', tone: 'purple', cols: WAREHOUSE_COLS, rows: data.warehouse.map(warehouseCells),
                footLabel: 'Total (' + data.warehouse.length + ' records)', footSpan: 4, footValue: money(s.warehouse.total), footTail: 0
            }
        ];
    }

    const TONE_TEXT = { emerald: 'text-primary-700', amber: 'text-warning-700', blue: 'text-info-700', purple: 'text-accent-700' };
    const BADGE_CLASS = {
        emerald: 'text-primary-700 bg-primary-50 border-primary-200',
        amber: 'text-warning-700 bg-warning-50 border-warning-200',
        purple: 'text-accent-700 bg-accent-50 border-accent-200'
    };

    function screenSection(sec) {
        const head = sec.cols.map((c) => `<th class="p-3 border text-center${c.tone ? ' ' + TONE_TEXT[c.tone] : ''}">${esc(c.h)}</th>`).join('');
        const body = sec.rows.length
            ? sec.rows.map((cells) => `<tr class="hover:bg-surface-50 transition-colors text-surface-700 text-xs">${cells.map((v, i) => {
                const c = sec.cols[i];
                return `<td class="p-2.5 border-r text-center${c.b ? ' font-bold' : ''}${c.tone ? ' ' + TONE_TEXT[c.tone] : ''}">${esc(v)}</td>`;
            }).join('')}</tr>`).join('')
            : `<tr><td colspan="${sec.cols.length}" class="p-5 text-center text-surface-400">No records found in this period</td></tr>`;
        const foot = sec.rows.length
            ? `<tfoot><tr class="bg-primary-50 text-primary-800 font-extrabold text-xs">
                    <td colspan="${sec.footSpan}" class="p-2.5 text-right">${esc(sec.footLabel)}</td>
                    <td class="p-2.5 text-center">${esc(sec.footValue)}</td>
                    ${sec.footTail ? `<td colspan="${sec.footTail}"></td>` : ''}
               </tr></tfoot>`
            : '';
        return `
        <div class="glass-panel rounded-2xl overflow-hidden bg-white shadow-xs p-5 border border-surface-200 space-y-3 w-full">
            <div class="flex justify-between items-center border-b border-surface-100 pb-3">
                <div>
                    <h4 class="font-bold text-surface-800 text-sm">${esc(sec.title)}</h4>
                    <p class="text-[11px] text-surface-400">${esc(sec.subtitle)}</p>
                </div>
                <span class="text-xs font-bold ${BADGE_CLASS[sec.tone]} px-3 py-1 rounded-lg border">${esc(sec.badge)}</span>
            </div>
            <div class="overflow-x-auto w-full">
                <table class="w-full text-left text-xs border-collapse${sec.key === 'jobs' ? ' min-w-[1100px]' : ' min-w-[640px]'}">
                    <thead class="bg-surface-50 text-surface-600 uppercase text-[10px] font-bold border-b border-surface-200"><tr>${head}</tr></thead>
                    <tbody class="divide-y divide-surface-100">${body}</tbody>
                    ${foot}
                </table>
            </div>
        </div>`;
    }

    // ==========================================
    // 8. SCREEN RENDERING
    // ==========================================
    function setText(id, value) {
        const el = $(id);
        if (el) el.innerText = value;
    }

    function setHTML(id, html) {
        const el = $(id);
        if (el) el.innerHTML = html;
    }

    function renderCards(s) {
        setText('sumTotalJobs', s.nonDeliveryJobs);
        setText('sumTotalDeliveries', s.deliveries);
        setText('sumTotalRevenue', money(s.revenue));
        setText('sumTotalExpenses', money(s.expenses));
    }

    function renderSummary(s) {
        setHTML('monthlyRevenueContainer', breakdownHTML(s));
        setHTML('paymentSummaryContainer', paymentHTML(s));
        setHTML('summaryReportContainer', officialHTML(s));
        const truckId = $('truckRentalPDFSummarySection') ? 'truckRentalPDFSummarySection' : 'truckRentalSummaryContainer';
        setHTML(truckId, rentalSummaryHTML(s));
        setHTML('warehousePDFSummarySection', warehouseSummaryHTML(s));
    }

    function renderDetailed(data, s) {
        const host = $('detailedReportContainer') || $('detailedReportView');
        if (!host) return;
        host.innerHTML = `
            <div class="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-surface-500">
                <span><i class="fa-regular fa-calendar mr-1.5 text-primary-600"></i>Period: <span class="text-surface-800">${esc(periodText(data.start, data.end))}</span></span>
                <span class="text-surface-400">${data.jobs.length} jobs &middot; ${data.rentals.length} rentals &middot; ${data.warehouse.length} warehouse records</span>
            </div>
            ${detailSections(data, s).map(screenSection).join('')}`;
    }

    function activeMode() {
        const detailed = $('detailedReportView');
        return detailed && !detailed.classList.contains('hidden') ? 'detailed' : 'summary';
    }

    function renderActive(mode) {
        const data = getReportData();
        const s = computeSummary(data);
        renderCards(s);
        if (mode === 'detailed') renderDetailed(data, s);
        else renderSummary(s);
    }

    function switchReportMode(mode) {
        const summaryView = $('summaryReportView');
        const detailedView = $('detailedReportView');
        const btnSummary = $('btnSummaryMode');
        const btnDetailed = $('btnDetailedMode');
        if (!summaryView || !detailedView) return;

        const on = 'px-4 py-2 text-xs font-semibold rounded-lg bg-primary-600 text-white transition cursor-pointer';
        const off = 'px-4 py-2 text-xs font-semibold rounded-lg bg-surface-100 text-surface-600 hover:bg-surface-200 transition cursor-pointer';

        if (mode === 'detailed') {
            summaryView.classList.add('hidden');
            detailedView.classList.remove('hidden');
            if (btnDetailed) btnDetailed.className = on;
            if (btnSummary) btnSummary.className = off;
        } else {
            mode = 'summary';
            summaryView.classList.remove('hidden');
            detailedView.classList.add('hidden');
            if (btnSummary) btnSummary.className = on;
            if (btnDetailed) btnDetailed.className = off;
        }
        renderActive(mode);
    }

    function applyReportFilters() {
        renderActive(activeMode());
    }

    function resetReportFilters() {
        const startEl = $('reportStartDate');
        const endEl = $('reportEndDate');
        if (startEl) startEl.value = '';
        if (endEl) endEl.value = '';
        renderActive(activeMode());
    }

    // Fresh truck rental / warehouse data each time the Reports tab opens
    async function refreshSources() {
        try {
            if (typeof window.loadPrivateTruckRentals === 'function') await window.loadPrivateTruckRentals();
            else if (typeof window.loadTruckRentals === 'function') await window.loadTruckRentals();
        } catch (e) { console.error('Reports: truck rentals not refreshed', e); }
        try {
            if (typeof window.loadWarehouseData === 'function') await window.loadWarehouseData();
            else if (typeof window.loadWarehouseRecords === 'function') await window.loadWarehouseRecords();
        } catch (e) { console.error('Reports: warehouse records not refreshed', e); }
    }

    async function renderReportsTab() {
        switchReportMode('summary');
        await refreshSources();
        renderActive(activeMode());
    }

    // ==========================================
    // 9. PDF (Summary first, then Detailed - same period)
    // ==========================================
    // All PDF colors come from theme.js
    const T = window.themeColor;
    const TINT = window.PDF_TINTS;
    const PDF_CSS = `
        :root { --ink:${T('surface', 900)}; --muted:${T('surface', 500)}; --line:${T('surface', 200)}; --soft:${T('surface', 50)}; --brand:${T('primary', 700)}; --brand-dark:${T('primary', 900)}; --brand-soft:${T('primary', 50)}; }
        @page { size: A4 landscape; margin: 9mm; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body { font-family: "Segoe UI", Inter, system-ui, -apple-system, Arial, sans-serif; color: var(--ink); font-size: 10px; line-height: 1.4;
               background: linear-gradient(150deg, ${TINT.backgroundStart} 0%, ${TINT.backgroundMiddle} 55%, ${TINT.backgroundEnd} 100%);
               -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .hero { background: linear-gradient(120deg, ${T('primary', 900)} 0%, ${T('primary', 700)} 60%, ${T('primary', 500)} 130%); color: #fff; border-radius: 12px; padding: 16px 20px;
                display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
        .brand { font-size: 9px; letter-spacing: .22em; text-transform: uppercase; opacity: .8; font-weight: 700; }
        .hero h1 { margin: 3px 0 0; font-size: 21px; font-weight: 800; letter-spacing: -.01em; }
        .hero .period { text-align: right; }
        .hero .period .lbl { font-size: 8.5px; letter-spacing: .16em; text-transform: uppercase; opacity: .75; font-weight: 700; }
        .hero .period .val { font-size: 14px; font-weight: 800; margin-top: 2px; }
        .hero .period .meta { font-size: 8.5px; opacity: .75; margin-top: 3px; }
        .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 12px 0 4px; }
        .kpi { border: 1px solid ${T('surface', 300, 0.7)}; border-left: 4px solid var(--brand); border-radius: 10px; padding: 9px 12px; background: rgba(255, 255, 255, 0.82); }
        .kpi .l { font-size: 8px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); font-weight: 700; }
        .kpi .v { font-size: 19px; font-weight: 800; margin-top: 2px; letter-spacing: -.01em; }
        .kpi.blue { border-left-color: ${T('info', 600)}; } .kpi.amber { border-left-color: ${T('warning', 600)}; } .kpi.rose { border-left-color: ${T('alert', 600)}; }
        .sec { display: flex; align-items: center; gap: 8px; margin: 16px 0 8px; font-size: 12.5px; font-weight: 800; color: var(--brand-dark); }
        .sec::before { content: ""; width: 4px; height: 15px; border-radius: 2px; background: ${T('primary', 500)}; }
        .sec small { font-size: 9px; color: var(--muted); font-weight: 600; margin-left: 4px; }
        .card { border: 1px solid ${T('surface', 300, 0.7)}; border-radius: 10px; padding: 9px 11px 6px; margin-bottom: 10px; background: rgba(255, 255, 255, 0.82); break-inside: avoid; page-break-inside: avoid; }
        .card h3 { margin: 0 0 6px; font-size: 10px; font-weight: 800; color: ${T('surface', 700)}; letter-spacing: .02em; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 9px; }
        thead { display: table-header-group; }
        tfoot { display: table-row-group; }
        tr { break-inside: avoid; page-break-inside: avoid; }
        th { background: ${T('surface', 100)}; color: ${T('surface', 700)}; font-weight: 800; font-size: 7.6px; text-transform: uppercase; letter-spacing: .04em;
             padding: 6px 4px; border-bottom: 1.5px solid ${T('surface', 300)}; text-align: center; }
        td { padding: 5px 4px; border-bottom: 1px solid ${TINT.rowLine}; text-align: center; }
        tbody tr:nth-child(even) td { background: ${TINT.rowStripe}; }
        td.b { font-weight: 700; }
        .t-emerald { color: ${T('primary', 700)}; } .t-amber { color: ${T('warning', 700)}; } .t-blue { color: ${T('info', 700)}; } .t-purple { color: ${T('accent', 700)}; }
        th.hl { background: var(--brand); color: #fff; border-bottom-color: var(--brand); }
        td.hl { background: var(--brand-soft) !important; color: ${T('primary', 800)}; font-weight: 800; }
        tfoot td { background: var(--brand-soft); color: ${T('primary', 800)}; font-weight: 800; border-top: 1.5px solid ${T('primary', 200)}; border-bottom: none; padding: 6px 4px; }
        td.r { text-align: right; padding-right: 10px; }
        .empty { text-align: center; color: var(--muted); padding: 14px; font-size: 10px; }
        .pagebreak { break-before: page; page-break-before: always; }
        .foot { margin-top: 14px; padding-top: 6px; border-top: 1px solid var(--line); color: var(--muted); font-size: 8px; display: flex; justify-content: space-between; }
    `;

    function pdfTable(cols, rowsHtml) {
        return `<table><thead><tr>${cols}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
    }

    function pdfDetailSection(sec) {
        const head = sec.cols.map((c) => `<th>${esc(c.h)}</th>`).join('');
        const rows = sec.rows.length
            ? sec.rows.map((cells) => `<tr>${cells.map((v, i) => {
                const c = sec.cols[i];
                const cls = [c.b ? 'b' : '', c.tone ? 't-' + c.tone : ''].filter(Boolean).join(' ');
                return `<td${cls ? ' class="' + cls + '"' : ''}>${esc(v)}</td>`;
            }).join('')}</tr>`).join('')
            : `<tr><td colspan="${sec.cols.length}" class="empty">No records found in this period</td></tr>`;
        const foot = sec.rows.length
            ? `<tfoot><tr><td colspan="${sec.footSpan}" class="r">${esc(sec.footLabel)}</td><td>${esc(sec.footValue)}</td>${sec.footTail ? `<td colspan="${sec.footTail}"></td>` : ''}</tr></tfoot>`
            : '';
        return `
            <div class="sec">${esc(sec.title)}<small>${esc(sec.badge)}</small></div>
            <table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody>${foot}</table>`;
    }

    function buildPdfHTML(data, s) {
        const b = s.breakdown, p = s.payments, o = s.official;
        const paymentTotal = Object.keys(p).reduce((n, k) => n + p[k], 0);
        const typeLabel = { all: '', delivery: 'Deliveries only', moving: 'Moving jobs only' }[data.type] || '';
        const generated = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

        const breakdown = `
            <div class="card"><h3>Jobs Breakdown by Prefix</h3>
            ${pdfTable(
                `<th>Category</th><th class="t-emerald">G (${b.G.n})</th><th class="t-blue">C (${b.C.n})</th><th class="t-amber">P (${b.P.n})</th><th class="t-purple">T (${b.T.n})</th><th>Other (${b.Other.n})</th><th class="hl">Grand Total (${s.categorizedJobs})</th>`,
                `<tr><td class="b">Total Revenue</td><td>${money(b.G.rev)}</td><td>${money(b.C.rev)}</td><td>${money(b.P.rev)}</td><td>${money(b.T.rev)}</td><td>${money(b.Other.rev)}</td><td class="hl">${money(s.categorizedRevenue)}</td></tr>`
            )}</div>`;

        const payments = `
            <div class="card"><h3>Payment Methods Summary (PU Payments + Destination Payments)</h3>
            ${pdfTable(
                ['Cash', 'Zelle', 'PMO', 'BC', 'PC', 'CC', 'WT', 'Others', 'Unspecified'].map((n) => `<th>${n}</th>`).join('') + '<th class="hl">Total Amount</th>',
                `<tr>${['Cash', 'Zelle', 'PMO', 'BC', 'PC', 'CC', 'WT', 'Others', 'Unspecified'].map((n) => `<td>${money(p[n])}</td>`).join('')}<td class="hl">${money(paymentTotal)}</td></tr>`
            )}</div>`;

        const official = `
            <div class="card"><h3>Official Period Financial Summary</h3>
            ${pdfTable(
                `<th>Foreman 10%</th><th>Helpers</th><th>Drivers</th><th>Cash Diesel</th><th>Cash PU</th><th>Cash Dest</th><th>PMO PU</th><th>PU (No Cash/PMO)</th><th>Balance (No Cash/PMO)</th><th>PMO Deliveries</th><th>Dest Zelle</th><th class="hl">Total After Deposit</th>`,
                `<tr><td>${money(o.foreman)}</td><td>${money(o.helpers)}</td><td>${money(o.drivers)}</td><td>${money(o.cashDiesel)}</td><td>${money(o.cashPu)}</td><td>${money(o.cashDest)}</td><td>${money(o.pmoPu)}</td><td>${money(o.puOther)}</td><td>${money(o.destOther)}</td><td>${money(o.pmoDeliveries)}</td><td>${money(o.destZelle)}</td><td class="hl">${money(o.total)}</td></tr>`
            )}</div>`;

        const rental = `
            <div class="card"><h3>Private Truck Rental Summary (${s.rental.count} records)</h3>
            ${pdfTable(
                `<th>Total Days</th><th>Cash Payments</th><th>Other Payments</th><th class="hl">Grand Total</th>`,
                `<tr><td>${s.rental.days} Days</td><td>${money(s.rental.cash)}</td><td>${money(s.rental.other)}</td><td class="hl">${money(s.rental.total)}</td></tr>`
            )}</div>`;

        const warehouse = `
            <div class="card"><h3>Warehouse & Others Summary (${s.warehouse.count} records)</h3>
            ${pdfTable(
                `<th>Total Items</th><th>Cash Payments</th><th>Other Payments</th><th class="hl">Grand Total</th>`,
                `<tr><td>${s.warehouse.count} Items</td><td>${money(s.warehouse.cash)}</td><td>${money(s.warehouse.other)}</td><td class="hl">${money(s.warehouse.total)}</td></tr>`
            )}</div>`;

        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Wathek - Financial & Operations Report</title>
<style>${PDF_CSS}</style>
</head>
<body>
    <div class="hero">
        <div>
            <div class="brand">Wathek</div>
            <h1>Financial &amp; Operations Report</h1>
        </div>
        <div class="period">
            <div class="lbl">Report period</div>
            <div class="val">${esc(periodText(data.start, data.end))}</div>
            <div class="meta">${typeLabel ? esc(typeLabel) + ' &middot; ' : ''}Generated ${esc(generated)}</div>
        </div>
    </div>

    <div class="kpis">
        <div class="kpi"><div class="l">Total Jobs</div><div class="v">${s.nonDeliveryJobs}</div></div>
        <div class="kpi blue"><div class="l">Total Deliveries</div><div class="v">${s.deliveries}</div></div>
        <div class="kpi"><div class="l">Total Revenue</div><div class="v t-emerald">${money(s.revenue)}</div></div>
        <div class="kpi rose"><div class="l">Total Expenses</div><div class="v" style="color:${T('alert', 700)}">${money(s.expenses)}</div>
            <div style="font-size:7.5px;color:${T('surface', 500)};margin-top:1px">Diesel ${money(s.diesel)} &middot; Hotel ${money(s.hotel)} &middot; Rentals ${money(s.rental.total)} &middot; Warehouse ${money(s.warehouse.total)}</div></div>
    </div>

    <div class="sec">Summary</div>
    ${breakdown}
    ${payments}
    ${official}
    <div class="grid2">${rental}${warehouse}</div>

    <div class="pagebreak"></div>
    <div class="sec" style="margin-top:0">Detailed Records<small>${esc(periodText(data.start, data.end))}</small></div>
    ${detailSections(data, s).map(pdfDetailSection).join('')}

    <div class="foot"><span>Wathek &middot; Enterprise Moving &amp; Logistics Management</span><span>${esc(periodText(data.start, data.end))}</span></div>
    <script>
        window.onload = function () { setTimeout(function () { window.print(); }, 400); };
    <\/script>
</body>
</html>`;
    }

    function exportOfficialPDF() {
        const data = getReportData();
        const s = computeSummary(data);
        // Open the report as a real page (blob URL) instead of writing into an empty
        // "about:blank" window: phone browsers often print that empty window as a blank page.
        const blob = new Blob([buildPdfHTML(data, s)], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (!printWindow) {
            URL.revokeObjectURL(url);
            alert('The PDF window was blocked by the browser. Please allow pop-ups for this site and try again.');
            return;
        }
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    }

    // ==========================================
    // 10. EXPORTS (names used by the other files)
    // ==========================================
    window.parseCurrency = parseMoney;
    window.formatCleanNumber = fmt;
    window.parseLocalDate = parseLocalDate;
    window.switchReportMode = switchReportMode;
    window.applyReportFilters = applyReportFilters;
    window.filterReportData = applyReportFilters;
    window.resetReportFilters = resetReportFilters;
    window.renderReportsTab = renderReportsTab;
    window.exportOfficialPDF = exportOfficialPDF;
    window.updateOfficialReportSummaryCards = function () { renderCards(computeSummary(getReportData())); };
    window.generateSummaryReportData = function () { renderActive('summary'); };
    window.populateSummaryTables = function () { renderActive('summary'); };
    window.generateDetailedReportData = function () { renderActive('detailed'); };
    window.renderMonthlyTableWrapper = function () { setHTML('monthlyRevenueContainer', breakdownHTML(computeSummary(getReportData()))); };
    window.generateMonthlyRevenueTableHTML = function () { return breakdownHTML(computeSummary(getReportData())); };
    window.generatePaymentMethodSummaryTableHTML = function () { return paymentHTML(computeSummary(getReportData())); };
    window.generateOfficialSummaryTable = function () { return officialHTML(computeSummary(getReportData())); };
    window.generateTruckRentalSummaryTableHTML = function () {
        const s = computeSummary(getReportData());
        return { count: s.rental.count, totalDays: s.rental.days, sumCash: s.rental.cash, sumOther: s.rental.other, grandTotal: s.rental.total, html: rentalSummaryHTML(s) };
    };
    window.generateWarehouseSummaryTableHTML = function () {
        const s = computeSummary(getReportData());
        return { count: s.warehouse.count, sumCash: s.warehouse.cash, sumOthers: s.warehouse.other, grandTotal: s.warehouse.total, html: warehouseSummaryHTML(s) };
    };

    // Test hook (not used by the app)
    window.__reportsInternals = { toDateKey: toDateKey, getReportData: getReportData, computeSummary: computeSummary, buildPdfHTML: buildPdfHTML };
})();
