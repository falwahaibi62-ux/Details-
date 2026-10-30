

// إعداد المفتاح العام بشكل آمن بدون أي تكرار يعطل الملف
if (typeof window.RENTALS_STORAGE_KEY === 'undefined') {
    window.RENTALS_STORAGE_KEY = 'movepro_private_truck_rentals';
}

if (typeof window.forcedInitialRentals === 'undefined') {
    window.forcedInitialRentals = [];
}
const forcedInitialRentals = [
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



function loadPrivateTruckRentals() {
    let saved = localStorage.getItem(window.RENTALS_STORAGE_KEY);
    let rentals = [];
    
    if (!saved || JSON.parse(saved).length < forcedInitialRentals.length) {
        localStorage.setItem(window.RENTALS_STORAGE_KEY, JSON.stringify(forcedInitialRentals));
        rentals = [...forcedInitialRentals];
    } else {
        try {
            const parsed = JSON.parse(saved);
            rentals = Array.isArray(parsed) && parsed.length > 0 ? parsed : [...forcedInitialRentals];
        } catch (e) {
            console.error('Error parsing rentals:', e);
            rentals = [...forcedInitialRentals];
        }
    }

    return rentals.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function savePrivateTruckRentals(data) {
    localStorage.setItem(window.RENTALS_STORAGE_KEY, JSON.stringify(data));
}

// Date Formatting Utilities
function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
    }
    return dateStr;
}

function formatDateToSlash(dateStr) {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-');
        return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year}`;
    }
    return dateStr;
}

// Storage Handlers
function loadPrivateTrucks() {
    let activeKey = window.S_STORAGE_KEY || STORAGE_KEY;
    let saved = localStorage.getItem(activeKey);
    
    let s = [];
    if (!saved || JSON.parse(saved).length < forcedInitials.length) {
        localStorage.setItem(activeKey, JSON.stringify(forcedInitials));
        s = [...forcedInitials];
    } else {
        try {
            const parsed = JSON.parse(saved);
            s = Array.isArray(parsed) && parsed.length > 0 ? parsed : [...forcedInitials];
        } catch (e) {
            console.error('Error parsing s:', e);
            s = [...forcedInitials];
        }
    }

    return s.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function savePrivateTrucks(data) {
    let activeKey = window.S_STORAGE_KEY || STORAGE_KEY;
    localStorage.setItem(activeKey, JSON.stringify(data));
}

// Render Tab Screen & Summary
function renderPrivateTruckRentalTab() {
    const container = document.getElementById('tab-rentals');
    if (!container) return;

    container.className = "space-y-6 w-full flex flex-col";

    container.innerHTML = `
        <!-- 1. Header & Add Button -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
                <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
                    <i class="fa-solid fa-truck-moving text-indigo-600"></i> Private Truck Rental Management
                </h2>
                <p class="text-xs text-slate-500 mt-0.5">Manage and track private truck rental transactions and records</p>
            </div>
            <button type="button" onclick="openPrivateTruckModal()" class="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer">
                <i class="fa-solid fa-plus"></i> Add New Rental
            </button>
        </div>

        <!-- 2. Financial Summary Table -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
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
                            <td id="sumRentalDaysCell" class="p-2.5 border-r text-center font-bold text-slate-800">0 Days</td>
                            <td id="sumRentalCashCell" class="p-2.5 border-r text-center text-emerald-600 font-bold bg-emerald-50/20">$0.00</td>
                            <td id="sumRentalOtherCell" class="p-2.5 border-r text-center text-blue-600 font-bold bg-blue-50/20">$0.00</td>
                            <td id="sumRentalGrandTotalCell" class="p-2.5 text-center bg-amber-50 text-amber-900 font-extrabold text-xs">$0.00</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- 3. Detailed Records Table -->
        <div class="glass-panel rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs">
            <div class="overflow-x-auto w-full">
                <table class="w-full text-left text-xs min-w-[900px] border-collapse">
                    <thead class="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                            <th class="p-3.5 text-left">Date</th>
                            <th class="p-3.5 text-left">No. of Days</th>
                            <th class="p-3.5 text-left text-emerald-700">Amount</th>
                            <th class="p-3.5 text-left">Payment Type</th>
                            <th class="p-3.5 text-left">Paid By</th>
                            <th class="p-3.5 text-left">Truck Label</th>
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
        const daysNum = parseInt(String(r.days || '0').replace(/[^0-9]/g, '')) || 0;
        totalDays += daysNum;

        const amount = typeof parseCurrency === 'function' ? parseCurrency(r.amount) : (parseFloat(String(r.amount).replace(/[^0-9.-]+/g, '')) || 0);
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
    setElementText('sumRentalDaysCell', `${totalDays} Days`);
    setElementText('sumRentalCashCell', `$${sumCash.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    setElementText('sumRentalOtherCell', `$${sumOther.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    setElementText('sumRentalGrandTotalCell', `$${grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
}

function generateRentalRowsHTML() {
    const rentals = loadPrivateTruckRentals(); 

    if (!rentals || rentals.length === 0) {
        return `<tr><td colspan="7" class="text-center py-6 text-slate-400 text-xs">No rental records found</td></tr>`;
    }

    return rentals.map((item, index) => `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
            <td class="p-3.5 font-medium text-slate-800">${item.date || '-'}</td>
            <td class="p-3.5 text-slate-600">${item.days || 0} Days</td>
            <td class="p-3.5 text-emerald-700 font-bold">$${parseFloat(item.amount || 0).toLocaleString()}</td>
            <td class="p-3.5"><span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">${item.paymentType || '-'}</span></td>
            <td class="p-3.5 text-slate-600">${item.paidBy || '-'}</td>
            <td class="p-3.5 text-slate-600">${item.truckLabel || '-'}</td>
            <td class="p-3.5 text-center space-x-1">
                <button type="button" onclick="editRentalRecord(${index})" class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer" title="Edit">
                    <i class="fa-solid fa-pen-to-square text-xs"></i>
                </button>
                <button type="button" onclick="deleteRentalRecord(${index})" class="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition cursor-pointer" title="Delete">
                    <i class="fa-solid fa-trash text-xs"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function editRentalRecord(index) {
    const rentals = loadPrivateTruckRentals();
    const item = rentals[index];
    if (!item) return;

    openPrivateTruckModal(true);

    const setFieldValue = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    setFieldValue('editRentalIndex', index);
    const modalTitle = document.getElementById('rentalModalTitle');
    if (modalTitle) modalTitle.innerText = 'Edit Private Truck Rental';

    setTimeout(() => {
        setFieldValue('rentalDate', formatDateForInput(item.date));
        setFieldValue('rentalDays', item.days || 0);
        setFieldValue('rentalAmount', item.amount || 0);
        setFieldValue('rentalPaymentType', item.paymentType || 'Cash');
        setFieldValue('rentalPaidBy', item.paidBy || '');
        setFieldValue('rentalTruckLabel', item.truckLabel || '');
    }, 50);
}

function deleteRentalRecord(index) {
    if (!confirm('Are you sure you want to delete this rental record?')) return;

    let rentals = loadPrivateTruckRentals();
    if (index < 0 || index >= rentals.length) return;

    const deletedItem = rentals.splice(index, 1)[0];
    savePrivateTruckRentals(rentals);

    const TRASH_KEY = 'movepro_trash_bin';
    let trashBin = JSON.parse(localStorage.getItem(TRASH_KEY)) || [];
    
    trashBin.unshift({
        ...deletedItem,
        recordType: 'rental',
        deletedAt: new Date().toISOString()
    });
    
    localStorage.setItem(TRASH_KEY, JSON.stringify(trashBin));

    renderPrivateTruckRentalTab();
    
    if (typeof renderTrashBin === 'function') renderTrashBin();
    if (typeof updateDashboardAnalytics === 'function') updateDashboardAnalytics();
}

function renderPrivateTruckModal() {
    let modalContainer = document.getElementById('privateTruckModal');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'privateTruckModal';
        modalContainer.className = 'fixed inset-0 bg-slate-950/60 backdrop-blur-xs hidden items-center justify-center z-50 p-4 overflow-y-auto';
        document.body.appendChild(modalContainer);
    }

    modalContainer.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 transform transition-all">
            <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 id="rentalModalTitle" class="text-base font-bold text-slate-800 flex items-center gap-2">
                    <i class="fa-solid fa-truck-moving text-indigo-600"></i> Add Private Truck Rental
                </h3>
                <button type="button" onclick="closePrivateTruckModal()" class="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <form id="privateTruckForm" onsubmit="handlePrivateTruckSubmit(event)" class="p-6 space-y-4 text-xs">
                <input type="hidden" id="editRentalIndex" value="-1">

                <div>
                    <label class="block font-semibold text-slate-700 mb-1">Date <span class="text-red-500">*</span></label>
                    <input type="date" id="rentalDate" required class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-700">
                </div>

                <div>
                    <label class="block font-semibold text-slate-700 mb-1">No of days <span class="text-red-500">*</span></label>
                    <div class="flex items-center">
                        <button type="button" onclick="adjustRentalNumber('rentalDays', -1)" class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-l-xl border border-r-0 border-slate-200 transition font-bold cursor-pointer">-</button>
                        <input type="number" id="rentalDays" value="0" min="0" required class="w-full py-2.5 text-center bg-white border border-slate-200 focus:outline-none transition text-slate-700">
                        <button type="button" onclick="adjustRentalNumber('rentalDays', 1)" class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-r-xl border border-l-0 border-slate-200 transition font-bold cursor-pointer">+</button>
                    </div>
                </div>

                <div>
                    <label class="block font-semibold text-slate-700 mb-1">Amount <span class="text-red-500">*</span></label>
                    <div class="flex items-center">
                        <button type="button" onclick="adjustRentalNumber('rentalAmount', -10)" class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-l-xl border border-r-0 border-slate-200 transition font-bold cursor-pointer">-</button>
                        <input type="number" id="rentalAmount" value="0" min="0" step="0.01" required class="w-full py-2.5 text-center bg-white border border-slate-200 focus:outline-none transition text-slate-700">
                        <button type="button" onclick="adjustRentalNumber('rentalAmount', 10)" class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-r-xl border border-l-0 border-slate-200 transition font-bold cursor-pointer">+</button>
                    </div>
                </div>

                <div>
                    <label class="block font-semibold text-slate-700 mb-1">Payment type</label>
                    <select id="rentalPaymentType" class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none transition text-slate-700">
                        <option value="Cash">Cash</option>
                        <option value="Zelle">Zelle</option>
                        <option value="Cheque">Cheque</option>
                        <option value="PMO">PMO</option>
                        <option value="BC">BC</option>
                        <option value="PC">PC</option>
                        <option value="CC">CC</option>
                        <option value="WT">WT</option>
                        <option value="Others">Others</option>
                    </select>
                </div>

                <div>
                    <label class="block font-semibold text-slate-700 mb-1">Paid By</label>
                    <input type="text" id="rentalPaidBy" placeholder="Enter Payer Name" class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none transition text-slate-700">
                </div>

                <div>
                    <label class="block font-semibold text-slate-700 mb-1">Truck Label</label>
                    <input type="text" id="rentalTruckLabel" placeholder="e.g. Truck #5" class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none transition text-slate-700">
                </div>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" onclick="closePrivateTruckModal()" class="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition border border-slate-200 cursor-pointer">Cancel</button>
                    <button type="submit" class="px-5 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition cursor-pointer">Save Record</button>
                </div>
            </form>
        </div>
    `;
}

function openPrivateTruckModal(isEdit = false) {
    let modalContainer = document.getElementById('privateTruckModal');
    if (!modalContainer) {
        renderPrivateTruckModal();
        modalContainer = document.getElementById('privateTruckModal');
    }

    const form = document.getElementById('privateTruckForm');
    const titleEl = document.getElementById('rentalModalTitle');

    if (form && !isEdit) {
        form.reset();
        const indexField = document.getElementById('editRentalIndex');
        if (indexField) indexField.value = '-1';
        if (titleEl) titleEl.innerText = 'Add Private Truck Rental';
    }

    if (modalContainer) {
        modalContainer.classList.remove('hidden');
        modalContainer.classList.add('flex');
        modalContainer.style.setProperty('display', 'flex', 'important');
    }
}

function closePrivateTruckModal() {
    const modal = document.getElementById('privateTruckModal');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        modal.style.setProperty('display', 'none', 'important');
    }
}

function adjustRentalNumber(elementId, step) {
    const input = document.getElementById(elementId);
    if (input) {
        let currentValue = parseFloat(input.value) || 0;
        let newValue = currentValue + step;
        if (newValue < 0) newValue = 0;
        input.value = newValue;
    }
}

function handlePrivateTruckSubmit(event) {
    event.preventDefault();

    const indexField = document.getElementById('editRentalIndex');
    const index = indexField ? parseInt(indexField.value, 10) : -1;

    const rawDate = document.getElementById('rentalDate').value;
    const formattedDate = formatDateToSlash(rawDate);

    const newRecord = {
        date: formattedDate,
        days: parseFloat(document.getElementById('rentalDays').value) || 0,
        amount: parseFloat(document.getElementById('rentalAmount').value) || 0,
        paymentType: document.getElementById('rentalPaymentType').value,
        paidBy: document.getElementById('rentalPaidBy').value.trim(),
        truckLabel: document.getElementById('rentalTruckLabel').value.trim()
    };

    let rentals = loadPrivateTruckRentals();

    if (index >= 0 && index < rentals.length) {
        rentals[index] = newRecord;
    } else {
        rentals.unshift(newRecord);
    }

    savePrivateTruckRentals(rentals);
    closePrivateTruckModal();
    renderPrivateTruckRentalTab();
    
    if (typeof updateDashboardAnalytics === 'function') {
        updateDashboardAnalytics();
    }
}

// Global Window Exposure (Exporting functions for HTML onclick attributes)
window.loadPrivateTruckRentals = loadPrivateTruckRentals;
window.renderPrivateTruckRentalTab = renderPrivateTruckRentalTab;
window.renderTruckRentalSummary = renderTruckRentalSummary;
window.generateRentalRowsHTML = generateRentalRowsHTML;
window.editRentalRecord = editRentalRecord;
window.deleteRentalRecord = deleteRentalRecord;
window.openPrivateTruckModal = openPrivateTruckModal;
window.openPrivateTestRentalsModal = openPrivateTruckModal;
window.closePrivateTruckModal = closePrivateTruckModal;
window.adjustRentalNumber = adjustRentalNumber;
window.handlePrivateTruckSubmit = handlePrivateTruckSubmit;
