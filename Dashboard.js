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

    const PAYMENT_KEYS = ['Cash', 'Zelle', 'PMO', 'BC', 'PC', 'CC', 'WT', 'CashApp', 'Others', 'Unspecified'];
    const METHOD_PATTERNS = [
        ['CashApp', /(^|[^a-z])cashapp([^a-z]|$)/],
        ['Cash', /(^|[^a-z])cash([^a-z]|$)/],
        ['Zelle', /(^|[^a-z])zelle([^a-z]|$)/],
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
            deliveries: 0,
            deliveryRevenue: 0,
            revenue: 0,
            diesel: 0,
            routes: {},
            foremen: {},
            payments: emptyPayments(),
            monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        };

        (jobs || []).forEach((job) => {
            // Revenue = money collected on the job: PU Payments + Dest Balance (deliveries included)
            const entries = parsePaymentEntries(job.pu || job.pu_payments)
                .concat(parsePaymentEntries(job.dest || job.destination || job.destination_payments));
            const total = entries.reduce((n, e) => n + e.amount, 0);
            r.jobs++;
            if (String(job.jobNo || job.job_no || '').toLowerCase().includes('delivery')) {
                r.deliveries++;
                r.deliveryRevenue += total;
            }
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

            entries.forEach((e) => { r.payments[e.method] += e.amount; });
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
            box.innerHTML = '<p class="text-surface-400 text-xs">No route data available</p>';
            return;
        }
        box.innerHTML = sorted.map((item, idx) => `
            <div class="flex items-center justify-between p-3 bg-surface-50 rounded-xl border border-surface-100">
                <div class="flex items-center space-x-2 min-w-0">
                    <span class="w-5 h-5 shrink-0 rounded-full bg-primary-100 text-primary-700 font-bold text-[10px] flex items-center justify-center">${idx + 1}</span>
                    <span class="font-bold text-primary-800 truncate">${esc(item[0])}</span>
                </div>
                <span class="font-extrabold text-surface-900 ml-3">${money(item[1])}</span>
            </div>`).join('');
    }

    function renderCards(r) {
        const jobsLabel = r.jobs + (r.jobs === 1 ? ' Job' : ' Jobs');
        const regular = r.jobs - r.deliveries;
        setText('dashTotalRevenue', money(r.revenue));
        const jobsEl = $('dashCompletedJobsText');
        if (jobsEl) {
            jobsEl.innerHTML = '<i class="fa-solid fa-truck-fast mr-1.5"></i>' +
                regular + ' Jobs (' + money(r.revenue - r.deliveryRevenue) + ') + ' +
                r.deliveries + ' Deliveries (' + money(r.deliveryRevenue) + ')';
        }
        setText('dashAvgJobValue', money(r.jobs > 0 ? r.revenue / r.jobs : 0));
        setText('dashAvgNote', 'Revenue ÷ ' + r.jobs + ' (jobs & deliveries)');
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
        valueEl.className = 'text-2xl font-black mt-1 ' + (connected ? 'text-primary-600' : 'text-alert-600');
        if (dotEl) dotEl.className = 'w-1.5 h-1.5 rounded-full mr-1 ' + (connected ? 'bg-primary-500 animate-ping' : 'bg-alert-500');
    }


    // ==========================================
    // 3b. ALERTS & TIPS (from the real job data, last 60 days)
    // ==========================================
    const ALERT_DAYS = 60;

    function parseJobDate(text) {
        const raw = String(text || '').trim().split(' ')[0];
        let m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
        m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return null;
    }

    const hasLaborText = (v) => { const t = String(v === null || v === undefined ? '' : v).trim(); return t !== '' && t !== '-' && t !== '0'; };
    const jobNoText = (j) => String(j.jobNo || j.job_no || '').trim() || 'No job number';
    const listNos = (jobs) => jobs.slice(0, 5).map((j) => jobNoText(j)).join(', ') + (jobs.length > 5 ? ' and ' + (jobs.length - 5) + ' more' : '');

    function buildAlerts(jobs) {
        const since = new Date();
        since.setDate(since.getDate() - ALERT_DAYS);
        since.setHours(0, 0, 0, 0);
        const recent = (jobs || []).filter((j) => {
            const d = parseJobDate(j.date);
            return d && d >= since;
        });

        const alerts = [];
        const isDelivery = (j) => jobNoText(j).toLowerCase().includes('delivery') || String(j.route || '').toLowerCase().includes('delivery');

        // 1. Payments with no method
        let collected = 0;
        let unspecified = 0;
        const unspecifiedJobs = [];
        recent.forEach((j) => {
            const entries = parsePaymentEntries(j.pu || j.pu_payments).concat(parsePaymentEntries(j.dest || j.destination || j.destination_payments));
            let jobUnspecified = 0;
            entries.forEach((e) => { collected += e.amount; if (e.method === 'Unspecified') jobUnspecified += e.amount; });
            if (jobUnspecified > 0) { unspecified += jobUnspecified; unspecifiedJobs.push(j); }
        });
        if (collected > 0 && percent(unspecified, collected) >= 5) {
            alerts.push({
                level: 'warn', icon: 'fa-wallet', title: 'Payments without a method',
                text: money(unspecified) + ' (' + percent(unspecified, collected) + '%) of collected payments has no payment method on ' + unspecifiedJobs.length + (unspecifiedJobs.length === 1 ? ' job' : ' jobs') + ' (' + listNos(unspecifiedJobs) + '). Set the method so the cash and digital totals are reliable.'
            });
        }

        // 2. Paid less / more than the Total (deliveries have no Total)
        const unpaid = [];
        const over = [];
        let unpaidSum = 0;
        let overSum = 0;
        recent.filter((j) => !isDelivery(j)).forEach((j) => {
            const total = firstNumber(j.total || j.total_amount);
            const paid = parsePaymentEntries(j.pu || j.pu_payments).concat(parsePaymentEntries(j.dest || j.destination || j.destination_payments)).reduce((n, e) => n + e.amount, 0);
            const gap = Math.round(total - paid);
            if (gap >= 1) { unpaid.push(j); unpaidSum += gap; }
            else if (gap <= -1) { over.push(j); overSum += -gap; }
        });
        if (unpaid.length) {
            alerts.push({
                level: 'danger', icon: 'fa-hand-holding-dollar', title: 'Unpaid balances',
                text: money(unpaidSum) + ' not yet collected across ' + unpaid.length + (unpaid.length === 1 ? ' job' : ' jobs') + ' (' + listNos(unpaid) + '). Follow up on these balances.'
            });
        }
        if (over.length) {
            alerts.push({
                level: 'warn', icon: 'fa-scale-unbalanced', title: 'Payments above the Total',
                text: over.length + (over.length === 1 ? ' job has' : ' jobs have') + ' payments higher than the Total by ' + money(overSum) + ' (' + listNos(over) + '). Check for a typing mistake or a missing Total.'
            });
        }

        // 3. Labor recorded on more than one job on the same day (labor is paid per day)
        const byDay = {};
        recent.filter((j) => hasLaborText(j.helpers || j.helpers_cost) || hasLaborText(j.drivers || j.drivers_cost)).forEach((j) => {
            const d = parseJobDate(j.date);
            const key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
            (byDay[key] = byDay[key] || []).push(j);
        });
        const doubleDays = Object.keys(byDay).filter((k) => byDay[k].length > 1);
        if (doubleDays.length) {
            const sample = doubleDays.slice(0, 3).map((k) => byDay[k][0].date + ' (' + listNos(byDay[k]) + ')').join('; ');
            alerts.push({
                level: 'warn', icon: 'fa-users', title: 'Labor recorded twice on one day',
                text: doubleDays.length + (doubleDays.length === 1 ? ' day has' : ' days have') + ' Helpers / Drivers cost on more than one job: ' + sample + (doubleDays.length > 3 ? ' and ' + (doubleDays.length - 3) + ' more' : '') + '. Labor is paid per day, so confirm the crew was not paid twice.'
            });
        }

        // 4. Records missing basic data
        const noRoute = recent.filter((j) => !jobRoute(j));
        if (noRoute.length) {
            alerts.push({
                level: 'info', icon: 'fa-route', title: 'Jobs without a route',
                text: noRoute.length + (noRoute.length === 1 ? ' job has' : ' jobs have') + ' no route (' + listNos(noRoute) + '). Routes drive the Top Corridors chart.'
            });
        }

        // 5. Diesel share of collected revenue
        const diesel = recent.reduce((n, j) => n + sumPlusSeparated(j.diesel || j.diesel_expense), 0);
        if (collected > 0 && percent(diesel, collected) >= 15) {
            alerts.push({
                level: 'info', icon: 'fa-gas-pump', title: 'Diesel is a large share of revenue',
                text: 'Diesel is ' + percent(diesel, collected) + '% of collected revenue (' + money(diesel) + ' of ' + money(collected) + ') in the last ' + ALERT_DAYS + ' days.'
            });
        }

        return { alerts: alerts, jobs: recent.length };
    }

    function renderAlerts(jobs) {
        const box = $('smartAlertsContainer');
        const panel = $('smartAlertsPanel');
        if (!box) return;
        // Alerts are for the Admin only: everyone else never sees the panel
        const isAdmin = window.currentUserRole === 'Admin';
        if (panel) panel.classList.toggle('hidden', !isAdmin);
        if (!isAdmin) { box.innerHTML = ''; return; }
        const result = buildAlerts(jobs);
        const style = {
            danger: ['border-l-alert-500', 'text-alert-600'],
            warn: ['border-l-warning-500', 'text-warning-600'],
            info: ['border-l-info-500', 'text-info-600'],
            ok: ['border-l-primary-500', 'text-primary-600']
        };
        // Last job entered = the record with the highest id (the table has no "created at" column)
        let lastCard = '';
        const all = Array.isArray(jobs) ? jobs : [];
        if (all.length) {
            const last = all.reduce((best, j) => (Number(j.id) > Number(best.id) ? j : best), all[0]);
            const d = parseJobDate(last.date);
            let ago = '';
            if (d) {
                const days = Math.round((new Date().setHours(0, 0, 0, 0) - d.getTime()) / 86400000);
                ago = days <= 0 ? ' (today)' : days === 1 ? ' (1 day ago)' : ' (' + days + ' days ago)';
            }
            lastCard = '<div class="p-4 bg-surface-50 rounded-xl border border-surface-100 border-l-4 ' + style.info[0] + ' md:col-span-2">'
                + '<h4 class="font-bold text-surface-800 text-xs mb-1 flex items-center"><i class="fa-solid fa-clock-rotate-left mr-1.5 ' + style.info[1] + '"></i> Last job entered</h4>'
                + '<p class="text-[11px] text-surface-600 leading-relaxed">' + esc(jobNoText(last)) + ' &middot; dated ' + esc(last.date || 'no date') + esc(ago) + '</p></div>';
        }

        const badge = $('smartAlertsBadge');
        if (badge) badge.innerText = result.alerts.length
            ? result.alerts.length + (result.alerts.length === 1 ? ' to review' : ' to review') + ' \u00b7 last ' + ALERT_DAYS + ' days'
            : 'All clear \u00b7 last ' + ALERT_DAYS + ' days';
        if (!result.alerts.length) {
            const empty = result.jobs
                ? 'Nothing needs attention in the last ' + ALERT_DAYS + ' days: payments match the Totals, every payment has a method, and no day has labor recorded twice.'
                : 'No jobs were recorded in the last ' + ALERT_DAYS + ' days.';
            box.innerHTML = lastCard + '<div class="p-4 bg-surface-50 rounded-xl border border-surface-100 border-l-4 ' + style.ok[0] + ' md:col-span-2"><h4 class="font-bold text-surface-800 text-xs mb-1 flex items-center"><i class="fa-solid fa-circle-check mr-1.5 ' + style.ok[1] + '"></i> All clear</h4><p class="text-[11px] text-surface-600 leading-relaxed">' + empty + '</p></div>';
            return;
        }
        box.innerHTML = lastCard + result.alerts.map((a) => {
            const s = style[a.level] || style.info;
            return '<div class="p-4 bg-surface-50 rounded-xl border border-surface-100 border-l-4 ' + s[0] + '">'
                + '<h4 class="font-bold text-surface-800 text-xs mb-1 flex items-center"><i class="fa-solid ' + a.icon + ' mr-1.5 ' + s[1] + '"></i> ' + esc(a.title) + '</h4>'
                + '<p class="text-[11px] text-surface-600 leading-relaxed">' + esc(a.text) + '</p></div>';
        }).join('');
    }

    function updateDashboardAnalytics() {
        try {
            const jobs = Array.isArray(window.masterJobs) ? window.masterJobs : [];
            const r = compute(jobs);
            renderCards(r);
            renderCorridors(r);
            renderInsights(r);
            renderAlerts(jobs);
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
                        backgroundColor: themeColor('primary', 600, 0.85),
                        borderRadius: 8,
                        hoverBackgroundColor: themeColor('primary', 700)
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { grid: { color: themeColor('surface', 100) }, ticks: { font: { size: 10 } } },
                        x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                    }
                }
            });
        }

        const ctxPayment = $('paymentMixChart');
        if (ctxPayment) {
            if (window.paymentMixChartInstance) window.paymentMixChartInstance.destroy();
            const colors = window.CHART_COLORS; // defined in theme.js
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
    window.__dashboardInternals = { compute: compute, buildAlerts: buildAlerts };
})();
