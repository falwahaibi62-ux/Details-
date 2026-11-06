/**
 * MovePro - Financial & Operations Reports Module (Production Ready)
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
        if (typeof generateSummaryReportData === 'function') generateSummaryReportData();
    } else {
        summaryView.classList.add('hidden');
        detailedView.classList.remove('hidden');
        if (btnDetailed) btnDetailed.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white transition cursor-pointer';
        if (btnSummary) btnSummary.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer';
        if (typeof generateDetailedReportData === 'function') generateDetailedReportData();
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
    if (!summaryView) {
        if (typeof generateSummaryReportData === 'function') generateSummaryReportData();
        return;
    }
    
    const isSummaryActive = !summaryView.classList.contains('hidden');
    if (isSummaryActive) {
        if (typeof generateSummaryReportData === 'function') generateSummaryReportData();
    } else {
        if (typeof generateDetailedReportData === 'function') generateDetailedReportData();
    }
}
window.applyReportFilters = applyReportFilters;

function filterReportData() {
    applyReportFilters();
}
window.filterReportData = filterReportData;

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

    let startDate = startDateVal ? parseLocalDate(startDateVal) : null;
    let endDate = endDateVal ? parseLocalDate(endDateVal) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);

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
            const paymentField = String(j.paymentType || j.pu || j.dest || j.pu_payments || j.destination_payments || '').toLowerCase();
            if (!paymentField.includes(paymentVal.toLowerCase())) return false;
        }

        return true;
    });
}
window.getFilteredJobsData = getFilteredJobsData;

function processPaymentString(str, map) {
    if (!str) return;
    const raw = String(str).trim();
    if (!raw || raw === '-' || raw === '---' || raw.toUpperCase() === 'NULL') return;

    const parts = raw.split(/[,/]+/);

    parts.forEach(part => {
        const sub = part.trim();
        if (!sub) return;

        const upperSub = sub.toUpperCase();
        const allNums = sub.match(/([0-9,.]+\d)/g);
        let amount = 0;

        if (allNums && allNums.length > 0) {
            if (upperSub.includes('CHEQUE') || upperSub.includes('CHECK') || upperSub.includes('CHQ') || upperSub.includes('CK')) {
                const validNum = allNums.map(n => parseCurrency(n)).find(n => n > 0 && n < 50000);
                amount = validNum || 0; 
            } else {
                amount = parseCurrency(allNums[0]);
            }
        }

        if (upperSub.includes('CHEQUE') || upperSub.includes('CHECK') || upperSub.includes('CK') || upperSub.includes('CHQ') || upperSub.includes('CHEQ')) {
            map.Cheque += (amount > 0 && amount < 50000) ? amount : 0;
            return;
        }

        if (amount <= 0 || amount >= 50000) return;

        const textWithoutNum = sub.replace(/([0-9,.]+)/g, '').trim().toUpperCase();

        if (!textWithoutNum) {
            map.Unspecified += amount;
        } else if (textWithoutNum.includes('CASH')) {
            map.Cash += amount;
        } else if (textWithoutNum.includes('ZELLE')) {
            map.Zelle += amount;
        } else if (textWithoutNum.includes('PMO')) {
            map.PMO += amount;
        } else if (textWithoutNum.includes('BC')) {
            map.BC += amount;
        } else if (textWithoutNum.includes('PC')) {
            map.PC += amount;
        } else if (textWithoutNum.includes('CC')) {
            map.CC += amount;
        } else if (textWithoutNum.includes('WT')) {
            map.WT += amount;
        } else if (textWithoutNum.includes('OTHER') || textWithoutNum.includes('OTHERS')) {
            map.Others += amount;
        } else {
            map.Unspecified += amount;
        }
    });
}
window.processPaymentString = processPaymentString;

// 🌟 توليد تفاصيل وإجمالي جدول إيجارات الشاحنات
function generateTruckRentalSummaryTableHTML() {
    const rentals = window.currentTruckRentals || JSON.parse(localStorage.getItem('movepro_private_truck_rentals')) || [];
    
    const startDateVal = document.getElementById('filterStartDate')?.value;
    const endDateVal = document.getElementById('filterEndDate')?.value;
    const startDate = startDateVal ? parseLocalDate(startDateVal) : null;
    const endDate = endDateVal ? parseLocalDate(endDateVal) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);

    let totalDays = 0;
    let sumCash = 0;
    let sumOther = 0;
    let grandTotal = 0;
    let filteredCount = 0;
    let rowsHTML = '';

    rentals.forEach(r => {
        if (r.date) {
            const rDate = parseLocalDate(r.date);
            if (startDate && rDate < startDate) return;
            if (endDate && rDate > endDate) return;
        }

        filteredCount++;
        const daysNum = parseInt(String(r.days || r.Days || '0').replace(/[^0-9]/g, '')) || 0;
        totalDays += daysNum;

        const amount = parseCurrency(r.amount);
        grandTotal += amount;

        const paymentType = String(r.paymentType || r.paymentMethod || '').toLowerCase();
        let isCash = paymentType.includes('cash');
        if (isCash) {
            sumCash += amount;
        } else {
            sumOther += amount;
        }

        rowsHTML += `
            <tr class="hover:bg-slate-50 transition-colors text-slate-700">
                <td class="p-2 border-r text-center">${r.date || '-'}</td>
                <td class="p-2 border-r text-center font-bold">${r.truckNo || r.truck_no || r.name || '-'}</td>
                <td class="p-2 border-r text-center">${daysNum} Days</td>
                <td class="p-2 border-r text-center font-bold text-amber-600">$${amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                <td class="p-2 text-center uppercase font-semibold ${isCash ? 'text-emerald-600' : 'text-blue-600'}">${r.paymentType || r.paymentMethod || 'Cash'}</td>
            </tr>
        `;
    });

    return {
        count: filteredCount,
        totalDays: totalDays,
        sumCash: sumCash,
        sumOther: sumOther,
        grandTotal: grandTotal,
        html: `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4 mt-6 print:p-2">
                <div class="border-b border-slate-100 pb-3 flex flex-wrap justify-between items-center gap-2">
                    <div>
                        <h3 class="text-sm font-bold text-slate-800">Private Truck Rental Financial Summary & Details</h3>
                        <p class="text-[11px] text-slate-400">Comprehensive summary and individual records of truck rentals</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                            Total Records: <span class="text-emerald-600">${filteredCount}</span>
                        </span>
                    </div>
                </div>

                <div class="overflow-x-auto rounded-xl border border-slate-100 mb-4">
                    <table class="w-full text-left border-collapse text-[11px]">
                        <thead>
                            <tr class="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200/80 text-[10px]">
                                <th class="p-2.5 border-r text-center">Total Days</th>
                                <th class="p-2.5 border-r text-center text-emerald-700 bg-emerald-50/30">Cash Payments</th>
                                <th class="p-2.5 border-r text-center text-blue-700 bg-blue-50/30">Other Payments</th>
                                <th class="p-2.5 text-center bg-amber-600 text-white font-extrabold">Grand Total Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="font-semibold text-slate-700 bg-amber-50/20">
                                <td class="p-2.5 border-r text-center font-bold">${totalDays} Days</td>
                                <td class="p-2.5 border-r text-center text-emerald-600 font-bold">$${sumCash.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td class="p-2.5 border-r text-center text-blue-600 font-bold">$${sumOther.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td class="p-2.5 text-center text-amber-900 font-extrabold">$${grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h4 class="text-xs font-bold text-slate-700 uppercase mt-4 mb-2">Truck Rental Detailed Records</h4>
                <div class="overflow-x-auto rounded-xl border border-slate-100">
                    <table class="w-full text-left border-collapse text-[11px]">
                        <thead>
                            <tr class="bg-slate-100 text-slate-600 uppercase font-bold text-[10px] border-b">
                                <th class="p-2 border-r text-center">Date</th>
                                <th class="p-2 border-r text-center">Truck / Description</th>
                                <th class="p-2 border-r text-center">Days</th>
                                <th class="p-2 border-r text-center">Amount</th>
                                <th class="p-2 text-center">Payment Method</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${rowsHTML || '<tr><td colspan="5" class="p-4 text-center text-slate-400">No rental records found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `
    };
}
window.generateTruckRentalSummaryTableHTML = generateTruckRentalSummaryTableHTML;

// 🌟 توليد تفاصيل وإجمالي جدول المستودع
function generateWarehouseSummaryTableHTML() {
    const warehouse = window.currentWarehouseRecords || JSON.parse(localStorage.getItem('movepro_warehouse_records')) || [];
    
    const startDateVal = document.getElementById('filterStartDate')?.value;
    const endDateVal = document.getElementById('filterEndDate')?.value;
    const startDate = startDateVal ? parseLocalDate(startDateVal) : null;
    const endDate = endDateVal ? parseLocalDate(endDateVal) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);

    let sumCash = 0;
    let sumOthers = 0;
    let grandTotal = 0;
    let filteredCount = 0;
    let rowsHTML = '';

    warehouse.forEach(w => {
        if (w.date) {
            const wDate = parseLocalDate(w.date);
            if (startDate && wDate < startDate) return;
            if (endDate && wDate > endDate) return;
        }

        filteredCount++;
        const amount = parseCurrency(w.amount);
        grandTotal += amount;

        const paymentType = String(w.paymentType || w.paymentMethod || '').toLowerCase();
        let isCash = paymentType.includes('cash');
        if (isCash) {
            sumCash += amount;
        } else {
            sumOthers += amount;
        }

        rowsHTML += `
            <tr class="hover:bg-slate-50 transition-colors text-slate-700">
                <td class="p-2 border-r text-center">${w.date || '-'}</td>
                <td class="p-2 border-r text-center font-bold">${w.description || w.item || w.name || '-'}</td>
                <td class="p-2 border-r text-center font-bold text-purple-600">$${amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                <td class="p-2 text-center uppercase font-semibold ${isCash ? 'text-emerald-600' : 'text-blue-600'}">${w.paymentType || w.paymentMethod || 'Cash'}</td>
            </tr>
        `;
    });

    return {
        count: filteredCount,
        sumCash: sumCash,
        sumOthers: sumOthers,
        grandTotal: grandTotal,
        html: `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4 mt-6 print:p-2">
                <div class="border-b border-slate-100 pb-3 flex flex-wrap justify-between items-center gap-2">
                    <div>
                        <h3 class="text-sm font-bold text-slate-800">Warehouse & Others Financial Summary & Details</h3>
                        <p class="text-[11px] text-slate-400">Comprehensive summary and individual records of warehouse expenses</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                            Total Records: <span class="text-purple-600">${filteredCount}</span>
                        </span>
                    </div>
                </div>

                <div class="overflow-x-auto rounded-xl border border-slate-100 mb-4">
                    <table class="w-full text-left border-collapse text-[11px]">
                        <thead>
                            <tr class="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200/80 text-[10px]">
                                <th class="p-2.5 border-r text-center">Total Items</th>
                                <th class="p-2.5 border-r text-center text-emerald-700 bg-emerald-50/30">Cash Payments</th>
                                <th class="p-2.5 border-r text-center text-blue-700 bg-blue-50/30">Other Payments</th>
                                <th class="p-2.5 text-center bg-purple-700 text-white font-extrabold">Grand Total Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="font-semibold text-slate-700 bg-purple-50/20">
                                <td class="p-2.5 border-r text-center font-bold">${filteredCount} Items</td>
                                <td class="p-2.5 border-r text-center text-emerald-600 font-bold">$${sumCash.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td class="p-2.5 border-r text-center text-blue-600 font-bold">$${sumOthers.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td class="p-2.5 text-center text-purple-900 font-extrabold">$${grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h4 class="text-xs font-bold text-slate-700 uppercase mt-4 mb-2">Warehouse Detailed Records</h4>
                <div class="overflow-x-auto rounded-xl border border-slate-100">
                    <table class="w-full text-left border-collapse text-[11px]">
                        <thead>
                            <tr class="bg-slate-100 text-slate-600 uppercase font-bold text-[10px] border-b">
                                <th class="p-2 border-r text-center">Date</th>
                                <th class="p-2 border-r text-center">Description / Item</th>
                                <th class="p-2 border-r text-center">Amount</th>
                                <th class="p-2 text-center">Payment Method</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${rowsHTML || '<tr><td colspan="4" class="p-4 text-center text-slate-400">No warehouse records found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `
    };
}
window.generateWarehouseSummaryTableHTML = generateWarehouseSummaryTableHTML;

function generatePaymentMethodSummaryTableHTML() {
    const jobs = getFilteredJobsData();
    const rentals = window.currentTruckRentals || JSON.parse(localStorage.getItem('movepro_private_truck_rentals')) || [];
    const warehouse = window.currentWarehouseRecords || JSON.parse(localStorage.getItem('movepro_warehouse_records')) || [];

    let totals = {
        Cash: 0,
        Cheque: 0,
        Zelle: 0,
        PMO: 0,
        Card: 0,
        Other: 0,
        Unspecified: 0
    };

    jobs.forEach(item => {
        const puStr = String(item.pu || item.pu_payments || '').trim();
        const destStr = String(item.dest || item.destination || item.destination_payments || '').trim();
        const fallbackAmt = parseCurrency(item.total || item.total_amount) / 2;

        [puStr, destStr].forEach(str => {
            if (!str || str === '-' || str === '---') return;
            
            let amt = parseCurrency(str);
            const upper = str.toUpperCase();

            if (amt <= 0 || amt >= 50000) {
                amt = fallbackAmt > 0 ? fallbackAmt : 0;
            }
            if (amt <= 0) return;

            if (upper.includes('CASH')) {
                totals.Cash += amt;
            } else if (upper.includes('CHEQUE') || upper.includes('CHECK') || upper.includes('CHQ')) {
                totals.Cheque += amt;
            } else if (upper.includes('ZELLE')) {
                totals.Zelle += amt;
            } else if (upper.includes('PMO')) {
                totals.PMO += amt;
            } else if (upper.includes('CARD') || upper.includes('CC')) {
                totals.Card += amt;
            } else if (upper.includes('OTHER') || upper.includes('OTHERS')) {
                totals.Other += amt;
            } else {
                totals.Unspecified += amt;
            }
        });
    });

    [...rentals, ...warehouse].forEach(item => {
        const amt = parseCurrency(item.amount);
        const pType = String(item.paymentType || item.paymentMethod || '').trim().toLowerCase();

        if (amt <= 0) return;

        if (!pType || pType === '-' || pType === 'cash') {
            totals.Cash += amt;
        } else if (pType.includes('cheque') || pType.includes('check')) {
            totals.Cheque += amt;
        } else if (pType.includes('zelle')) {
            totals.Zelle += amt;
        } else if (pType.includes('card')) {
            totals.Card += amt;
        } else {
            totals.Other += amt;
        }
    });

    const grandTotalMethods = Object.values(totals).reduce((a, b) => a + b, 0);

    return {
        totals: totals,
        html: `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4 mt-6 print:p-2">
                <div class="border-b border-slate-100 pb-3 flex flex-wrap justify-between items-center gap-2">
                    <div>
                        <h3 class="text-sm font-bold text-slate-800">Payment Methods Summary Breakdown</h3>
                        <p class="text-[11px] text-slate-400">Detailed distribution of revenue and expenses by payment methods</p>
                    </div>
                </div>

                <div class="overflow-x-auto rounded-xl border border-slate-100">
                    <table class="w-full text-left border-collapse text-[11px]">
                        <thead>
                            <tr class="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200/80 text-[10px]">
                                <th class="p-2.5 border-r text-center text-emerald-700">Cash</th>
                                <th class="p-2.5 border-r text-center text-slate-700">Cheque</th>
                                <th class="p-2.5 border-r text-center text-blue-700">Zelle</th>
                                <th class="p-2.5 border-r text-center text-indigo-700">PMO</th>
                                <th class="p-2.5 border-r text-center text-purple-700">Card</th>
                                <th class="p-2.5 border-r text-center text-amber-700">Other</th>
                                <th class="p-2.5 border-r text-center text-slate-600">Unspecified</th>
                                <th class="p-2.5 text-center bg-emerald-600 text-white font-extrabold">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody class="font-semibold text-slate-700 divide-y divide-slate-100">
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="p-2.5 border-r text-center text-emerald-600 font-bold bg-emerald-50/20">$${totals.Cash.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td class="p-2.5 border-r text-center font-bold">$${totals.Cheque.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td class="p-2.5 border-r text-center text-blue-600 font-bold bg-blue-50/20">$${totals.Zelle.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td class="p-2.5 border-r text-center text-indigo-600 font-bold">$${totals.PMO.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td class="p-2.5 border-r text-center text-purple-600 font-bold">$${totals.Card.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td class="p-2.5 border-r text-center text-amber-600 font-bold bg-amber-50/20">$${totals.Other.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td class="p-2.5 border-r text-center text-slate-500 font-bold">$${totals.Unspecified.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td class="p-2.5 text-center bg-emerald-50 text-emerald-900 font-extrabold text-xs">$${grandTotalMethods.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `
    };
}
window.generatePaymentMethodSummaryTableHTML = generatePaymentMethodSummaryTableHTML;

function generateOfficialSummaryTable(filteredJobs) {
    let sumForeman10 = 0, sumHelpers = 0, sumDrivers = 0, sumCashDiesel = 0;
    let sumCashPu = 0, sumCashDest = 0, sumPmoPu = 0, sumZellePu = 0;
    let sumDestZelle = 0, sumDestNoCashPmo = 0, sumPmoDeliveries = 0, sumTotalAfterDeposit = 0;

    filteredJobs.forEach(item => {
        const totalVal = parseCurrency(item.total || item.total_amount);
        sumTotalAfterDeposit += totalVal;
        sumForeman10 += totalVal > 0 ? (totalVal * 0.1) : 0;
        sumHelpers += parseCurrency(item.helpers || item.helpers_cost);
        sumDrivers += parseCurrency(item.drivers || item.drivers_cost);

        // 🌟 استخراج دقيق لـ Cash Diesel فقط القيم التي تحتوي على كلمة cash
        const dieselValStr = item.diesel || item.diesel_expense;
        if (dieselValStr && dieselValStr !== '-') {
            let dieselStr = String(dieselValStr);
            let dieselParts = dieselStr.split('+');
            dieselParts.forEach(part => {
                const partLower = part.toLowerCase().trim();
                if (partLower.includes('cash')) {
                    const cleanNum = parseCurrency(part);
                    if (cleanNum > 0 && cleanNum < 50000) {
                        sumCashDiesel += cleanNum;
                    }
                }
            });
        }

        const puStr = String(item.pu || item.pu_payments || '').toLowerCase();
        let cashPuVal = 0;
        if (puStr.includes('cash')) {
            const cashMatch = puStr.match(/([0-9,.]+)\s*(?:\$)?\s*cash/);
            cashPuVal = cashMatch ? parseCurrency(cashMatch[1]) : parseCurrency(item.pu || item.pu_payments);
            sumCashPu += cashPuVal;
        }

        let pmoPuVal = 0;
        if (puStr.includes('pmo')) {
            const pmoMatch = puStr.match(/([0-9,.]+)\s*(?:\$)?\s*pmo/);
            pmoPuVal = pmoMatch ? parseCurrency(pmoMatch[1]) : parseCurrency(item.pu || item.pu_payments);
            sumPmoPu += pmoPuVal;
        }

        const rawPuVal = parseCurrency(item.pu || item.pu_payments);
        const puVal = (rawPuVal < 50000) ? rawPuVal : 0;

        let netPuWithoutCashPmo = puVal;
        if (puStr.includes('cash')) netPuWithoutCashPmo -= cashPuVal;
        if (puStr.includes('pmo')) netPuWithoutCashPmo -= pmoPuVal;

        if (netPuWithoutCashPmo > 0) sumZellePu += netPuWithoutCashPmo;

        const destStr = String(item.dest || item.destination || item.destination_payments || '').toLowerCase();
        let cashDestVal = 0;
        if (destStr.includes('cash')) {
            const cashDestMatch = destStr.match(/([0-9,.]+)\s*(?:\$)?\s*cash/);
            cashDestVal = cashDestMatch ? parseCurrency(cashDestMatch[1]) : parseCurrency(item.dest || item.destination || item.destination_payments);
        }

        const rawDestVal = parseCurrency(item.dest || item.destination || item.destination_payments);
        const destVal = (rawDestVal < 50000) ? rawDestVal : 0;

        if (destStr.includes('cash')) {
            sumCashDest += (cashDestVal > 0 ? cashDestVal : destVal);
        } else if (destStr.includes('zelle')) {
            sumDestZelle += destVal;
            sumDestNoCashPmo += destVal;
        } else if (!destStr.includes('pmo') && destVal > 0) {
            sumDestNoCashPmo += destVal;
        }

        if ((item.jobNo || item.job_no) && String(item.jobNo || item.job_no).toLowerCase().includes('delivery') && puStr.includes('pmo')) {
            sumPmoDeliveries += puVal;
        }
    });

    const rentalSummaryObj = generateTruckRentalSummaryTableHTML();
    const warehouseSummaryObj = generateWarehouseSummaryTableHTML();
    const paymentMethodsObj = generatePaymentMethodSummaryTableHTML();

    return `
        <div class="space-y-6">
            ${paymentMethodsObj.html}
            
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4 mt-6 print:p-2">
                <div class="border-b border-slate-100 pb-3 flex flex-wrap justify-between items-center gap-2">
                    <div>
                        <h3 class="text-sm font-bold text-slate-800">Official Period Financial Summary</h3>
                        <p class="text-[11px] text-slate-400">Comprehensive summary of labor fees, cash, Zelle, and PMO breakdown</p>
                    </div>
                </div>

                <div class="overflow-x-auto rounded-xl border border-slate-100">
                    <table class="w-full text-left border-collapse text-[11px]">
                        <thead>
                            <tr class="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200/80 text-[10px]">
                                <th class="p-2.5 border-r text-center">Foreman</th>
                                <th class="p-2.5 border-r text-center">Helpers</th>
                                <th class="p-2.5 border-r text-center">Drivers</th>
                                <th class="p-2.5 border-r text-center text-amber-700 bg-amber-50/50">Cash Diesel</th>
                                <th class="p-2.5 border-r text-center text-emerald-700 bg-emerald-50/30">Cash PU Payment</th>
                                <th class="p-2.5 border-r text-center text-emerald-700 bg-emerald-50/30">Cash Dest-Balance</th>
                                <th class="p-2.5 border-r text-center">PMO PU Payment</th>
                                <th class="p-2.5 border-r text-center text-blue-700 bg-blue-50/30">PU (No Cash/PMO)</th>
                                <th class="p-2.5 border-r text-center text-blue-700 bg-blue-50/30">Balance (No Cash/PMO)</th>
                                <th class="p-2.5 border-r text-center">PMO Deliveries</th>
                                <th class="p-2.5 border-r text-center text-purple-700 bg-purple-50/30">Dest Balance Zelle</th>
                                <th class="p-2.5 text-center bg-emerald-600 text-white font-extrabold">Total After Deposit</th>
                            </tr>
                        </thead>
                        <tbody class="font-semibold text-slate-700 divide-y divide-slate-100">
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="p-2.5 border-r text-center">$${sumForeman10.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td class="p-2.5 border-r text-center">$${sumHelpers.toLocaleString('en-US')}</td>
                                <td class="p-2.5 border-r text-center">$${sumDrivers.toLocaleString('en-US')}</td>
                                <td class="p-2.5 border-r text-center text-amber-700 font-bold bg-amber-50/20">$${sumCashDiesel.toLocaleString('en-US')}</td>
                                <td class="p-2.5 border-r text-center text-emerald-600 font-bold">$${sumCashPu.toLocaleString('en-US')}</td>
                                <td class="p-2.5 border-r text-center text-emerald-600 font-bold">$${sumCashDest.toLocaleString('en-US')}</td>
                                <td class="p-2.5 border-r text-center">$${sumPmoPu.toLocaleString('en-US')}</td>
                                <td class="p-2.5 border-r text-center text-blue-600 font-bold">$${sumZellePu.toLocaleString('en-US')}</td>
                                <td class="p-2.5 border-r text-center text-blue-600 font-bold">$${sumDestNoCashPmo.toLocaleString('en-US')}</td>
                                <td class="p-2.5 border-r text-center">$${sumPmoDeliveries.toLocaleString('en-US')}</td>
                                <td class="p-2.5 border-r text-center text-purple-600 font-bold">$${sumDestZelle.toLocaleString('en-US')}</td>
                                <td class="p-2.5 border-r text-center bg-emerald-50 text-emerald-800 font-extrabold text-xs">$${sumTotalAfterDeposit.toLocaleString('en-US')}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            ${rentalSummaryObj.html}
            ${warehouseSummaryObj.html}
        </div>
    `;
}
window.generateOfficialSummaryTable = generateOfficialSummaryTable;

// 🌟 توليد وتعبئة الشاشة التفصيلية (Detailed View) لضمان عدم ظهورها فارغة
function generateDetailedReportData() {
    const container = document.getElementById('detailedReportBody');
    if (!container) return;

    const jobs = getFilteredJobsData();

    container.innerHTML = jobs.map(j => {
        const totalNum = parseCurrency(j.total || j.total_amount);
        const foreman10 = totalNum > 0 ? '$' + (totalNum * 0.1).toFixed(2) : '-';
        const helpersDisplay = typeof window.parseHelpersDisplay === 'function' ? window.parseHelpersDisplay(j.helpers || j.helpers_cost) : (j.helpers || j.helpers_cost || '-');
        const driversDisplay = typeof window.parseDriversDisplay === 'function' ? window.parseDriversDisplay(j.drivers || j.drivers_cost) : (j.drivers || j.drivers_cost || '-');
        const dieselDisplay = j.diesel || j.diesel_expense || '-';
        const hotelDisplay = j.hotel || j.hotel_expense || '-';

        return `
            <tr class="hover:bg-slate-50 transition-colors text-slate-700 text-xs">
                <td class="p-2.5 border-r text-center">${j.date || '-'}</td>
                <td class="p-2.5 border-r text-center font-bold">${j.jobNo || j.job_no || '-'}</td>
                <td class="p-2.5 border-r text-center">${j.route ? j.route.split('→')[0] : (j.route_from || '-')}</td>
                <td class="p-2.5 border-r text-center">${j.route ? j.route.split('→')[1] || '-' : (j.route_to || '-')}</td>
                <td class="p-2.5 border-r text-center">${j.foreman || j.foreman_name || '-'}</td>
                <td class="p-2.5 border-r text-center font-bold text-emerald-700">${foreman10}</td>
                <td class="p-2.5 border-r text-center">${helpersDisplay}</td>
                <td class="p-2.5 border-r text-center">${driversDisplay}</td>
                <td class="p-2.5 border-r text-center font-bold text-amber-700 bg-amber-50/20">${dieselDisplay}</td>
                <td class="p-2.5 border-r text-center font-bold text-blue-700 bg-blue-50/20">${hotelDisplay}</td>
                <td class="p-2.5 border-r text-center font-bold text-emerald-600">${j.total || j.total_amount || '$0'}</td>
                <td class="p-2.5 border-r text-center">${j.pu || j.pu_payments || '-'}</td>
                <td class="p-2.5 text-center">${j.dest || j.destination || j.destination_payments || '-'}</td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="13" class="p-6 text-center text-slate-400">No dispatch operations records found</td></tr>';
}
window.generateDetailedReportData = generateDetailedReportData;

function updateSummaryReportView(filteredData) {
    try {
        const container = document.getElementById('summaryReportContainer');
        if (!container) return;

        container.innerHTML = generateOfficialSummaryTable(filteredData);

        const totalJobsEl = document.getElementById('sumTotalJobs');
        const totalDeliveriesEl = document.getElementById('sumTotalDeliveries');
        const totalRevenueEl = document.getElementById('sumTotalRevenue');
        const totalExpensesEl = document.getElementById('sumTotalExpenses');

        if (totalJobsEl) totalJobsEl.innerText = filteredData.length;
        
        let deliveriesCount = filteredData.filter(item => {
            const jNo = String(item.jobNo || item.job_no || '').toLowerCase();
            return jNo.includes('delivery') || jNo === '';
        }).length;
        if (totalDeliveriesEl) totalDeliveriesEl.innerText = deliveriesCount;

        let totalRev = filteredData.reduce((sum, item) => sum + parseCurrency(item.total || item.total_amount), 0);
        if (totalRevenueEl) totalRevenueEl.innerText = '$' + totalRev.toLocaleString('en-US', {minimumFractionDigits: 2});

        let totalExp = filteredData.reduce((sum, item) => sum + parseCurrency(item.diesel || item.diesel_expense) + parseCurrency(item.hotel || item.hotel_expense), 0);
        if (totalExpensesEl) totalExpensesEl.innerText = '$' + totalExp.toLocaleString('en-US', {minimumFractionDigits: 2});

    } catch (e) {
        console.error("Error updating summary report view:", e);
    }
}
window.updateSummaryReportView = updateSummaryReportView;

function generateSummaryReportData() {
    const filteredData = typeof getFilteredJobsData === 'function' ? getFilteredJobsData() : (window.masterJobs || []);
    updateSummaryReportView(filteredData);
    if (typeof generateDetailedReportData === 'function') {
        generateDetailedReportData();
    }
}
window.generateSummaryReportData = generateSummaryReportData;

function exportOfficialPDF() {
    const jobs = getFilteredJobsData();
    const rentals = window.currentTruckRentals || JSON.parse(localStorage.getItem('movepro_private_truck_rentals')) || [];
    const warehouse = window.currentWarehouseRecords || JSON.parse(localStorage.getItem('movepro_warehouse_records')) || [];

    const startDateVal = document.getElementById('filterStartDate')?.value || 'All Dates';
    const endDateVal = document.getElementById('filterEndDate')?.value || 'All Dates';

    const startDate = startDateVal !== 'All Dates' ? parseLocalDate(startDateVal) : null;
    const endDate = endDateVal !== 'All Dates' ? parseLocalDate(endDateVal) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const filteredRentals = rentals.filter(r => {
        if (!r.date) return true;
        const rDate = parseLocalDate(r.date);
        if (startDate && rDate < startDate) return false;
        if (endDate && rDate > endDate) return false;
        return true;
    });

    const filteredWarehouse = warehouse.filter(w => {
        if (!w.date) return true;
        const wDate = parseLocalDate(w.date);
        if (startDate && wDate < startDate) return false;
        if (endDate && wDate > endDate) return false;
        return true;
    });

    const paymentMethodObj = generatePaymentMethodSummaryTableHTML();

    let sumForeman10 = 0, sumHelpers = 0, sumDrivers = 0, sumCashDiesel = 0;
    let sumCashPu = 0, sumCashDest = 0, sumPmoPu = 0, sumZellePu = 0;
    let sumDestZelle = 0, sumDestNoCashPmo = 0, sumPmoDeliveries = 0, sumTotalAfterDeposit = 0;

    jobs.forEach(item => {
        const totalVal = parseCurrency(item.total || item.total_amount);
        sumTotalAfterDeposit += totalVal;
        sumForeman10 += totalVal > 0 ? (totalVal * 0.1) : 0;
        sumHelpers += parseCurrency(item.helpers || item.helpers_cost);
        sumDrivers += parseCurrency(item.drivers || item.drivers_cost);

        const dieselValStr = item.diesel || item.diesel_expense;
        if (dieselValStr && dieselValStr !== '-') {
            let dieselStr = String(dieselValStr);
            let dieselParts = dieselStr.split('+');
            dieselParts.forEach(part => {
                if (part.toLowerCase().includes('cash')) {
                    sumCashDiesel += parseCurrency(part);
                }
            });
        }

        const puStr = String(item.pu || item.pu_payments || '').toLowerCase();
        let cashPuVal = 0;
        if (puStr.includes('cash')) {
            const cashMatch = puStr.match(/([0-9,.]+)\s*(?:\$)?\s*cash/);
            cashPuVal = cashMatch ? parseCurrency(cashMatch[1]) : parseCurrency(item.pu || item.pu_payments);
            sumCashPu += cashPuVal;
        }

        let pmoPuVal = 0;
        if (puStr.includes('pmo')) {
            const pmoMatch = puStr.match(/([0-9,.]+)\s*(?:\$)?\s*pmo/);
            pmoPuVal = pmoMatch ? parseCurrency(pmoMatch[1]) : parseCurrency(item.pu || item.pu_payments);
            sumPmoPu += pmoPuVal;
        }

        const rawPuVal = parseCurrency(item.pu || item.pu_payments);
        const puVal = (rawPuVal < 50000) ? rawPuVal : 0;

        let netPuWithoutCashPmo = puVal;
        if (puStr.includes('cash')) netPuWithoutCashPmo -= cashPuVal;
        if (puStr.includes('pmo')) netPuWithoutCashPmo -= pmoPuVal;

        if (netPuWithoutCashPmo > 0) sumZellePu += netPuWithoutCashPmo;

        const destStr = String(item.dest || item.destination || item.destination_payments || '').toLowerCase();
        let cashDestVal = 0;
        if (destStr.includes('cash')) {
            const cashDestMatch = destStr.match(/([0-9,.]+)\s*(?:\$)?\s*cash/);
            cashDestVal = cashDestMatch ? parseCurrency(cashDestMatch[1]) : parseCurrency(item.dest || item.destination || item.destination_payments);
        }

        const rawDestVal = parseCurrency(item.dest || item.destination || item.destination_payments);
        const destVal = (rawDestVal < 50000) ? rawDestVal : 0;

        if (destStr.includes('cash')) {
            sumCashDest += (cashDestVal > 0 ? cashDestVal : destVal);
        } else if (destStr.includes('zelle')) {
            sumDestZelle += destVal;
            sumDestNoCashPmo += destVal;
        } else if (!destStr.includes('pmo') && destVal > 0) {
            sumDestNoCashPmo += destVal;
        }

        if ((item.jobNo || item.job_no) && String(item.jobNo || item.job_no).toLowerCase().includes('delivery') && puStr.includes('pmo')) {
            sumPmoDeliveries += puVal;
        }
    });

    let rentalPdfDays = 0, rentalPdfCash = 0, rentalPdfOther = 0, rentalPdfTotal = 0;
    filteredRentals.forEach(r => {
        rentalPdfDays += parseInt(String(r.days || r.Days || '0').replace(/[^0-9]/g, '')) || 0;
        const amt = parseCurrency(r.amount);
        rentalPdfTotal += amt;
        if (String(r.paymentType || r.paymentMethod || '').toLowerCase().includes('cash')) rentalPdfCash += amt;
        else rentalPdfOther += amt;
    });

    let warehousePdfCash = 0, warehousePdfOthers = 0, warehousePdfTotal = 0;
    filteredWarehouse.forEach(w => {
        const amt = parseCurrency(w.amount);
        warehousePdfTotal += amt;
        if (String(w.paymentType || w.paymentMethod || '').toLowerCase().includes('cash')) warehousePdfCash += amt;
        else warehousePdfOthers += amt;
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
                @page { size: A4 landscape; margin: 6mm; }
                body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; background: #fff; padding: 10px; }
                .table-pdf { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 12px; page-break-inside: avoid; }
                .table-pdf th { background-color: #f1f5f9; color: #334155; font-weight: 700; border: 1px solid #cbd5e1; padding: 5px; text-align: center; }
                .table-pdf td { border: 1px solid #e2e8f0; padding: 4px; text-align: center; }
                .page-break { page-break-before: always; }
                .summary-header { background-color: #e2e8f0; color: #0f172a; font-weight: bold; }
                .rental-header { background-color: #f8fafc; color: #1e293b; font-weight: bold; }
                .warehouse-header { background-color: #faf5ff; color: #581c87; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="text-center mb-4 border-b pb-3">
                <h1 class="text-xl font-bold text-emerald-800">Total Cash, PMO & Expenses Report</h1>
                <p class="text-xs font-semibold text-slate-600 mt-1">Period: <span class="text-slate-800">${startDateVal}</span> to <span class="text-slate-800">${endDateVal}</span></p>
            </div>

            <div class="mb-4">
                ${paymentMethodObj.html}
            </div>

            <div class="mb-4">
                <h3 class="text-xs font-bold uppercase text-slate-600 mb-1">Executive Financial Summary</h3>
                <table class="table-pdf">
                    <thead>
                        <tr class="summary-header">
                            <th>Foreman 10%</th>
                            <th>Helpers</th>
                            <th>Drivers</th>
                            <th>Cash Diesel</th>
                            <th>Cash PU</th>
                            <th>Cash Dest</th>
                            <th>PMO PU</th>
                            <th>PU (No Cash/PMO)</th>
                            <th>Balance (No Cash/PMO)</th>
                            <th>PMO Deliveries</th>
                            <th>Dest Zelle</th>
                            <th class="bg-emerald-700 text-white">Total After Deposit</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="font-bold text-slate-800">
                            <td>$${sumForeman10.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            <td>$${sumHelpers.toLocaleString('en-US')}</td>
                            <td>$${sumDrivers.toLocaleString('en-US')}</td>
                            <td>$${sumCashDiesel.toLocaleString('en-US')}</td>
                            <td>$${sumCashPu.toLocaleString('en-US')}</td>
                            <td>$${sumCashDest.toLocaleString('en-US')}</td>
                            <td>$${sumPmoPu.toLocaleString('en-US')}</td>
                            <td>$${sumZellePu.toLocaleString('en-US')}</td>
                            <td>$${sumDestNoCashPmo.toLocaleString('en-US')}</td>
                            <td>$${sumPmoDeliveries.toLocaleString('en-US')}</td>
                            <td>$${sumDestZelle.toLocaleString('en-US')}</td>
                            <td class="bg-emerald-50 text-emerald-900 font-extrabold">$${sumTotalAfterDeposit.toLocaleString('en-US')}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="mb-4">
                <h3 class="text-xs font-bold uppercase text-slate-600 mb-1">Private Truck Rental Financial Summary (${filteredRentals.length} Records)</h3>
                <table class="table-pdf">
                    <thead>
                        <tr class="rental-header">
                            <th>Total Rental Days</th>
                            <th class="text-emerald-700">Cash Payments</th>
                            <th class="text-blue-700">Other Payments</th>
                            <th class="bg-amber-600 text-white">Grand Total Rental Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="font-bold text-slate-800">
                            <td>${rentalPdfDays} Days</td>
                            <td class="text-emerald-600">$${rentalPdfCash.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            <td class="text-blue-600">$${rentalPdfOther.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            <td class="bg-amber-50 text-amber-900 font-extrabold">$${rentalPdfTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="mb-4">
                <h3 class="text-xs font-bold uppercase text-slate-600 mb-1">Warehouse & Others Financial Summary (${filteredWarehouse.length} Records)</h3>
                <table class="table-pdf">
                    <thead>
                        <tr class="warehouse-header">
                            <th>Total Items / Expenses</th>
                            <th class="text-emerald-700">Cash Payments</th>
                            <th class="text-blue-700">Other Payments</th>
                            <th class="bg-purple-700 text-white">Grand Total Warehouse Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="font-bold text-slate-800">
                            <td>${filteredWarehouse.length} Items</td>
                            <td class="text-emerald-600">$${warehousePdfCash.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            <td class="text-blue-600">$${warehousePdfOthers.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            <td class="bg-purple-50 text-purple-900 font-extrabold">$${warehousePdfTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="page-break"></div>

            <div class="mt-4">
                <h3 class="text-xs font-bold uppercase text-slate-600 mb-1">Detailed Dispatch Operations Ledger (${jobs.length} Records)</h3>
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
                            <th>Diesel</th>
                            <th>Hotel</th>
                            <th>Total After Deposit</th>
                            <th>P.U Payment</th>
                            <th>Dest Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${jobs.map(j => {
                            const totalNum = parseCurrency(j.total || j.total_amount);
                            const foreman10 = totalNum > 0 ? '$' + (totalNum * 0.1).toFixed(2) : '-';
                            const helpersDisplay = typeof window.parseHelpersDisplay === 'function' ? window.parseHelpersDisplay(j.helpers || j.helpers_cost) : (j.helpers || j.helpers_cost || '-');
                            const driversDisplay = typeof window.parseDriversDisplay === 'function' ? window.parseDriversDisplay(j.drivers || j.drivers_cost) : (j.drivers || j.drivers_cost || '-');

                            return `
                                <tr>
                                    <td>${j.date || '-'}</td>
                                    <td class="font-bold">${j.jobNo || j.job_no || '-'}</td>
                                    <td>${j.route ? j.route.split('→')[0] : (j.route_from || '-')}</td>
                                    <td>${j.route ? j.route.split('→')[1] || '-' : (j.route_to || '-')}</td>
                                    <td>${j.foreman || j.foreman_name || '-'}</td>
                                    <td class="font-bold text-emerald-700">${foreman10}</td>
                                    <td>${helpersDisplay}</td>
                                    <td>${driversDisplay}</td>
                                    <td>${j.diesel || j.diesel_expense || '-'}</td>
                                    <td>${j.hotel || j.hotel_expense || '-'}</td>
                                    <td class="font-bold text-emerald-600">${j.total || j.total_amount || '$0'}</td>
                                    <td>${j.pu || j.pu_payments || '-'}</td>
                                    <td>${j.dest || j.destination || j.destination_payments || '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <script>
                window.onload = function() {
                    setTimeout(() => { window.print(); }, 400);
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

// 🌟 تسجيل وتصدير كافة الدوال لتعمل بنجاح تام
window.switchReportMode = switchReportMode;
window.parseCurrency = parseCurrency;
window.applyReportFilters = applyReportFilters;
window.filterReportData = filterReportData;
window.resetReportFilters = resetReportFilters;
window.parseLocalDate = parseLocalDate;
window.getFilteredJobsData = getFilteredJobsData;
window.processPaymentString = processPaymentString;
window.generateTruckRentalSummaryTableHTML = generateTruckRentalSummaryTableHTML;
window.generateWarehouseSummaryTableHTML = generateWarehouseSummaryTableHTML;
window.generatePaymentMethodSummaryTableHTML = generatePaymentMethodSummaryTableHTML;
window.generateOfficialSummaryTable = generateOfficialSummaryTable;
window.generateDetailedReportData = generateDetailedReportData;
window.updateSummaryReportView = updateSummaryReportView;
window.generateSummaryReportData = generateSummaryReportData;
window.exportOfficialPDF = exportOfficialPDF;
window.renderReportsTab = renderReportsTab;
