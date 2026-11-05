/**
 * MovePro - Financial & Operations Reports Module (Production Ready & Strict Classification)
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

// ==========================================
// 🌟 Isolated Filter Logic for Reports Tab
// ==========================================
function filterReportData() {
    const fromInput = document.getElementById('reportFromDate') || document.getElementById('filterStartDate');
    const toInput = document.getElementById('reportToDate') || document.getElementById('filterEndDate');
    
    const reportFromDate = fromInput ? fromInput.value : '';
    const reportToDate = toInput ? toInput.value : '';

    let data = window.masterJobs || [];

    if (reportFromDate) {
        const fDate = new Date(reportFromDate);
        data = data.filter(item => new Date(item.date) >= fDate);
    }

    if (reportToDate) {
        const tDate = new Date(reportToDate);
        tDate.setHours(23, 59, 59);
        data = data.filter(item => new Date(item.date) <= tDate);
    }

    if (typeof updateDashboardAnalytics === 'function') {
        updateDashboardAnalytics(data);
    }
}

// 🌟 Safety Bridge: Protects against cross-script ReferenceErrors
if (typeof filterLedgerTable !== 'function') {
    window.filterLedgerTable = function() {
        if (typeof applyReportFilters === 'function') {
            applyReportFilters();
        }
    };
}

function applyReportFilters() {
    const summaryView = document.getElementById('summaryReportView');
    if (!summaryView) {
        generateSummaryReportData();
        return;
    }
    
    const isSummaryActive = !summaryView.classList.contains('hidden');
    if (isSummaryActive) {
        generateSummaryReportData();
    } else {
        generateDetailedReportData();
    }
}

window.filterReportData = filterReportData;
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

// Process and classify payment types
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

function assignPaymentMethodRevenue(methodStr, amount, map) {
    processPaymentString(methodStr, map);
}

// Summary table for Truck Rentals
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
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4 mt-6 print:p-2">
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
                                <td class="p-2.5 border-r text-center text-emerald-600 font-bold bg-emerald-50/20">$${sumCash.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td class="p-2.5 border-r text-center text-blue-600 font-bold bg-blue-50/20">$${sumOther.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td class="p-2.5 text-center bg-amber-50 text-amber-900 font-extrabold text-xs">$${grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `
    };
}

// Summary table for Warehouse expenses
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
        if (paymentType.includes('cash')) {
            sumCash += amount;
        } else {
            sumOthers += amount;
        }
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
                        <h3 class="text-sm font-bold text-slate-800">Warehouse & Others Financial Summary</h3>
                        <p class="text-[11px] text-slate-400">Comprehensive summary of warehouse expenses, materials, rent, and other operational costs</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                            Total Records: <span class="text-purple-600">${filteredCount}</span>
                        </span>
                    </div>
                </div>

                <div class="overflow-x-auto rounded-xl border border-slate-100">
                    <table class="w-full text-left border-collapse text-[11px]">
                        <thead>
                            <tr class="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200/80 text-[10px]">
                                <th class="p-2.5 border-r border-slate-200/60 text-center">Total Items / Expenses</th>
                                <th class="p-2.5 border-r border-slate-200/60 text-center text-emerald-700 bg-emerald-50/30">Cash Payments</th>
                                <th class="p-2.5 border-r border-slate-200/60 text-center text-blue-700 bg-blue-50/30">Other Payments (Others)</th>
                                <th class="p-2.5 text-center bg-purple-700 text-white font-extrabold">Grand Total Warehouse Cost</th>
                            </tr>
                        </thead>
                        <tbody class="font-semibold text-slate-700 divide-y divide-slate-100">
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="p-2.5 border-r text-center font-bold text-slate-800">${filteredCount} Items</td>
                                <td class="p-2.5 border-r text-center text-emerald-600 font-bold bg-emerald-50/20">$${sumCash.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td class="p-2.5 border-r text-center text-blue-600 font-bold bg-blue-50/20">$${sumOthers.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td class="p-2.5 text-center bg-purple-50 text-purple-900 font-extrabold text-xs">$${grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
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

    let sumForeman10 = 0, sumHelpers = 0, sumDrivers = 0, sumCashDiesel = 0;
    let sumCashPu = 0, sumCashDest = 0, sumPmoPu = 0, sumZellePu = 0;
    let sumDestZelle = 0, sumDestNoCashPmo = 0, sumPmoDeliveries = 0, sumTotalAfterDeposit = 0;

    const payMap = {
        Cash: 0, Zelle: 0, Cheque: 0, PMO: 0, BC: 0, PC: 0, CC: 0, WT: 0, Others: 0, Unspecified: 0
    };

    filteredJobs.forEach(item => {
        const totalVal = parseCurrency(item.total || item.total_amount);
        sumTotalAfterDeposit += totalVal;
        sumForeman10 += totalVal > 0 ? (totalVal * 0.1) : 0;

        const helpersStr = String(item.helpers || item.helpers_cost || '');
        const helperMatch = helpersStr.match(/\(([^)]+)\)/);
        if (helperMatch) {
            sumHelpers += parseCurrency(helperMatch[1]);
        } else {
            sumHelpers += parseCurrency(helpersStr);
        }

        const driversStr = String(item.drivers || item.drivers_cost || '');
        const driverMatch = driversStr.match(/\(([^)]+)\)/);
        if (driverMatch) {
            sumDrivers += parseCurrency(driverMatch[1]);
        } else {
            sumDrivers += parseCurrency(driversStr);
        }

        const dieselValStr = item.diesel || item.diesel_expense;
        if (dieselValStr && dieselValStr !== '-') {
            let dieselStr = String(dieselValStr);
            let dieselParts = dieselStr.split('+');
            dieselParts.forEach(part => {
                let partLower = part.toLowerCase().trim();
                if (partLower.includes('cash')) {
                    let cleanNum = parseFloat(part.replace(/[^0-9.]/g, '')) || 0;
                    if (cleanNum > 0 && cleanNum < 5000) {
                        sumCashDiesel += cleanNum;
                    }
                }
            });
        }

        const puRawStr = String(item.pu || item.pu_payments || '').trim();
        if (puRawStr && puRawStr !== '-' && puRawStr !== '---') {
            processPaymentString(puRawStr, payMap);
            const puParts = puRawStr.split(/[,/]+/);
            puParts.forEach(part => {
                const partVal = parseCurrency(part);
                if (partVal > 0 && partVal < 50000) {
                    const pLower = part.toLowerCase();
                    if (pLower.includes('cash')) sumCashPu += partVal;
                    else if (pLower.includes('pmo')) {
                        sumPmoPu += partVal;
                        if (item.jobNo && String(item.jobNo).toLowerCase().includes('delivery')) sumPmoDeliveries += partVal;
                    } else sumZellePu += partVal;
                }
            });
        }

        const isDelivery = item.jobNo && String(item.jobNo).toLowerCase().includes('delivery');
        
        if (isDelivery) {
            const puStr = String(item.pu || item.pu_payments || '').toUpperCase();
            const destStr = String(item.dest || item.destination || item.destination_payments || '').toUpperCase();
            
            if (puStr.includes('PMO') || destStr.includes('PMO')) {
                const combinedStr = puStr + " " + destStr;
                const pmoMatches = combinedStr.match(/(?:PMO\s*[:\-]?\s*\$?\s*([0-9,.]+))|([0-9,.]+)\s*PMO/i);
                
                if (pmoMatches) {
                    const val = parseCurrency(pmoMatches[1] || pmoMatches[2]);
                    sumPmoDeliveries += val;
                } else {
                    const generalVal = parseCurrency(item.dest || item.destination || item.pu || item.pu_payments);
                    if (generalVal > 0 && generalVal < 50000) {
                        sumPmoDeliveries += generalVal;
                    }
                }
            }
        }
        
        const destRawStr = String(item.dest || item.destination || item.destination_payments || '').trim();
        if (destRawStr && destRawStr !== '-' && destRawStr !== '---') {
            processPaymentString(destRawStr, payMap);
            const destParts = destRawStr.split(/[,/]+/);
            destParts.forEach(part => {
                const partVal = parseCurrency(part);
                if (partVal > 0 && partVal < 50000) {
                    const dLower = part.toLowerCase();
                    if (dLower.includes('cash')) {
                        sumCashDest += partVal;
                    } else if (dLower.includes('zelle')) {
                        sumDestZelle += partVal;
                        sumDestNoCashPmo += partVal;
                    } else if (!dLower.includes('pmo')) {
                        sumDestNoCashPmo += partVal;
                    }
                }
            });
        }
    });

    const rentalSummaryObj = generateTruckRentalSummaryTableHTML();
    const warehouseSummaryObj = generateWarehouseSummaryTableHTML();

    return `
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
    `;
}
window.generateOfficialSummaryTable = generateOfficialSummaryTable;

function generateSummaryReportData() {
    const filteredJobs = getFilteredJobsData();
    const rentals = window.currentTruckRentals || JSON.parse(localStorage.getItem('movepro_private_truck_rentals')) || [];
    const warehouse = window.currentWarehouseRecords || JSON.parse(localStorage.getItem('movepro_warehouse_records')) || [];

    const totalJobsCount = filteredJobs.length;
    const totalDeliveriesCount = filteredJobs.filter(j => j.jobNo && String(j.jobNo).toLowerCase().includes('delivery')).length;

    let totalRevenue = 0;
    filteredJobs.forEach(j => { totalRevenue += parseCurrency(j.total || j.total_amount); });

    const startDateVal = document.getElementById('filterStartDate')?.value;
    const endDateVal = document.getElementById('filterEndDate')?.value;
    const startDate = startDateVal ? parseLocalDate(startDateVal) : null;
    const endDate = endDateVal ? parseLocalDate(endDateVal) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);

    let totalRentalExp = 0;
    rentals.forEach(r => {
        if (r.date) {
            const rDate = parseLocalDate(r.date);
            if (startDate && rDate < startDate) return;
            if (endDate && rDate > endDate) return;
        }
        totalRentalExp += parseCurrency(r.amount);
    });

    let totalWarehouseExp = 0;
    warehouse.forEach(w => {
        if (w.date) {
            const wDate = parseLocalDate(w.date);
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
    if (sumRevEl) sumRevEl.innerText = '$' + totalRevenue.toLocaleString('en-US');
    if (sumExpEl) sumExpEl.innerText = '$' + totalExpenses.toLocaleString('en-US');

    const monthlyRevenue = Array(12).fill(0);
    filteredJobs.forEach(j => {
        if (j.date) {
            const dateObj = parseLocalDate(j.date);
            if (dateObj) {
                const month = dateObj.getMonth();
                if (!isNaN(month) && month >= 0 && month < 12) {
                    monthlyRevenue[month] += parseCurrency(j.total || j.total_amount);
                }
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
                            Net Profit: <span class="${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}">$${netProfit.toLocaleString('en-US')}</span>
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
                                    <td class="px-3 py-4 text-center border-r border-slate-100 ${val > 0 ? 'text-slate-800 font-bold' : 'text-slate-300 font-normal'}">
                                        $${val.toLocaleString('en-US')}
                                    </td>
                                `).join('')}
                                <td class="px-4 py-4 text-center bg-emerald-50/40 text-emerald-700 font-extrabold text-sm border-l border-emerald-100">
                                    $${totalRevenue.toLocaleString('en-US')}
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


function updateSummaryReportView(filteredData) {
    try {
        const container = document.getElementById('summaryReportContainer');
        if (!container) return;

        // 1. جدول إيجارات الشاحنات
        let truckHTML = '';
        if (typeof generateTruckRentalSummaryTableHTML === 'function') {
            const truckResult = generateTruckRentalSummaryTableHTML();
            truckHTML = truckResult.html || '';
        }

        // 2. جدول المستودع والمصروفات
        let warehouseHTML = '';
        if (typeof generateWarehouseSummaryTableHTML === 'function') {
            const warehouseResult = generateWarehouseSummaryTableHTML();
            warehouseHTML = warehouseResult.html || '';
        }

        // 3. جدول إجمالي طرق الدفع (Payment Methods Summary / Executive Financial Summary)
        let paymentMethodsHTML = '';
        if (typeof generatePaymentMethodSummaryTableHTML === 'function') {
            const paymentResult = generatePaymentMethodSummaryTableHTML();
            paymentMethodsHTML = paymentResult.html || '';
        }

        // حقن جميع الجداول الإجمالية معاً داخل حاوية صفحة التقارير على الشاشة
        container.innerHTML = `
            <div class="space-y-6">
                ${paymentMethodsHTML}
                ${truckHTML}
                ${warehouseHTML}
            </div>
        `;

        // تحديث عدادات الأرقام العلوية (Total Jobs, Deliveries, Revenue, Expenses)
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

        let totalRev = filteredData.reduce((sum, item) => {
            const amt = parseFloat(String(item.total || item.total_amount || '0').replace(/[^0-9.]/g, '')) || 0;
            return sum + amt;
        }, 0);
        if (totalRevenueEl) totalRevenueEl.innerText = '$' + totalRev.toLocaleString('en-US', {minimumFractionDigits: 2});

        let totalExp = 0;
        filteredData.forEach(item => {
            const diesel = parseFloat(String(item.diesel || item.diesel_expense || '0').replace(/[^0-9.]/g, '')) || 0;
            const hotel = parseFloat(String(item.hotel || item.hotel_expense || '0').replace(/[^0-9.]/g, '')) || 0;
            totalExp += (diesel + hotel);
        });
        if (totalExpensesEl) totalExpensesEl.innerText = '$' + totalExp.toLocaleString('en-US', {minimumFractionDigits: 2});

    } catch (e) {
        console.error("Error updating summary report view:", e);
    }
}
window.updateSummaryReportView = updateSummaryReportView;


function generateDetailedReportData() {
    const startDateVal = document.getElementById('filterStartDate')?.value;
    const endDateVal = document.getElementById('filterEndDate')?.value;

    const startDate = startDateVal ? parseLocalDate(startDateVal) : null;
    const endDate = endDateVal ? parseLocalDate(endDateVal) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const filteredJobs = getFilteredJobsData();
    const jobsTbody = document.getElementById('detailedReportBody');
    const jobsBadge = document.getElementById('detailedJobsBadge');

    if (jobsBadge) jobsBadge.innerText = `${filteredJobs.length} Jobs`;
    if (jobsTbody) {
        if (filteredJobs.length === 0) {
            jobsTbody.innerHTML = `<tr><td colspan="12" class="p-6 text-center text-slate-400 text-xs">No job records found for selected period.</td></tr>`;
        } else {
            jobsTbody.innerHTML = filteredJobs.map(item => {
                const totalNum = parseCurrency(item.total || item.total_amount);
                const dynamicForeman10 = totalNum > 0 ? '$' + (totalNum * 0.1).toFixed(2) : '-';
                
                const destVal = item.destination || item.dest || item.destination_payments || '-';
                const dieselVal = item.diesel || item.diesel_expense || '-';
                const hotelVal = item.hotel || item.hotel_expense || '-';

                const helpersDisplay = typeof window.parseHelpersDisplay === 'function' ? window.parseHelpersDisplay(item.helpers || item.helpers_cost) : (item.helpers || item.helpers_cost || '-');
                const driversDisplay = typeof window.parseDriversDisplay === 'function' ? window.parseDriversDisplay(item.drivers || item.drivers_cost) : (item.drivers || item.drivers_cost || '-');

                return `
                    <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
                        <td class="p-3 border font-medium">${item.date || '-'}</td>
                        <td class="p-3 border font-semibold text-slate-800">${item.jobNo || item.job_no || '-'}</td>
                        <td class="p-3 border">${item.route || (item.route_from ? item.route_from + ' → ' + item.route_to : '-')}</td>
                        <td class="p-3 border">${item.foreman || item.foreman_name || '-'}</td>
                        <td class="p-3 border font-bold text-emerald-800">${dynamicForeman10}</td>
                        <td class="p-3 border text-purple-700 font-semibold">${helpersDisplay}</td>
                        <td class="p-3 border text-blue-700 font-semibold">${driversDisplay}</td>
                        <td class="p-3 border font-bold text-emerald-600">${item.total || item.total_amount || '$0'}</td>
                        <td class="p-3 border">${item.pu || item.pu_payments || '-'}</td>
                        <td class="p-3 border font-medium">${destVal}</td>
                        <td class="p-3 border text-emerald-700">${dieselVal}</td>
                        <td class="p-3 border text-indigo-700">${hotelVal}</td>
                    </tr>
                `;
            }).join('');
        }
    }

    const rentals = window.currentTruckRentals || JSON.parse(localStorage.getItem('movepro_private_truck_rentals')) || [];
    const filteredRentals = rentals.filter(r => {
        if (!r.date) return true;
        const rDate = parseLocalDate(r.date);
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
                <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
                    <td class="p-3 border font-medium">${r.date || '-'}</td>
                    <td class="p-3 border font-semibold text-slate-800">${r.truckLabel || 'Truck Rental'}</td>
                    <td class="p-3 border">${r.paidBy || '-'}</td>
                    <td class="p-3 border">${r.paymentType || r.paymentMethod || 'Cash'}</td>
                    <td class="p-3 border text-right font-bold text-amber-600">$${parseCurrency(r.amount).toLocaleString('en-US')}</td>
                </tr>
            `).join('');
        }
    }

    const warehouse = window.currentWarehouseRecords || JSON.parse(localStorage.getItem('movepro_warehouse_records')) || [];
    const filteredWarehouse = warehouse.filter(w => {
        if (!w.date) return true;
        const wDate = parseLocalDate(w.date);
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
                <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
                    <td class="p-3 border font-medium">${w.date || '-'}</td>
                    <td class="p-3 border font-semibold text-slate-800">${w.services || 'Warehouse Expense'}</td>
                    <td class="p-3 border">${w.details || '-'}</td>
                    <td class="p-3 border">${w.paymentType || w.paymentMethod || 'Cash'}</td>
                    <td class="p-3 border text-right font-bold text-purple-600">$${parseCurrency(w.amount).toLocaleString('en-US')}</td>
                </tr>
            `).join('');
        }
    }
}
window.generateDetailedReportData = generateDetailedReportData;

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
            let dieselSum = dieselStr.split('+').reduce((s, p) => s + parseCurrency(p), 0);
            if (dieselStr.toLowerCase().includes('cash') || !dieselStr.toLowerCase().includes('penske')) {
                sumCashDiesel += dieselSum;
            }
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
        const daysNum = parseInt(String(r.days || r.Days || '0').replace(/[^0-9]/g, '')) || 0;
        rentalPdfDays += daysNum;
        const amt = parseCurrency(r.amount);
        rentalPdfTotal += amt;
        const pType = String(r.paymentType || r.paymentMethod || '').toLowerCase();
        if (pType.includes('cash')) rentalPdfCash += amt;
        else rentalPdfOther += amt;
    });

    let warehousePdfCash = 0, warehousePdfOthers = 0, warehousePdfTotal = 0;
    filteredWarehouse.forEach(w => {
        const amt = parseCurrency(w.amount);
        warehousePdfTotal += amt;
        const pType = String(w.paymentType || w.paymentMethod || '').toLowerCase();
        if (pType.includes('cash')) warehousePdfCash += amt;
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
                            <th class="text-blue-700">Other Payments (Zelle/Check)</th>
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
                            <th class="text-blue-700">Other Payments (Others)</th>
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
                <h3 class="text-xs font-bold uppercase text-slate-600 mb-1">1. Detailed Dispatch Operations Ledger (${jobs.length} Records)</h3>
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

async function renderSummaryPageWithDetailedTables() {
    // 1. تحديد الحاوية الرئيسية لصفحة Summary
    const container = document.getElementById('tab-summary') || document.getElementById('summaryContainer');
    if (!container) return;

    // 2. جلب البيانات المحدثة مع استبعاد المحذوفة
    const rentals = (typeof loadPrivateTruckRentals === 'function') ? await loadPrivateTruckRentals() : [];
    const warehouse = (typeof loadWarehouseRecords === 'function') ? await loadWarehouseRecords() : [];

    // 3. حساب إجمالية طرق الدفع وتصنيفها
    let paymentTotals = { Cash: 0, Cheque: 0, Zelle: 0, Card: 0, Other: 0 };

    [...rentals, ...warehouse].forEach(item => {
        let amt = parseFloat(String(item.amount || '0').replace(/[^0-9.]/g, '')) || 0;
        let pType = (item.paymentType || '').trim();

        // إذا لم توجد طريقة دفع أو كانت فارغة، تصنف افتراضياً كـ Cash أو بدون طريقة
        if (!pType || pType === '-') {
            paymentTotals.Cash += amt;
        } else if (paymentTotals.hasOwnProperty(pType)) {
            paymentTotals[pType] += amt;
        } else {
            // أي قيمة أخرى تصنف تحت Other
            paymentTotals.Other += amt;
        }
    });

    // 4. بناء هيكل الجداول الإضافية لتتطابق مع تصميم التقرير المرفق
    const summaryHTML = `
        <div class="space-y-6 mt-6">
            <!-- جدول ملخص إيجارات الشاحنات -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5">
                <h3 class="text-sm font-bold text-slate-800 mb-3">Private Truck Rental Financial Summary (${rentals.length} Records)</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead class="bg-slate-50 text-slate-600 uppercase text-[10px] border-b">
                            <tr>
                                <th class="p-2.5">Total Rental Days</th>
                                <th class="p-2.5 text-emerald-700">Cash Payments</th>
                                <th class="p-2.5 text-blue-700">Other Payments (Zelle/Check)</th>
                                <th class="p-2.5 text-amber-700 font-bold">Grand Total Rental Cost</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y text-slate-700">
                            <tr>
                                <td class="p-2.5 font-bold">${rentals.reduce((acc, r) => acc + (r.days || 0), 0)} Days</td>
                                <td class="p-2.5 text-emerald-600 font-bold">$${rentals.filter(r => (r.paymentType || '').toLowerCase().includes('cash')).reduce((acc, r) => acc + (parseFloat(String(r.amount).replace(/[^0-9.]/g, '')) || 0), 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td class="p-2.5 text-blue-600 font-bold">$${rentals.filter(r => !(r.paymentType || '').toLowerCase().includes('cash')).reduce((acc, r) => acc + (parseFloat(String(r.amount).replace(/[^0-9.]/g, '')) || 0), 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td class="p-2.5 text-amber-600 font-black">$${rentals.reduce((acc, r) => acc + (parseFloat(String(r.amount).replace(/[^0-9.]/g, '')) || 0), 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- جدول ملخص طرق الدفع العامة (Payment Methods Breakdown) -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5">
                <h3 class="text-sm font-bold text-slate-800 mb-3">Payment Methods Summary Breakdown</h3>
                <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    <div class="p-3 bg-slate-50 rounded-xl border text-center">
                        <span class="text-[10px] uppercase font-bold text-slate-500 block">Cash</span>
                        <span class="text-sm font-extrabold text-emerald-600 mt-1 block">$${paymentTotals.Cash.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-xl border text-center">
                        <span class="text-[10px] uppercase font-bold text-slate-500 block">Cheque</span>
                        <span class="text-sm font-extrabold text-slate-700 mt-1 block">$${paymentTotals.Cheque.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-xl border text-center">
                        <span class="text-[10px] uppercase font-bold text-slate-500 block">Zelle</span>
                        <span class="text-sm font-extrabold text-blue-600 mt-1 block">$${paymentTotals.Zelle.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-xl border text-center">
                        <span class="text-[10px] uppercase font-bold text-slate-500 block">Card</span>
                        <span class="text-sm font-extrabold text-purple-600 mt-1 block">$${paymentTotals.Card.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-xl border text-center col-span-2 sm:col-span-1">
                        <span class="text-[10px] uppercase font-bold text-slate-500 block">Other</span>
                        <span class="text-sm font-extrabold text-amber-600 mt-1 block">$${paymentTotals.Other.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // حقن الجداول في صفحة Summary دون مسح المحتوى الأصلي
    let existingExtra = document.getElementById('summaryExtraTables');
    if (!existingExtra) {
        const wrapper = document.createElement('div');
        wrapper.id = 'summaryExtraTables';
        wrapper.innerHTML = summaryHTML;
        container.appendChild(wrapper);
    } else {
        existingExtra.innerHTML = summaryHTML;
    }
}
window.renderSummaryPageWithDetailedTables = renderSummaryPageWithDetailedTables;
