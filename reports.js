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

// 🌟 دالة مخصصة لاستخراج المبلغ المالي الصحيح للعمال والسائقين من بين القوسين (مثل 1-1 1/2 (250) -> 250)
function parseLaborAmount(val) {
    if (!val || val === '-') return 0;
    const strVal = String(val);
    const match = strVal.match(/\(([^)]+)\)/);
    if (match) {
        return parseCurrency(match[1]);
    }
    return parseCurrency(strVal);
}
window.parseLaborAmount = parseLaborAmount;

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

// دالة مساعدة لتطبيع التواريخ محلياً وتجنب مشاكل الفروق الزمنية
function parseLocalDate(dateStr) {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d, 0, 0, 0, 0);
    }
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const m = parseInt(parts[0], 10);
        const d = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        return new Date(y, m - 1, d, 0, 0, 0, 0);
    }
    const dObj = new Date(dateStr);
    return isNaN(dObj.getTime()) ? null : new Date(dObj.getFullYear(), dObj.getMonth(), dObj.getDate());
}
window.parseLocalDate = parseLocalDate;

function getFilteredJobsData() {
    const jobs = window.masterJobs || JSON.parse(localStorage.getItem('movePro_masterJobs')) || [];
    
    const startDateVal = document.getElementById('filterStartDate')?.value;
    const endDateVal = document.getElementById('filterEndDate')?.value;
    const jobTypeVal = document.getElementById('filterJobType')?.value || 'all';
    const paymentVal = document.getElementById('filterPaymentType')?.value || 'all';

    let startDate = null;
    if (startDateVal) {
        const [y, m, d] = startDateVal.split('-').map(Number);
        startDate = new Date(y, m - 1, d, 0, 0, 0, 0);
    }

    let endDate = null;
    if (endDateVal) {
        const [y, m, d] = endDateVal.split('-').map(Number);
        endDate = new Date(y, m - 1, d, 23, 59, 59, 999);
    }

    return jobs.filter(j => {
        if (j.date) {
            const jDate = parseLocalDate(j.date);
            if (!jDate) return false;
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

function generateTruckRentalSummaryTableHTML() {
    const rentals = JSON.parse(localStorage.getItem('movepro_private_truck_rentals')) || [];
    
    const startDateVal = document.getElementById('filterStartDate')?.value;
    const endDateVal = document.getElementById('filterEndDate')?.value;
    const startDate = startDateVal ? new Date(startDateVal) : null;
    const endDate = endDateVal ? new Date(endDateVal) : null;
    if (endDate) endDate.setHours(23, 59, 59);

    let totalDays = 0;
    let sumCash = 0;
    let sumOther = 0;
    let grandTotal = 0;
    let filteredCount = 0;

    rentals.forEach(r => {
        if (r.date) {
            const rDate = new Date(r.date);
            if (startDate && rDate < startDate) return;
            if (endDate && rDate > endDate) return;
        }

        filteredCount++;
        const daysNum = parseInt(String(r.days || '0').replace(/[^0-9]/g, '')) || 0;
        totalDays += daysNum;

        const amount = parseCurrency(r.amount);
        grandTotal += amount;

        const paymentType = String(r.paymentType || '').toLowerCase();
        if (paymentType.includes('cash')) {
            sumCash += amount;
        } else {
            sumOther += amount;
        }
    });

    return {
        count: filteredCount,
        totalDays: totalDays,
        sumCash: sumCash,
        sumOther: sumOther,
        grandTotal: grandTotal,
        html: `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4 mt-6">
                <div class="border-b border-slate-100 pb-3 flex flex-wrap justify-between items-center gap-2">
                    <div>
                        <h3 class="text-sm font-bold text-slate-800">Private Truck Rental Financial Summary</h3>
                        <p class="text-[11px] text-slate-400">Comprehensive summary of rental duration, cash payments, and total expenses</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                            Total Rental Records: <span class="text-emerald-600">${filteredCount}</span>
                        </span>
                    </div>
                </div>

                <div class="overflow-x-auto rounded-xl border border-slate-100">
                    <table class="w-full text-left border-collapse text-[11px]">
                        <thead>
                            <tr class="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200/80 text-[10px]">
                                <th class="p-2.5 border-r border-slate-200/60 text-center">Total Rental Days</th>
                                <th class="p-2.5 border-r border-slate-200/60 text-center text-emerald-700 bg-emerald-50/30">Cash Payments</th>
                                <th class="p-2.5 border-r border-slate-200/60 text-center text-blue-700 bg-blue-50/30">Other Payments (Zelle/Check)</th>
                                <th class="p-2.5 text-center bg-amber-600 text-white font-extrabold">Grand Total Rental Cost</th>
                            </tr>
                        </thead>
                        <tbody class="font-semibold text-slate-700 divide-y divide-slate-100">
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="p-2.5 border-r text-center font-bold text-slate-800">${totalDays} Days</td>
                                <td class="p-2.5 border-r text-center text-emerald-600 font-bold bg-emerald-50/20">$${sumCash.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td class="p-2.5 border-r text-center text-blue-600 font-bold bg-blue-50/20">$${sumOther.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td class="p-2.5 text-center bg-amber-50 text-amber-900 font-extrabold text-xs">$${grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `
    };
}

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

        sumForeman10 += totalVal > 0 ? (totalVal * 0.1) : 0;
        // استخدام parseLaborAmount لاستخراج المبالغ الصحيحة للعمال والسائقين من الجدول فقط
        sumHelpers += parseLaborAmount(item.helpers);
        sumDrivers += parseLaborAmount(item.drivers);

        if (item.diesel && item.diesel !== '-') {
            let dieselStr = String(item.diesel);
            let dieselSum = dieselStr.split('+').reduce((sum, part) => {
                let cleanNum = parseFloat(part.replace(/[^0-9.]/g, '')) || 0;
                return sum + (cleanNum < 5000 ? cleanNum : 0);
            }, 0);
            if (dieselStr.toLowerCase().includes('cash') || !dieselStr.toLowerCase().includes('penske')) {
                sumCashDiesel += dieselSum;
            }
        }

        const puStr = String(item.pu || '').toLowerCase();
        const rawPuVal = parseCurrency(item.pu);
        const puVal = (rawPuVal < 50000) ? rawPuVal : 0;

        if (puStr.includes('cash')) {
            sumCashPu += puVal;
        } else if (puStr.includes('pmo')) {
            sumPmoPu += puVal;
        } else if (puVal > 0) {
            sumZellePu += puVal;
        }

        const destStr = String(item.dest || item.destination || '').toLowerCase();
        const rawDestVal = parseCurrency(item.dest || item.destination);
        const destVal = (rawDestVal < 50000) ? rawDestVal : 0;

        if (destStr.includes('cash')) {
            sumCashDest += destVal;
        } else if (destStr.includes('zelle')) {
            sumDestZelle += destVal;
            sumDestNoCashPmo += destVal;
        } else if (!destStr.includes('pmo') && destVal > 0) {
            sumDestNoCashPmo += destVal;
        }

        if (item.jobNo && String(item.jobNo).toLowerCase().includes('delivery') && puStr.includes('pmo')) {
            sumPmoDeliveries += puVal;
        }
    });

    const rentalSummaryObj = generateTruckRentalSummaryTableHTML();

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

        ${rentalSummaryObj.html}
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

                const helpersDisplay = item.helpers || '-';
                const driversDisplay = item.drivers || '-';

                return `
                    <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
                        <td class="p-3 border font-medium">${item.date || '-'}</td>
                        <td class="p-3 border font-semibold text-slate-800">${item.jobNo || '-'}</td>
                        <td class="p-3 border">${item.route || '-'}</td>
                        <td class="p-3 border">${item.foreman || '-'}</td>
                        <td class="p-3 border font-bold text-emerald-800">${dynamicForeman10}</td>
                        <td class="p-3 border text-purple-700 font-semibold">${helpersDisplay}</td>
                        <td class="p-3 border text-blue-700 font-semibold">${driversDisplay}</td>
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


/**
 * دالة لإنشاء جدول إجمالي العمليات لكل طريقة دفع بناءً على الفلاتر والتواريخ
 */
function generatePaymentMethodsSummaryTableHTML() {
    const filteredJobs = getFilteredJobsData();
    
    // تعريف طرق الدفع الأساسية الظاهرة في القائمة المنسدلة
    const methods = ["Cash", "Zelle", "Cheque", "PMO", "BC", "PC", "CC", "WT", "Others"];
    
    // تجميع الإجماليات لكل طريقة دفع
    const summaryMap = {};
    methods.forEach(m => {
        summaryMap[m] = { count: 0, totalAmount: 0 };
    });

    filteredJobs.forEach(job => {
        // فحص حقل طريقة الدفع أو حقول الدفع PU و Dest
        const paymentField = String(job.paymentType || job.pu || job.dest || '').toLowerCase();
        const amount = parseCurrency(job.total);

        let matched = false;
        methods.forEach(method => {
            if (paymentField.includes(method.toLowerCase())) {
                summaryMap[method].count += 1;
                summaryMap[method].totalAmount += amount;
                matched = true;
            }
        });

        // إذا لم تطابق أي طريقة صريحة، تضاف إلى Others
        if (!matched && amount > 0) {
            summaryMap["Others"].count += 1;
            summaryMap["Others"].totalAmount += amount;
        }
    });

    let grandTotalCount = 0;
    let grandTotalAmount = 0;

    const rowsHTML = methods.map(method => {
        const data = summaryMap[method];
        grandTotalCount += data.count;
        grandTotalAmount += data.totalAmount;

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-2.5 border-r font-bold text-slate-800 text-center">${method}</td>
                <td class="p-2.5 border-r text-center text-slate-600 font-semibold">${data.count} Jobs</td>
                <td class="p-2.5 text-center font-extrabold text-emerald-700 bg-emerald-50/25">$${data.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
        `;
    }).join('');

    return {
        grandTotalAmount: grandTotalAmount,
        html: `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4 mt-6">
                <div class="border-b border-slate-100 pb-3 flex flex-wrap justify-between items-center gap-2">
                    <div>
                        <h3 class="text-sm font-bold text-slate-800">Payment Methods Financial Summary</h3>
                        <p class="text-[11px] text-slate-400">Aggregated transaction totals and counts categorized by payment type</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                            Total Processed Jobs: <span class="text-emerald-600">${grandTotalCount}</span>
                        </span>
                    </div>
                </div>

                <div class="overflow-x-auto rounded-xl border border-slate-100">
                    <table class="w-full text-left border-collapse text-[11px]">
                        <thead>
                            <tr class="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200/80 text-[10px]">
                                <th class="p-2.5 border-r border-slate-200/60 text-center">Payment Method</th>
                                <th class="p-2.5 border-r border-slate-200/60 text-center">Transaction Count</th>
                                <th class="p-2.5 text-center bg-emerald-600 text-white font-extrabold">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody class="font-semibold text-slate-700 divide-y divide-slate-100">
                            ${rowsHTML}
                            <tr class="bg-slate-100/80 font-extrabold text-slate-900 border-t-2 border-slate-200">
                                <td class="p-3 border-r text-center uppercase">Grand Total</td>
                                <td class="p-3 border-r text-center">${grandTotalCount} Jobs</td>
                                <td class="p-3 text-center text-emerald-900 bg-emerald-100/50 text-xs">$${grandTotalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `
    };
}
window.generatePaymentMethodsSummaryTableHTML = generatePaymentMethodsSummaryTableHTML;


/**
 * MovePro - Professional PDF Generation Engine (Includes Jobs, Rentals, and Warehouse)
 */
function exportOfficialPDF() {
    const jobs = getFilteredJobsData();
    const rentals = JSON.parse(localStorage.getItem('movepro_private_truck_rentals')) || [];
    const warehouse = JSON.parse(localStorage.getItem('movepro_warehouse_records')) || [];

    const startDateVal = document.getElementById('filterStartDate')?.value || '12/05/2026';
    const endDateVal = document.getElementById('filterEndDate')?.value || '19/10/2026';

    const startDate = startDateVal ? new Date(startDateVal) : null;
    const endDate = endDateVal ? new Date(endDateVal) : null;
    if (endDate) endDate.setHours(23, 59, 59);

    const filteredRentals = rentals.filter(r => {
        if (!r.date) return true;
        const rDate = new Date(r.date);
        if (startDate && rDate < startDate) return false;
        if (endDate && rDate > endDate) return false;
        return true;
    });

    const filteredWarehouse = warehouse.filter(w => {
        if (!w.date) return true;
        const wDate = new Date(w.date);
        if (startDate && wDate < startDate) return false;
        if (endDate && wDate > endDate) return false;
        return true;
    });

    let sumForeman10 = 0, sumHelpers = 0, sumDrivers = 0, sumCashDiesel = 0;
    let sumCashPu = 0, sumCashDest = 0, sumPmoPu = 0, sumZellePu = 0;
    let sumDestZelle = 0, sumDestNoCashPmo = 0, sumPmoDeliveries = 0, sumTotalAfterDeposit = 0;

    jobs.forEach(item => {
        const totalVal = parseCurrency(item.total);
        sumTotalAfterDeposit += totalVal;
        sumForeman10 += totalVal > 0 ? (totalVal * 0.1) : 0;
        sumHelpers += parseLaborAmount(item.helpers);
        sumDrivers += parseLaborAmount(item.drivers);

        if (item.diesel && item.diesel !== '-') {
            let dieselStr = String(item.diesel);
            let dieselSum = dieselStr.split('+').reduce((s, p) => s + parseCurrency(p), 0);
            if (dieselStr.toLowerCase().includes('cash') || !dieselStr.toLowerCase().includes('penske')) {
                sumCashDiesel += dieselSum;
            }
        }

        const puStr = String(item.pu || '').toLowerCase();
        const rawPuVal = parseCurrency(item.pu);
        const puVal = (rawPuVal < 50000) ? rawPuVal : 0;
        if (puStr.includes('cash')) sumCashPu += puVal;
        else if (puStr.includes('pmo')) sumPmoPu += puVal;
        else if (puVal > 0) sumZellePu += puVal;

        const destStr = String(item.dest || item.destination || '').toLowerCase();
        const rawDestVal = parseCurrency(item.dest || item.destination);
        const destVal = (rawDestVal < 50000) ? rawDestVal : 0;
        if (destStr.includes('cash')) sumCashDest += destVal;
        else if (destStr.includes('zelle')) { sumDestZelle += destVal; sumDestNoCashPmo += destVal; }
        else if (!destStr.includes('pmo') && destVal > 0) sumDestNoCashPmo += destVal;

        if (item.jobNo && String(item.jobNo).toLowerCase().includes('delivery') && puStr.includes('pmo')) {
            sumPmoDeliveries += puVal;
        }
    });

    let rentalPdfDays = 0, rentalPdfCash = 0, rentalPdfOther = 0, rentalPdfTotal = 0;
    filteredRentals.forEach(r => {
        const daysNum = parseInt(String(r.days || '0').replace(/[^0-9]/g, '')) || 0;
        rentalPdfDays += daysNum;
        const amt = parseCurrency(r.amount);
        rentalPdfTotal += amt;
        const pType = String(r.paymentType || '').toLowerCase();
        if (pType.includes('cash')) rentalPdfCash += amt;
        else rentalPdfOther += amt;
    });

    const printWindow = window.open('', '_blank');
    
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>MovePro Executive Financial Report</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                @page { size: A4 landscape; margin: 8mm; }
                body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; background: #fff; padding: 10px; }
                .table-pdf { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 15px; }
                .table-pdf th { background-color: #f1f5f9; color: #334155; font-weight: 700; border: 1px solid #cbd5e1; padding: 5px; text-align: center; }
                .table-pdf td { border: 1px solid #e2e8f0; padding: 5px; text-align: center; }
                .page-break { page-break-before: always; }
                .summary-header { background-color: #d6c3b3; color: #3f2e21; font-weight: bold; }
                .rental-header { background-color: #f8fafc; color: #1e293b; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="text-center mb-4 border-b pb-3">
                <h1 class="text-xl font-bold text-emerald-800">Total Cash, PMO & Expenses Report</h1>
                <p class="text-xs font-semibold text-rose-800 mt-1">From Date: <span class="text-slate-800">${startDateVal}</span> &nbsp;&nbsp;|&nbsp;&nbsp; To Date: <span class="text-slate-800">${endDateVal}</span></p>
            </div>

            <div class="mb-5">
                <h3 class="text-xs font-bold uppercase text-slate-600 mb-2">Executive Financial Summary</h3>
                <table class="table-pdf">
                    <thead>
                        <tr class="summary-header">
                            <th>Total Foreman 10%</th>
                            <th>Total Helpers</th>
                            <th>Total Drivers</th>
                            <th>Total Cash Diesel</th>
                            <th>Total Cash PU Payment</th>
                            <th>Total Cash Dest-Balance</th>
                            <th>Total PMO PU Payment</th>
                            <th>Total PU without Cash & PMO</th>
                            <th>Total Balance without Cash & PMO</th>
                            <th>Total PMO Deliveries</th>
                            <th>Total Dest-Balance Zelle</th>
                            <th class="bg-emerald-700 text-white">Total after Deposit</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="font-bold text-slate-800">
                            <td>$${sumForeman10.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td>$${sumHelpers.toLocaleString()}</td>
                            <td>$${sumDrivers.toLocaleString()}</td>
                            <td>$${sumCashDiesel.toLocaleString()}</td>
                            <td>$${sumCashPu.toLocaleString()}</td>
                            <td>$${sumCashDest.toLocaleString()}</td>
                            <td>$${sumPmoPu.toLocaleString()}</td>
                            <td>$${sumZellePu.toLocaleString()}</td>
                            <td>$${sumDestNoCashPmo.toLocaleString()}</td>
                            <td>$${sumPmoDeliveries.toLocaleString()}</td>
                            <td>$${sumDestZelle.toLocaleString()}</td>
                            <td class="bg-emerald-50 text-emerald-900 font-extrabold">$${sumTotalAfterDeposit.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="mb-6">
                <h3 class="text-xs font-bold uppercase text-slate-600 mb-2">Private Truck Rental Financial Summary (${filteredRentals.length} Records)</h3>
                <table class="table-pdf">
                    <thead>
                        <tr class="rental-header">
                            <th>Total Rental Days</th>
                            <th class="text-emerald-700">Cash Payments</th>
                            <th class="text-blue-700">Other Payments (Zelle/Check)</th>
                            <th class="bg-amber-600 text-white">Grand Total Rental Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="font-bold text-slate-800">
                            <td>${rentalPdfDays} Days</td>
                            <td class="text-emerald-600">$${rentalPdfCash.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td class="text-blue-600">$${rentalPdfOther.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td class="bg-amber-50 text-amber-900 font-extrabold">$${rentalPdfTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="page-break"></div>

            <div class="mt-4">
                <h3 class="text-xs font-bold uppercase text-slate-600 mb-2">1. Detailed Dispatch Operations Ledger (${jobs.length} Records)</h3>
                <table class="table-pdf">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Job No</th>
                            <th>From State</th>
                            <th>To State</th>
                            <th>Foreman Name</th>
                            <th>Foreman 10%</th>
                            <th>Helpers</th>
                            <th>Drivers</th>
                            <th>Total After Deposit</th>
                            <th>P.U Payment</th>
                            <th>Dest Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${jobs.map(j => {
                            const totalNum = parseCurrency(j.total);
                            const foreman10 = totalNum > 0 ? '$' + (totalNum * 0.1).toFixed(2) : '-';
                            const helpersDisplay = j.helpers || '-';
                            const driversDisplay = j.drivers || '-';

                            return `
                                <tr>
                                    <td>${j.date || '-'}</td>
                                    <td class="font-bold">${j.jobNo || '-'}</td>
                                    <td>${j.route ? j.route.split('→')[0] : '-'}</td>
                                    <td>${j.route ? j.route.split('→')[1] || '-' : '-'}</td>
                                    <td>${j.foreman || '-'}</td>
                                    <td class="font-bold text-emerald-700">${foreman10}</td>
                                    <td>${helpersDisplay}</td>
                                    <td>${driversDisplay}</td>
                                    <td class="font-bold text-emerald-600">${j.total || '$0'}</td>
                                    <td>${j.pu || '-'}</td>
                                    <td>${j.dest || j.destination || '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <div class="mt-6">
                <h3 class="text-xs font-bold uppercase text-slate-600 mb-2">2. Private Truck Rental Ledger (${filteredRentals.length} Records)</h3>
                <table class="table-pdf">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Vendor / Truck No</th>
                            <th>Description / Notes</th>
                            <th>Payment Method</th>
                            <th style="text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredRentals.length === 0 ? `<tr><td colspan="5">No truck rental records found.</td></tr>` : filteredRentals.map(r => `
                            <tr>
                                <td>${r.date || '-'}</td>
                                <td class="font-bold">${r.truckLabel || 'Truck Rental'}</td>
                                <td>${r.paidBy || '-'}</td>
                                <td>${r.paymentType || 'Cash'}</td>
                                <td style="text-align: right;" class="font-bold text-amber-600">$${parseCurrency(r.amount).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="mt-6">
                <h3 class="text-xs font-bold uppercase text-slate-600 mb-2">3. Warehouse & Other Expenses Ledger (${filteredWarehouse.length} Records)</h3>
                <table class="table-pdf">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Category / Type</th>
                            <th>Description / Facility</th>
                            <th>Payment Method</th>
                            <th style="text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredWarehouse.length === 0 ? `<tr><td colspan="5">No warehouse records found.</td></tr>` : filteredWarehouse.map(w => `
                            <tr>
                                <td>${w.date || '-'}</td>
                                <td class="font-bold">${w.services || 'Warehouse Expense'}</td>
                                <td>${w.details || '-'}</td>
                                <td>${w.paymentType || 'Cash'}</td>
                                <td style="text-align: right;" class="font-bold text-purple-600">$${parseCurrency(w.amount).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <script>
                window.onload = function() {
                    setTimeout(() => {
                        window.print();
                    }, 500);
                }
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
