/**
 * MovePro - Private Truck Rental Module
 * Optimized & Hardened Core Logic
 */

// 1. Safe Initialization of Keys & Data Structure
if (typeof window.RENTALS_STORAGE_KEY === 'undefined') {
    window.RENTALS_STORAGE_KEY = 'movepro_private_truck_rentals';
}

if (typeof window.forcedInitialRentalsData === 'undefined') {
    window.forcedInitialRentalsData = [
        { date: "6/24/2026", days: 24, amount: 6000, paymentType: "Cheque", paidBy: "Sharef", truckLabel: "24 days rental paid by Sharef" },
        { date: "7/9/2026", days: 13, amount: 3250, paymentType: "Cash", paidBy: "Abu Essa", truckLabel: "13 days rental paid to Abu Essa" },
        { date: "7/20/2026", days: 8, amount: 1860, paymentType: "Cash", paidBy: "Penski", truckLabel: "8 days rental paid by Penski" },
        { date: "8/18/2026", days: 1, amount: 425, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "1 day U-Haul rental" },
        { date: "8/21/2026", days: 1, amount: 675, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "1 day U-Haul rental" },
        { date: "8/26/2026", days: 1, amount: 759, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "1 day U-Haul rental" },
        { date: "8/31/2026", days: 1, amount: 1282, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "1 day U-Haul rental" },
        { date: "9/18/2026", days: 2, amount: 240, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "2 days U-Haul + Storage rental" },
        { date: "9/25/2026", days: 1, amount: 533, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "1 day U-Haul rental" },
        { date: "9/28/2026", days: 1, amount: 568, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "1 day U-Haul rental" },
        { date: "10/5/2026", days: 2, amount: 1150, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "2 days U-Haul rental" },
        { date: "10/12/2026", days: 1, amount: 610, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "1 day U-Haul rental" },
        { date: "10/18/2026", days: 3, amount: 1720, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "3 days U-Haul rental" },
        { date: "10/24/2026", days: 2, amount: 1250, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "2 days U-Haul rental" }
    ];
}

// 2. Storage Handlers
function loadPrivateTruckRentals() {
    const activeKey = window.RENTALS_STORAGE_KEY;
    const initialData = window.forcedInitialRentalsData || [];
    let saved = localStorage.getItem(activeKey);
    let rentals = [];

    if (!saved) {
        localStorage.setItem(activeKey, JSON.stringify(initialData));
        rentals = [...initialData];
    } else {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length >= initialData.length) {
                rentals = parsed;
            } else {
                rentals = Array.isArray(parsed) && parsed.length > 0 ? parsed : [...initialData];
            }
        } catch (e) {
            console.error('Error parsing rentals:', e);
            rentals = [...initialData];
        }
    }

    return rentals.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

function savePrivateTruckRentals(data) {
    localStorage.setItem(window.RENTALS_STORAGE_KEY, JSON.stringify(data));
}

// 3. Date Utility Functions
function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`; } const d = new Date(dateStr); if (!isNaN(d.getTime())) { return d.toISOString().split('T')[0]; } return dateStr; }  function formatDateToSlash(dateStr) { if (!dateStr) return ''; if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) { const [year, month, day] = dateStr.split('-'); return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year}`;
    }
    return dateStr;
}

// 4. Interface Rendering Function
function renderPrivateTruckRentalTab() {
    const container = document.getElementById('tab-rentals') || document.getElementById('tab-private-truck-rental');
    if (!container) return;

    // ضبط الحاوية الرئيسية لتكون عمودية ومتناسقة بالكامل
    container.className = "view-section hidden space-y-6 w-full max-w-full";

    container.innerHTML = `
        <!-- 1. Header & Actions -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm w-full">
            <div>
                <h2 class="text-xl font-bold text-slate-800">Private Truck Rental Management</h2>
                <p class="text-xs text-slate-500 mt-1">Manage and track private truck rental transactions and records</p>
            </div>
            <button onclick="openPrivateTruckModal()" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-sm cursor-pointer">
                <i class="fa-solid fa-plus"></i> Add New Rental
            </button>
        </div>

        <!-- 2. Financial Summary Cards -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4 w-full">
            <div class="border-b border-slate-100 pb-3 flex flex-wrap justify-between items-center gap-2">
                <div>
                    <h3 class="text-sm font-bold text-slate-800">Private Truck Rental Financial Summary</h3>
                    <p class="text-[11px] text-slate-400">Comprehensive summary of rental duration, cash payments, and total expenses</p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                        Total Rental Records: <span id="rentalTotalRecordsCount" class="text-emerald-600">0</span>
                    </span>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-center">
                    <span class="text-[10px] uppercase font-bold text-slate-500 block">Total Rental Days</span>
                    <span id="sumRentalDaysCell" class="text-lg font-extrabold text-slate-800 mt-1 block">0 Days</span>
                </div>
                <div class="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100 text-center">
                    <span class="text-[10px] uppercase font-bold text-emerald-700 block">Cash Payments</span>
                    <span id="sumRentalCashCell" class="text-lg font-extrabold text-emerald-600 mt-1 block">$0.00</span>
                </div>
                <div class="p-4 bg-blue-50/40 rounded-xl border border-blue-100 text-center">
                    <span class="text-[10px] uppercase font-bold text-blue-700 block">Other Payments (Zelle/Check)</span>
                    <span id="sumRentalOtherCell" class="text-lg font-extrabold text-blue-600 mt-1 block">$0.00</span>
                </div>
                <div class="p-4 bg-amber-500 rounded-xl text-white text-center shadow-xs">
                    <span class="text-[10px] uppercase font-bold opacity-90 block">Grand Total Rental Cost</span>
                    <span id="sumRentalGrandTotalCell" class="text-lg font-black mt-1 block">$0.00</span>
                </div>
            </div>
        </div>

        <!-- 3. Detailed Records Table -->
        <div class="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm w-full">
            <div class="overflow-x-auto w-full">
                <table class="w-full text-left text-xs border-collapse min-w-[900px]">
                    <thead class="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                            <th class="p-3.5">Date</th>
                            <th class="p-3.5">No. of Days</th>
                            <th class="p-3.5 text-emerald-700">Amount</th>
                            <th class="p-3.5">Payment Type</th>
                            <th class="p-3.5">Paid By</th>
                            <th class="p-3.5">Truck Label</th>
                            <th class="p-3.5 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="truckRentalTableBody" class="divide-y divide-slate-100 text-slate-700 bg-white">
                        ${generateRentalRowsHTML()}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    renderTruckRentalSummary();
}
window.renderPrivateTruckRentalTab = renderPrivateTruckRentalTab;

function renderTruckRentalSummary() {
    const rentals = loadPrivateTruckRentals();
    
    let totalDays = 0;
    let sumCash = 0;
    let sumOther = 0;
    let grandTotal = 0;

    rentals.forEach(r => {
        const daysNum = parseInt(String(r.days || '0').replace(/[^0-9]/g, ''), 10) || 0;
        totalDays += daysNum;

        const amount = typeof parseCurrency === 'function' 
            ? parseCurrency(r.amount) 
            : (parseFloat(String(r.amount).replace(/[^0-9.-]+/g, '')) || 0);
            
        grandTotal += amount;

        const paymentType = String(r.paymentType || '').toLowerCase();
        if (paymentType.includes('cash')) {
            sumCash += amount;
        } else {
            sumOther += amount;
        }
    });

    const setElementText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    setElementText('rentalTotalRecordsCount', rentals.length);
    setElementText('sumRentalDaysCell', `${totalDays} Days`); setElementText('sumRentalCashCell', `$${sumCash.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    setElementText('sumRentalOtherCell', `$${sumOther.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`); setElementText('sumRentalGrandTotalCell', `$${grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
}

function generateRentalRowsHTML() {
    const rentals = loadPrivateTruckRentals(); 

    if (!rentals || rentals.length === 0) {
        return `<tr><td colspan="7" class="text-center py-6 text-slate-400 text-xs">No rental records found</td></tr>`;
    }

    return rentals.map((item, index) => `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
            <td class="p-3.5 font-medium text-slate-800">${item.date || '-'}</td>
            <td class="p-3.5 text-slate-600">${item.days \vert{}\vert{} 0} Days</td> <td class="p-3.5 text-emerald-700 font-bold">$${parseFloat(item.amount || 0).toLocaleString()}</td>
            <td class="p-3.5"><span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">${item.paymentType || '-'}</span></td>
            <td class="p-3.5 text-slate-600">${item.paidBy || '-'}</td>
            <td class="p-3.5 text-slate-600">${item.truckLabel || '-'}</td>
