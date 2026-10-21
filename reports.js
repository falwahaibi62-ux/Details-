function switchReportMode(mode) {
    const summaryView = document.getElementById('summaryReportView');
    const detailedView = document.getElementById('detailedReportView');
    const btnSummary = document.getElementById('btnSummaryMode');
    const btnDetailed = document.getElementById('btnDetailedMode');

    if (!summaryView || !detailedView) return;

    if (mode === 'summary') {
        summaryView.classList.remove('hidden');
        detailedView.classList.add('hidden');
        if (btnSummary) btnSummary.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white transition';
        if (btnDetailed) btnDetailed.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
        generateSummaryReportData();
    } else {
        summaryView.classList.add('hidden');
        detailedView.classList.remove('hidden');
        if (btnDetailed) btnDetailed.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white transition';
        if (btnSummary) btnSummary.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
        generateDetailedReportData();
    }
}

function parseCurrency(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

function generateSummaryReportData() {
    const jobs = JSON.parse(localStorage.getItem('movePro_masterJobs')) || [];
    const rentals = JSON.parse(localStorage.getItem('movepro_private_truck_rentals')) || [];
    const warehouse = JSON.parse(localStorage.getItem('movepro_warehouse_records')) || [];

    const totalJobsCount = jobs.length;
    const totalDeliveriesCount = jobs.filter(j => j.jobNo && String(j.jobNo).toLowerCase().includes('delivery')).length;

    let totalRevenue = 0;
    jobs.forEach(j => {
        totalRevenue += parseCurrency(j.total);
    });

    let totalRentalExp = 0;
    rentals.forEach(r => {
        totalRentalExp += parseCurrency(r.amount);
    });

    let totalWarehouseExp = 0;
    warehouse.forEach(w => {
        totalWarehouseExp += parseCurrency(w.amount);
    });

    const sumJobsEl = document.getElementById('sumTotalJobs');
    const sumDelivEl = document.getElementById('sumTotalDeliveries');
    const sumRevEl = document.getElementById('sumTotalRevenue');
    const sumExpEl = document.getElementById('sumTotalExpenses');

    if (sumJobsEl) sumJobsEl.innerText = totalJobsCount.toLocaleString();
    if (sumDelivEl) sumDelivEl.innerText = totalDeliveriesCount.toLocaleString();
    if (sumRevEl) sumRevEl.innerText = '$' + totalRevenue.toLocaleString();
    if (sumExpEl) sumExpEl.innerText = '$' + (totalRentalExp + totalWarehouseExp).toLocaleString();

    // تجميع الإيرادات الشهرية (يناير = index 0 إلى ديسمبر = index 11)
    const monthlyRevenue = Array(12).fill(0);
    jobs.forEach(j => {
        if (j.date) {
            const dateObj = new Date(j.date);
            const month = dateObj.getMonth();
            if (!isNaN(month) && month >= 0 && month < 12) {
                monthlyRevenue[month] += parseCurrency(j.total);
            }
        }
    });

    const monthsLabels = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    // بناء الجدول العصري والمتناسق
    const container = document.getElementById('summaryReportContainer');
    if (container) {
        container.innerHTML = `
            <!-- Monthly Revenue Matrix Card -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
                <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                        <h3 class="text-base font-bold text-slate-800">Monthly Revenue Breakdown</h3>
                        <p class="text-xs text-slate-400 font-medium mt-0.5">Automated financial distribution across 12 calendar months</p>
                    </div>
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span> FY 2026 Live
                    </span>
                </div>

                <div class="overflow-x-auto rounded-xl border border-slate-100">
                    <table class="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr class="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60">
                                ${monthsLabels.map(m => `<th class="px-4 py-3 text-center border-r border-slate-200/40 last:border-0">${m}</th>`).join('')}
                                <th class="px-4 py-3 text-center bg-emerald-50/70 text-emerald-800 font-extrabold border-l border-emerald-100">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                ${monthlyRevenue.map(val => `
                                    <td class="px-3 py-4 text-center border-r border-slate-100 ${val > 0 ? 'text-slate-800 font-bold' : 'text-slate-300 font-normal'}"> $${val.toLocaleString()}
                                    </td>
                                `).join('')}
                                <td class="px-4 py-4 text-center bg-emerald-50/40 text-emerald-700 font-extrabold text-sm border-l border-emerald-100">
                                    $${totalRevenue.toLocaleString()}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
}
function generateDetailedReportData() {
    const jobs = JSON.parse(localStorage.getItem('movePro_masterJobs')) || [];
    const tbody = document.getElementById('detailedReportBody');
    if (!tbody) return;

    if (jobs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-400">No records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = jobs.map(item => `
        <tr class="border-b hover:bg-slate-50 transition">
            <td class="p-3 border">${item.date || '-'}</td>
            <td class="p-3 border font-semibold text-slate-800">${item.jobNo || '-'}</td>
            <td class="p-3 border">${item.from || '-'} → ${item.to || '-'}</td>
            <td class="p-3 border">${item.foreman || '-'}</td>
            <td class="p-3 border">${item.helpers || '-'}</td>
            <td class="p-3 border">${item.drivers || '-'}</td>
            <td class="p-3 border font-bold text-emerald-600">${item.total || '-'}</td>
            <td class="p-3 border">${item.puPayment || '-'}</td>
        </tr>
    `).join('');
}

function renderReportsTab() {
    switchReportMode('summary');
}
