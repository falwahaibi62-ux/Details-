/**
 * Private Truck Rental Module - MovePro
 */

if (typeof window.RENTALS_STORAGE_KEY === 'undefined') {
    window.RENTALS_STORAGE_KEY = 'movepro_private_truck_rentals';
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
    let storageKey = window.RENTALS_STORAGE_KEY || 'movepro_private_truck_rentals';
    let saved = localStorage.getItem(storageKey);
    
    if (!saved || JSON.parse(saved).length < forcedInitialRentals.length) {
        localStorage.setItem(storageKey, JSON.stringify(forcedInitialRentals));
        return forcedInitialRentals;
    }
    
    try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
        console.error('Error parsing rentals:', e);
    }
    
    return forcedInitialRentals;
}
window.loadPrivateTruckRentals = loadPrivateTestRentals = loadPrivateTruckRentals;

function savePrivateTruckRentals(data) {
    let storageKey = window.RENTALS_STORAGE_KEY || 'movepro_private_truck_rentals';
    localStorage.setItem(storageKey, JSON.stringify(data));
}

// Render Tab Screen
function renderPrivateTruckRentalTab() {
    const container = document.getElementById('tab-rentals');
    if (!container) return;

    container.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs mb-6">
            <div>
                <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
                    <i class="fa-solid fa-truck-moving text-indigo-600"></i> Private Truck Rental Management
                </h2>
                <p class="text-xs text-slate-500 mt-0.5">Manage and track private truck rental transactions and records</p>
            </div>
            <button onclick="openPrivateTruckModal()" class="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer">
                <i class="fa-solid fa-plus"></i> Add New Rental
            </button>
        </div>

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
                    <tbody id="rentalTableBody" class="divide-y divide-slate-100 text-slate-700 bg-white">
                        ${generateRentalRowsHTML()}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
window.renderPrivateTruckRentalTab = renderPrivateTruckRentalTab;

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
                <button onclick="editRentalRecord(${index})" class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer" title="Edit">
                    <i class="fa-solid fa-pen-to-square text-xs"></i>
                </button>
                <button onclick="deleteRentalRecord(${index})" class="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition cursor-pointer" title="Delete">
                    <i class="fa-solid fa-trash text-xs"></i>
                </button>
            </td>
        </tr>
    `).join('');
}
window.generateRentalRowsHTML = generateRentalRowsHTML;

function editRentalRecord(index) {
    const rentals = loadPrivateTruckRentals();
    const item = rentals[index];
    if (!item) return;

    openPrivateTruckModal(true);

    const indexField = document.getElementById('editRentalIndex');
    if (indexField) indexField.value = index;

    const modalTitle = document.getElementById('rentalModalTitle');
    if (modalTitle) modalTitle.innerText = 'Edit Private Truck Rental';

    setTimeout(() => {
        if (document.getElementById('rentalDate')) document.getElementById('rentalDate').value = item.date || '';
        if (document.getElementById('rentalDays')) document.getElementById('rentalDays').value = item.days || 0;
        if (document.getElementById('rentalAmount')) document.getElementById('rentalAmount').value = item.amount || 0;
        if (document.getElementById('rentalPaymentType')) document.getElementById('rentalPaymentType').value = item.paymentType || 'Cash';
        if (document.getElementById('rentalPaidBy')) document.getElementById('rentalPaidBy').value = item.paidBy || '';
        if (document.getElementById('rentalTruckLabel')) document.getElementById('rentalTruckLabel').value = item.truckLabel || '';
    }, 50);
}
window.editRentalRecord = editRentalRecord;

function deleteRentalRecord(index) {
    if (!confirm('Are you sure you want to delete this rental record?')) {
        return;
    }

    let rentals = loadPrivateTruckRentals();
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
    
    if (typeof renderTrashBin === 'function') {
        renderTrashBin();
    }
    if (typeof updateDashboardAnalytics === 'function') {
        updateDashboardAnalytics();
    }
}
window.deleteRentalRecord = deleteRentalRecord;

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
                <button onclick="closePrivateTruckModal()" class="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer">
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

    // إذا لم يكن وضع تعديل، نقوم بتفريغ النموذج تماماً
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
window.openPrivateTruckModal = openPrivateTruckModal;
window.openPrivateTestRentalsModal = openPrivateTruckModal;

function closePrivateTruckModal() {
    const modal = document.getElementById('privateTruckModal');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        modal.style.setProperty('display', 'none', 'important');
    }
}
window.closePrivateTruckModal = closePrivateTruckModal;

function adjustRentalNumber(elementId, step) {
    const input = document.getElementById(elementId);
    if (input) {
        let currentValue = parseFloat(input.value) || 0;
        let newValue = currentValue + step;
        if (newValue < 0) newValue = 0;
        input.value = newValue;
    }
}
window.adjustRentalNumber = adjustRentalNumber;

function handlePrivateTruckSubmit(event) {
    event.preventDefault();

    const indexField = document.getElementById('editRentalIndex');
    const index = indexField ? parseInt(indexField.value, 10) : -1;

    const newRecord = {
        date: document.getElementById('rentalDate').value,
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
window.handlePrivateTruckSubmit = handlePrivateTruckSubmit;
