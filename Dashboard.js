/**
 * Wathek - Dashboard & Analytics Module
 *
 * This file is the only place that calculates the dashboard
 * (the old copy inside app.js was removed, because it silently overrode this file).
 *
 * - Every registered job is counted (cancelled jobs are orders that were registered).
 * - Payment Channels Mix = the amounts actually paid (PU Payments + Destination Payments) per payment method.
 * - Every text on the dashboard comes from the data.
 */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);

    if (typeof window.revenueChartInstance === 'undefined') window.revenueChartInstance = null;
    if (typeof window.paymentMixChartInstance === 'undefined') window.paymentMixChartInstance = null;

    // ==========================================
    // 1. HELPERS
    // ==========================================
    function esc(value) {
        return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function firstNumber(text) {
        const m = String(text === null || text === undefined ? '' : text).match(/\d[\d,]*(?:\.\d+)?/);
        return m ? (parseFloat(m[0].replace(/,/g, '')) || 0) : 0;
    }

    function parseMoney(value) {
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        return firstNumber(value);
    }

    function sumPlusSeparated(text) {
        const raw = String(text === null || text === undefined ? '' : text).trim();
        if (!raw || raw === '-' || raw === '---') return 0;
        return raw.split('+').reduce((sum, part) => sum + firstNumber(part), 0);
    }

    const money = (value) => '$' + Math.round(value).toLocaleString('en-US');
    const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

    const PAYMENT_KEYS = ['Cash', 'Zelle', 'Cheque', 'PMO', 'BC', 'PC', 'CC', 'WT', 'Others', 'Unspecified'];
    const METHOD_PATTERNS = [
        ['Cash', /(^|[^a-z])cash([^a-z]|$)/],
        ['Zelle', /(^|[^a-z])zelle([^a-z]|$)/],
        ['Cheque', /(^|[^a-z])(cheque|check|chq|ck)([^a-z]|$)/],
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
    // 2. NUMBERS
    // ==========================================
    function emptyPayments() {
        const map = {};
        PAYMENT_KEYS.forEach((k) => { map[k] = 0; });
        return map;
    }

    function jobRoute(job) {
        const route = String(job.route || (job.route_from && job.route_to ? job.route_from + ' \u2192 ' + job.route_to : '')).trim();
        // a route made only of arrows / spaces / dashes is an empty route
        return route.replace(/[\s\u2192\-]|->/g, '') ? route : '';
    }

    function compute(jobs) {
        const r = {
            jobs: 0,
            revenue: 0,
            diesel: 0,
            routes: {},
            foremen: {},
            payments: emptyPayments(),
            monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        };

        (jobs || []).forEach((job) => {
            const total = parseMoney(job.total || job.total_amount || 0);
            r.jobs++;
            r.revenue += total;
            r.diesel += sumPlusSeparated(job.diesel || job.diesel_expense);

            const month = Number(job.month);
            if (month >= 1 && month <= 12) r.monthly[month - 1] += total;

            const route = jobRoute(job);
            if (route) r.routes[route] = (r.routes[route] || 0) + total;

            const foreman = String(job.foreman || job.foremanName || job.foreman_name || '').trim();
            if (foreman && foreman !== '-') {
                if (!r.foremen[foreman]) r.foremen[foreman] = { revenue: 0, jobs: 0 };
                r.foremen[foreman].revenue += total;
                r.foremen[foreman].jobs++;
            }

            parsePaymentEntries(job.pu || job.pu_payments)
                .concat(parsePaymentEntries(job.dest || job.destination || job.destination_payments))
                .forEach((e) => { r.payments[e.method] += e.amount; });
        });

        r.paymentsTotal = PAYMENT_KEYS.reduce((n, k) => n + r.payments[k], 0);
        return r;
    }

    // ==========================================
    // 3. SCREEN
    // ==========================================
    function setText(id, value) {
        const el = $(id);
        if (el) el.innerText = value;
    }

    function topEntry(map, valueOf) {
        let bestKey = null;
        let bestValue = 0;
        Object.keys(map).forEach((k) => {
            const v = valueOf(map[k]);
            if (bestKey === null || v > bestValue) { bestKey = k; bestValue = v; }
        });
        return bestKey === null ? null : { key: bestKey, value: bestValue };
    }

    function renderInsights(r) {
        const route = topEntry(r.routes, (v) => v);
        setText('insightRouteText', route
            ? route.key + ' leads with ' + money(route.value) + ' (' + percent(route.value, r.revenue) + '% of revenue).'
            : 'No route data yet.');

        setText('insightFuelText', r.revenue > 0
            ? 'Diesel is ' + percent(r.diesel, r.revenue) + '% of revenue (' + money(r.diesel) + ' of ' + money(r.revenue) + ').'
            : 'No revenue recorded yet.');

        const recorded = {};
        PAYMENT_KEYS.filter((k) => k !== 'Unspecified').forEach((k) => { recorded[k] = r.payments[k]; });
        const channel = topEntry(recorded, (v) => v);
        setText('insightPaymentText', channel && channel.value > 0
            ? channel.key + ' leads payments with ' + money(channel.value) + ' (' + percent(channel.value, r.paymentsTotal) + '% of ' + money(r.paymentsTotal) + ' collected).'
            : 'No payments recorded yet.');

        const foreman = topEntry(r.foremen, (v) => v.revenue);
        setText('insightForemanText', foreman
            ? foreman.key + ' leads with ' + money(foreman.value) + ' across ' + r.foremen[foreman.key].jobs + (r.foremen[foreman.key].jobs === 1 ? ' job.' : ' jobs.')
            : 'No foreman recorded yet.');
    }

    function renderCorridors(r) {
        const box = $('topCorridorsContainer');
        if (!box) return;
        const sorted = Object.keys(r.routes)
            .map((k) => [k, r.routes[k]])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);

        if (!sorted.length) {
            box.innerHTML = '<p class="text-slate-400 text-xs">No route data available</p>';
            return;
        }
        box.innerHTML = sorted.map((item, idx) => `
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div class="flex items-center space-x-2 min-w-0">
                    <span class="w-5 h-5 shrink-0 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center">${idx + 1}</span>
                    <span class="font-bold text-emerald-800 truncate">${esc(item[0])}</span>
                </div>
                <span class="font-extrabold text-slate-900 ml-3">${money(item[1])}</span>
            </div>`).join('');
    }

    function renderCards(r) {
        const jobsLabel = r.jobs + (r.jobs === 1 ? ' Job' : ' Jobs');
        setText('dashTotalRevenue', money(r.revenue));
        const jobsEl = $('dashCompletedJobsText');
        if (jobsEl) jobsEl.innerHTML = '<i class="fa-solid fa-truck-fast mr-1.5"></i>' + jobsLabel;
        setText('dashAvgJobValue', money(r.jobs > 0 ? r.revenue / r.jobs : 0));
        setText('dashAvgNote', 'Across ' + jobsLabel.toLowerCase());
        setText('dashTotalDiesel', money(r.diesel));
        setText('dashChartBadge', jobsLabel.toLowerCase());
        setText('dashLastUpdated', 'Updated ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }

    async function checkDatabaseStatus() {
        const valueEl = $('dashDbStatus');
        const dotEl = $('dashDbDot');
        if (!valueEl) return;
        let connected = false;
        try {
            if (window.supabaseClient) {
                const result = await window.supabaseClient.from('jobs_report').select('id', { head: true, count: 'exact' });
                connected = !result.error;
            }
        } catch (e) {
            connected = false;
        }
        valueEl.innerText = connected ? 'Connected' : 'Offline';
        valueEl.className = 'text-2xl font-black mt-1 ' + (connected ? 'text-emerald-600' : 'text-rose-600');
        if (dotEl) dotEl.className = 'w-1.5 h-1.5 rounded-full mr-1 ' + (connected ? 'bg-emerald-500 animate-ping' : 'bg-rose-500');
    }

    function updateDashboardAnalytics() {
        try {
            const jobs = Array.isArray(window.masterJobs) ? window.masterJobs : [];
            const r = compute(jobs);
            renderCards(r);
            renderCorridors(r);
            renderInsights(r);
            renderDashboardCharts(r.monthly, r.payments);
            checkDatabaseStatus();
        } catch (e) {
            console.error('Error updating dashboard analytics:', e);
        }
    }

    // ==========================================
    // 4. CHARTS
    // ==========================================
    function renderDashboardCharts(monthlyData, paymentData) {
        if (typeof Chart === 'undefined') return;

        const ctxRevenue = $('revenueChart');
        if (ctxRevenue) {
            if (window.revenueChartInstance) window.revenueChartInstance.destroy();
            window.revenueChartInstance = new Chart(ctxRevenue, {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                        label: 'Monthly Revenue ($)',
                        data: monthlyData,
                        backgroundColor: 'rgba(5, 150, 105, 0.85)',
                        borderRadius: 8,
                        hoverBackgroundColor: '#047857'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
                        x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                    }
                }
            });
        }

        const ctxPayment = $('paymentMixChart');
        if (ctxPayment) {
            if (window.paymentMixChartInstance) window.paymentMixChartInstance.destroy();
            const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#6366f1', '#84cc16', '#64748b', '#cbd5e1'];
            window.paymentMixChartInstance = new Chart(ctxPayment, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(paymentData),
                    datasets: [{ data: Object.values(paymentData), backgroundColor: colors, borderWidth: 2, borderColor: '#ffffff' }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } },
                    cutout: '65%'
                }
            });
        }
    }

    window.updateDashboardAnalytics = updateDashboardAnalytics;
    window.renderDashboardCharts = renderDashboardCharts;
    window.__dashboardInternals = { compute: compute };
})();
