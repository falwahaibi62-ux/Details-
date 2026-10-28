/**
 * MovePro - Financial & Operations Reports Module (Production Ready & Synchronized)
 */

function switchReportMode(mode) {
    const summaryView = document.getElementById('summaryReportView');
    const detailedView = document.getElementById('detailedReportView');
    const btnSummary = document.getElementById('btnSummaryMode');
    const btnDetailed = document.getElementById('btnDetailedMode');

    if (!summaryView || !detailedView) return;

    if (mode === 'summary') {
        summaryView.classList.remove('hidden');
        detailedView.classList.add('hidden');
        if (btnSummary) btnSummary.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white transition cursor-pointer';
        if (btnDetailed) btnDetailed.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer';
        generateSummaryReportData();
    } else {
        summaryView.classList.add('hidden');
        detailedView.classList.remove('hidden');
        if (btnDetailed) btnDetailed.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white transition cursor-pointer';
        if (btnSummary) btnSummary.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer';
        generateDetailedReportData();
    }
}
window.switchReportMode = switchReportMode;

function parseCurrency(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}
window.parseCurrency = parseCurrency;

function applyReportFilters() {
    const summaryView = document.getElementById('summaryReportView');
    if (!summaryView) return;
    
    const isSummaryActive = !summaryView.classList.contains('hidden');
    if (isSummaryActive) {
        generateSummaryReportData();
    } else {
        generateDetailedReportData();
    }
}
window.applyReportFilters = applyReportFilters;

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
window.resetReportFilters = resetReportFilters;

function getFilteredJobsData() {
    const jobs = window.masterJobs || JSON.parse(localStorage.getItem('movePro_masterJobs')) || [];
    
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
            const paymentField = String(j.paymentType || j.pu || j.dest || '').toLowerCase();
            if (!paymentField.includes(paymentVal)) return false;
        }

        return true;
    });
}
window.getFilteredJobsData = getFilteredJobsData;

function generateOfficialSummaryTable(filteredJobs) {
    const totalJobs = filteredJobs.length;
    const totalDeliveries = filteredJobs.filter(j => j.jobNo && String(j.jobNo).toLowerCase().includes('delivery')).length;

    let sumForeman10 = 0;
    let sumHelpers = 0;
    let sumDrivers = 0;
    let sumCashDiesel = 0;
    
    let sumCashPu = 0;
    let sumCashDest = 0;
    let sumPmoPu = 0;
    let sumZellePu = 0;
    
    let sumDestZelle = 0;
    let sumDestNoCashPmo = 0;
    let sumPmoDeliveries = 0;
    let sumTotalAfterDeposit = 0;

    filteredJobs.forEach(item => {
        const totalVal = parseCurrency(item.total);
        sumTotalAfterDeposit += totalVal;

        // الحسبة التلقائية اللحظية لـ Foreman 10% (10% من إجمالي الـ Total)
        sumForeman10 += totalVal > 0 ? (totalVal * 0.1) : 0;

        sumHelpers += parseCurrency(item.helpers);
        sumDrivers += parseCurrency(item.drivers);

        // معالجة دقيقة لحساب الديزل وتجنب الأرقام العشوائية
        if (item.diesel && item.diesel !== '-') {
            let dieselStr = String(item.diesel);
            let dieselSum = dieselStr.split('+').reduce((sum, part) => {
                let cleanNum = parseFloat(part.replace(/[^0-9.]/g, '')) || 0;
                // نتجنب الأرقام الكبيرة غير الطبيعية الناتجة عن تداخل النصوص
                return sum + (cleanNum < 5000 ? cleanNum : 0);
            }, 0);
            if (dieselStr.toLowerCase().includes('cash') || !dieselStr.toLowerCase().includes('penske')) {
                sumCashDiesel += dieselSum;
            }
        }

        const puStr = String(item.pu || '').toLowerCase();
        const puVal = parseCurrency(item.pu);
        
        // التحقق من أن المبلغ منطقي وليس رقماً تعريفياً متداخلاً مع النص
        const safePuVal = puVal < 100000 ? puVal : 0;

        if (puStr.includes('cash')) {
            sumCashPu += safePuVal;
        } else if (puStr.includes('pmo')) {
            sumPmoPu += safePuVal;
        } else if (safePuVal > 0) {
            sumZellePu += safePuVal;
        }

        const destStr = String(item.dest || item.destination || '').toLowerCase();
        const destVal = parseCurrency(item.dest || item.destination);
        const safeDestVal = destVal < 100000 ? destVal : 0;

        if (destStr.includes('cash')) {
            sumCashDest += safeDestVal;
        } else if (destStr.includes('zelle')) {
            sumDestZelle += safeDestVal;
            sumDestNoCashPmo += safeDestVal;
        } else if (!destStr.includes('pmo') && safeDestVal > 0) {
            sumDestNoCashPmo += safeDestVal;
        }

        if (item.jobNo && String(item.jobNo).toLowerCase().includes('delivery') && puStr.includes('pmo')) {
            sumPmoDeliveries += safePuVal;
        }
    });

    return `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4 mt-6">
            <div class="border-b border-slate-100 pb-3 flex flex-wrap justify-between items-center gap-2">
                <div>
                    <h3 class="text-sm font-bold text-slate-800">Official Period Financial Summary</h3>
                    <p class="text-[11px] text-slate-400">Comprehensive summary of labor fees, cash, Zelle, and PMO breakdown</p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                        Total Jobs: <span class="text-emerald-600">${totalJobs}</span>
                    </span>
                    <span class="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                        Total Deliveries: <span class="text-blue-600">${totalDeliveries}</span>
                    </span>
                </div>
            </div>

            <div class="overflow-x-auto rounded-xl border border-slate-100">
                <table class="w-full text-left border-collapse text-[11px]">
                    <thead>
                        <tr class="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200/80 text-[10px]">
                            <th class="p-2.5 border-r border-slate-200/60 text-center">Foreman</th>
                            <th class="p-2.5 border-r border-slate-200/60 text-center">Helpers</th>
                            <th class="p-2.5 border-r border-slate-200/60 text-center">Drivers</th>
                            <th class="p-2.5 border-r border-slate-200/60 text-center text-amber-700 bg-amber-50/50">Cash Diesel</th>
                            <th class="p-2.5 border-r border-slate-200/60 text-center text-emerald-700 bg-emerald-50/30">Cash PU Payment</th>
                            <th class="p-2.5 border-r border-slate-200/60 text-center text-emerald-700 bg-emerald-50/30">Cash Dest-Balance</th>
                            <th class="p-2.5 border-r border-slate-200/60 text-center">PMO PU Payment</th>
                            <th class="p-2.5 border-r border-slate-200/60 text-center text-blue-700 bg-blue-50/30">PU (No Cash/PMO)</th>
                            <th class="p-2.5 border-r border-slate-200/60 text-center text-blue-700 bg-blue-50/30">Balance (No Cash/PMO)</th>
                            <th class="p-2.5 border-r border-slate-200/60 text-center">PMO Deliveries</th>
                            <th class="p-2.5 border-r border-slate-200/60 text-center text-purple-700 bg-purple-50/30">Dest Balance Zelle</th>
                            <th class="p-2.5 text-center bg-emerald-600 text-white font-extrabold">Total After Deposit</th>
                        </tr>
                    </thead>
                    <tbody class="font-semibold text-slate-700 divide-y divide-slate-100">
                        <tr class="hover:bg-slate-50 transition-colors">
                            <td class="p-2.5 border-r text-center">$${sumForeman10.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td class="p-2.5 border-r text-center">$${sumHelpers.toLocaleString()}</td>
                            <td class="p-2.5 border-r text-center">$${sumDrivers.toLocaleString()}</td>
                            <td class="p-2.5 border-r text-center text-amber-700 font-bold bg-amber-50/20">$${sumCashDiesel.toLocaleString()}</td>
                            <td class="p-2.5 border-r text-center text-emerald-600 font-bold">$${sumCashPu.toLocaleString()}</td>
                            <td class="p-2.5 border-r text-center text-emerald-600 font-bold">$${sumCashDest.toLocaleString()}</td>
                            <td class="p-2.5 border-r text-center">$${sumPmoPu.toLocaleString()}</td>
                            <td class="p-2.5 border-r text-center text-blue-600 font-bold">$${sumZellePu.toLocaleString()}</td>
                            <td class="p-2.5 border-r text-center text-blue-600 font-bold">$${sumDestNoCashPmo.toLocaleString()}</td>
                            <td class="p-2.5 border-r text-center">$${sumPmoDeliveries.toLocaleString()}</td>
                            <td class="p-2.5 border-r text-center text-purple-600 font-bold">$${sumDestZelle.toLocaleString()}</td>
                            <td class="p-2.5 text-center bg-emerald-50 text-emerald-800 font-extrabold text-xs">$${sumTotalAfterDeposit.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
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

            ${generateOfficialSummaryTable(filteredJobs)}
        `;
    }
}
window.generateSummaryReportData = generateSummaryReportData;

function generateDetailedReportData() {
    const startDateVal = document.getElementById('filterStartDate')?.value;
    const endDateVal = document.getElementById('filterEndDate')?.value;

    const startDate = startDateVal ? new Date(startDateVal) : null;
    const endDate = endDateVal ? new Date(endDateVal) : null;
    if (endDate) endDate.setHours(23, 59, 59);

    const filteredJobs = getFilteredJobsData();
    const jobsTbody = document.getElementById('detailedReportBody');
    const jobsBadge = document.getElementById('detailedJobsBadge');

    if (jobsBadge) jobsBadge.innerText = `${filteredJobs.length} Jobs`;
    if (jobsTbody) {
        if (filteredJobs.length === 0) {
            jobsTbody.innerHTML = `<tr><td colspan="12" class="p-6 text-center text-slate-400 text-xs">No job records found for selected period.</td></tr>`;
        } else {
            jobsTbody.innerHTML = filteredJobs.map(item => {
                const totalNum = parseCurrency(item.total);
                const dynamicForeman10 = totalNum > 0 ? '$' + (totalNum * 0.1).toFixed(2) : '-';
                
                const destVal = item.destination || item.dest || '-';
                const dieselVal = item.diesel || '-';
                const hotelVal = item.hotel || '-';

                return `
                    <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
                        <td class="p-3 border font-medium">${item.date || '-'}</td>
                        <td class="p-3 border font-semibold text-slate-800">${item.jobNo || '-'}</td>
                        <td class="p-3 border">${item.route || '-'}</td>
                        <td class="p-3 border">${item.foreman || '-'}</td>
                        <td class="p-3 border font-bold text-emerald-800">${dynamicForeman10}</td>
                        <td class="p-3 border">${item.helpers || '-'}</td>
                        <td class="p-3 border">${item.drivers || '-'}</td>
                        <td class="p-3 border font-bold text-emerald-600">${item.total || '$0'}</td>
                        <td class="p-3 border">${item.pu || '-'}</td>
                        <td class="p-3 border font-medium">${destVal}</td>
                        <td class="p-3 border text-emerald-700">${dieselVal}</td>
                        <td class="p-3 border text-indigo-700">${hotelVal}</td>
                    </tr>
                `;
            }).join('');
        }
    }

    const rentals = JSON.parse(localStorage.getItem('movepro_private_truck_rentals')) || [];
    const filteredRentals = rentals.filter(r => {
        if (!r.date) return true;
        const rDate = new Date(r.date);
        if (startDate && rDate < startDate) return false;
        if (endDate && rDate > endDate) return false;
        return true;
    });

    const rentalsTbody = document.getElementById('detailedRentalsBody');
    const rentalsBadge = document.getElementById('detailedRentalsBadge');

    if (rentalsBadge) rentalsBadge.innerText = `${filteredRentals.length} Records`;
    if (rentalsTbody) {
        if (filteredRentals.length === 0) {
            rentalsTbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 text-xs">No truck rental records found for selected period.</td></tr>`;
        } else {
            rentalsTbody.innerHTML = filteredRentals.map(r => `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="p-3 border font-medium">${r.date || '-'}</td>
                    <td class="p-3 border font-semibold text-slate-800">${r.truckLabel || 'Truck Rental'}</td>
                    <td class="p-3 border">${r.paidBy || '-'}</td>
                    <td class="p-3 border">${r.paymentType || 'Cash'}</td>
                    <td class="p-3 border text-right font-bold text-amber-600">$${parseCurrency(r.amount).toLocaleString()}</td>
                </tr>
            `).join('');
        }
    }

    const warehouse = JSON.parse(localStorage.getItem('movepro_warehouse_records')) || [];
    const filteredWarehouse = warehouse.filter(w => {
        if (!w.date) return true;
        const wDate = new Date(w.date);
        if (startDate && wDate < startDate) return false;
        if (endDate && wDate > endDate) return false;
        return true;
    });

    const warehouseTbody = document.getElementById('detailedWarehouseBody');
    const warehouseBadge = document.getElementById('detailedWarehouseBadge');

    if (warehouseBadge) warehouseBadge.innerText = `${filteredWarehouse.length} Records`;
    if (warehouseTbody) {
        if (filteredWarehouse.length === 0) {
            warehouseTbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 text-xs">No warehouse records found for selected period.</td></tr>`;
        } else {
            warehouseTbody.innerHTML = filteredWarehouse.map(w => `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="p-3 border font-medium">${w.date || '-'}</td>
                    <td class="p-3 border font-semibold text-slate-800">${w.services || 'Warehouse Expense'}</td>
                    <td class="p-3 border">${w.details || '-'}</td>
                    <td class="p-3 border">${w.paymentType || 'Cash'}</td>
                    <td class="p-3 border text-right font-bold text-purple-600">$${parseCurrency(w.amount).toLocaleString()}</td>
                </tr>
            `).join('');
        }
    }
}
window.generateDetailedReportData = generateDetailedReportData;

function exportOfficialPDF() {
    const summaryView = document.getElementById('summaryReportView');
    const detailedView = document.getElementById('detailedReportView');
    
    // تحديد ما إذا كان التقرير النشط هو الملخص أو التفصيلي
    const isSummaryActive = summaryView && !summaryView.classList.contains('hidden');
    const activeReportElement = isSummaryActive ? summaryView : detailedView;

    if (!activeReportElement) {
        alert('Report section not found');
        return;
    }

    // جلب قيم التواريخ المدخلة من قبل المستخدم
    const startDate = document.getElementById('filterStartDate')?.value || 'البداية';
    const endDate = document.getElementById('filterEndDate')?.value || 'النهاية';

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
                    <p class="text-xs text-slate-600 mt-1"><strong>Period Filter:</strong> From [ ${startDate} ] To [ ${endDate} ]</p>
                    <p class="text-xs text-slate-400">Generated on: ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}</p>
                </div>
                <div class="text-right">
                    <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">OFFICIAL REPORT</span>
                </div>
            </div>
            
            <div>
                ${activeReportElement.innerHTML}
            </div>

            <script>
                setTimeout(() => {
                    window.print();
                    window.close();
                }, 600);
            <\/script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
}
window.exportOfficialPDF = exportOfficialPDF;
function renderReportsTab() {
    switchReportMode('summary');
}
window.renderReportsTab = renderReportsTab;
