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

function applyReportFilters() {
    const isSummaryActive = !document.getElementById('summaryReportView').classList.contains('hidden');
    if (isSummaryActive) {
        generateSummaryReportData();
    } else {
        generateDetailedReportData();
    }
}

function resetReportFilters() {
    const startEl = document.getElementById('filterStartDate');
    const endEl = document.getElementById('filterEndDate');
    const typeEl = document.getElementById('filterJobType');
    const payEl = document.getElementById('filterPaymentType');

    if (startEl) startEl.value = '';
    if (endEl) endEl.value = '';
    if (typeEl) typeEl.value = 'all';
    if (payEl) payEl.value = 'all';

    applyReportFilters();
}

function getFilteredJobsData() {
    const jobs = JSON.parse(localStorage.getItem('movePro_masterJobs')) || [];
    
    const startDateVal = document.getElementById('filterStartDate')?.value;
    const endDateVal = document.getElementById('filterEndDate')?.value;
    const jobTypeVal = document.getElementById('filterJobType')?.value || 'all';
    const paymentVal = document.getElementById('filterPaymentType')?.value || 'all';

    const startDate = startDateVal ? new Date(startDateVal) : null;
    const endDate = endDateVal ? new Date(endDateVal) : null;
    if (endDate) endDate.setHours(23, 59, 59);

    return jobs.filter(j => {
        if (j.date) {
            const jDate = new Date(j.date);
            if (startDate && jDate < startDate) return false;
            if (endDate && jDate > endDate) return false;
        } else if (startDate || endDate) {
            return false;
        }

        if (jobTypeVal === 'delivery') {
            if (!j.jobNo || !String(j.jobNo).toLowerCase().includes('delivery')) return false;
        } else if (jobTypeVal === 'moving') {
            if (j.jobNo && String(j.jobNo).toLowerCase().includes('delivery')) return false;
        }

        if (paymentVal !== 'all') {
            const paymentField = String(j.paymentType || j.puPayment || '').toLowerCase();
            if (!paymentField.includes(paymentVal)) return false;
        }

        return true;
    });
}

function generateSummaryReportData() {
    const filteredJobs = getFilteredJobsData();
    const rentals = JSON.parse(localStorage.getItem('movepro_private_truck_rentals')) || [];
    const warehouse = JSON.parse(localStorage.getItem('movepro_warehouse_records')) || [];

    const totalJobsCount = filteredJobs.length;
    const totalDeliveriesCount = filteredJobs.filter(j => j.jobNo && String(j.jobNo).toLowerCase().includes('delivery')).length;

    let totalRevenue = 0;
    filteredJobs.forEach(j => {
        totalRevenue += parseCurrency(j.total);
    });

    const startDateVal = document.getElementById('filterStartDate')?.value;
    const endDateVal = document.getElementById('filterEndDate')?.value;
    const startDate = startDateVal ? new Date(startDateVal) : null;
    const endDate = endDateVal ? new Date(endDateVal) : null;
    if (endDate) endDate.setHours(23, 59, 59);

    let totalRentalExp = 0;
    rentals.forEach(r => {
        if (r.date) {
            const rDate = new Date(r.date);
            if (startDate && rDate < startDate) return;
            if (endDate && rDate > endDate) return;
        }
        totalRentalExp += parseCurrency(r.amount);
    });

    let totalWarehouseExp = 0;
    warehouse.forEach(w => {
        if (w.date) {
            const wDate = new Date(w.date);
            if (startDate && wDate < startDate) return;
            if (endDate && wDate > endDate) return;
        }
        totalWarehouseExp += parseCurrency(w.amount);
    });

    const totalExpenses = totalRentalExp + totalWarehouseExp;
    const netProfit = totalRevenue - totalExpenses;

    const sumJobsEl = document.getElementById('sumTotalJobs');
    const sumDelivEl = document.getElementById('sumTotalDeliveries');
    const sumRevEl = document.getElementById('sumTotalRevenue');
    const sumExpEl = document.getElementById('sumTotalExpenses');

    if (sumJobsEl) sumJobsEl.innerText = totalJobsCount.toLocaleString();
    if (sumDelivEl) sumDelivEl.innerText = totalDeliveriesCount.toLocaleString();
    if (sumRevEl) sumRevEl.innerText = '$' + totalRevenue.toLocaleString();
    if (sumExpEl) sumExpEl.innerText = '$' + totalExpenses.toLocaleString();

    const monthlyRevenue = Array(12).fill(0);
    filteredJobs.forEach(j => {
        if (j.date) {
            const dateObj = new Date(j.date);
            const month = dateObj.getMonth();
            if (!isNaN(month) && month >= 0 && month < 12) {
                monthlyRevenue[month] += parseCurrency(j.total);
            }
        }
    });

    const monthsLabels = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    const container = document.getElementById('summaryReportContainer');
    if (container) {
        container.innerHTML = `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
                <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                        <h3 class="text-base font-bold text-slate-800">Executive Monthly Financial Breakdown</h3>
                        <p class="text-xs text-slate-400 font-medium mt-0.5">Automated telemetry & revenue distribution across fiscal year</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                            Net Profit: <span class="${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}">$${netProfit.toLocaleString()}</span>
                        </span>
                        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span> Active View
                        </span>
                    </div>
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
    const filteredJobs = getFilteredJobsData();
    const tbody = document.getElementById('detailedReportBody');
    if (!tbody) return;

    if (filteredJobs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-400">No records found matching criteria.</td></tr>`;
        return;
    }

    tbody.innerHTML = filteredJobs.map(item => `
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

function exportOfficialPDF() {
    const reportElement = document.getElementById('summaryReportView') || document.getElementById('tab-reports');
    
    if (!reportElement) {
        alert('Report section not found');
        return;
    }

    const printWindow = window.open('', '_blank');
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>MovePro Executive - Financial & Operations Report</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                body { font-family: system-ui, -apple-system, sans-serif; padding: 25px; color: #1e293b; background: #fff; }
                @page { size: A4 landscape; margin: 10mm; }
            </style>
        </head>
        <body>
            <div class="border-b border-slate-200 pb-4 mb-6 flex justify-between items-center">
                <div>
                    <h1 class="text-xl font-bold text-slate-900">MovePro Enterprise - Executive Financial Report</h1>
                    <p class="text-xs text-slate-500">Generated on: ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}</p>
                </div>
                <div class="text-right">
                    <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">OFFICIAL EXECUTIVE REPORT</span>
                </div>
            </div>
            
            <div>
                ${reportElement.innerHTML}
            </div>

            <script>
                setTimeout(() => {
                    window.print();
                    window.close();
                }, 500);
            <\/script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
}

function renderReportsTab() {
    switchReportMode('summary');
}
