/**
 * Private Truck Rental Module
 * Manages rendering the dedicated tab view and modal form for Private Truck Rentals.
 */

const RENTAL_STORAGE_KEY = 'movepro_private_truck_rentals';

// Load rental records from localStorage
function loadPrivateTruckRentals() {
    const saved = localStorage.getItem(RENTAL_STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Error parsing rental data:', e);
        }
    }
    return [];
}

// Save rental records to localStorage
function savePrivateTruckRentals(data) {
    localStorage.setItem(RENTAL_STORAGE_KEY, JSON.stringify(data));
}

let privateTruckRentals = loadPrivateTruckRentals();

// Main function to show Private Truck Rental screen as a clean, isolated Tab
function showPrivateTruckRentalTab() {
    // 1. Hide all main tab sections/wrappers to prevent UI overlap
    const mainSections = document.querySelectorAll('.tab-content, .main-section, #dashboardSection, #crudSection, #usersSection, #reportSection, #trashSection');
    mainSections.forEach(section => {
        if (section) {
            section.classList.add('hidden');
        }
    });

    // Also clear active menu state styling on sidebar buttons if needed
    document.querySelectorAll('aside nav button').forEach(btn => {
        btn.classList.remove('bg-emerald-600', 'text-white');
    });

    // 2. Get or Create the dedicated Rental Tab Container
    let rentalTab = document.getElementById('rentalTabContent');
    const mainWrapper = document.getElementById('mainContentWrapper') || document.querySelector('main') || document.querySelector('.flex-1.flex.flex-col');

    if (!rentalTab) {
        rentalTab = document.createElement('div');
        rentalTab.id = 'rentalTabContent';
        rentalTab.className = 'tab-content p-6 space-y-6 overflow-y-auto flex-1 bg-slate-100';
        if (mainWrapper) {
            mainWrapper.appendChild(rentalTab);
        } else {
            document.body.appendChild(rentalTab);
        }
    }

    // 3. Make sure the rental tab is visible
    rentalTab.classList.remove('hidden');

    // 4. Populate table & view content
    rentalTab.innerHTML = `
        <!-- Header Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
            <div>
                <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <i class="fa-solid fa-truck-moving text-indigo-600"></i> Private Truck Rental Ledger
                </h2>
                <p class="text-xs text-slate-500 mt-0.5">Manage and track private truck rental transactions and records</p>
            </div>
            <button onclick="openPrivateTruckModal()" class="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition">
                <i class="fa-solid fa-plus"></i> Add New Rental
            </button>
        </div>

        <!-- Data Table Container -->
        <div class="glass-panel rounded-2xl overflow-hidden border border-slate-200/80 bg-white shadow-xs">
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

// Helper to generate table rows
function generateRentalRowsHTML() {
    if (privateTruckRentals.length === 0) {
        return `
            <tr>
                <td colspan="7" class="p-10 text-center text-slate-400 text-xs">
                    <i class="fa-solid fa-truck-ramp-box text-3xl mb-2 block text-slate-300"></i>
                    No rental records found. Click "Add New Rental" to add one.
                </td>
            </tr>
        `;
    }

    return privateTruckRentals.map((item, index) => `
        <tr class="hover:bg-slate-50/80 transition">
            <td class="p-3.5 font-medium text-slate-800">${item.date || '-'}</td>
            <td class="p-3.5"><span class="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-semibold text-[11px]">${item.days || 0} Days</span></td>
            <td class="p-3.5 font-bold text-emerald-600">$${parseFloat(item.amount || 0).toLocaleString()}</td>
            <td class="p-3.5"><span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 text-[10px] font-bold">${item.paymentType || '-'}</span></td>
            <td class="p-3.5 text-slate-600">${item.paidBy || '-'}</td>
            <td class="p-3.5 text-slate-600">${item.truckLabel || '-'}</td>
            <td class="p-3.5 text-center">
                <button onclick="deleteRentalRecord(${index})" class="p-1.5 text-slate-400 hover:text-red-600 transition" title="Delete">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Delete Record
function deleteRentalRecord(index) {
    if (confirm('Are you sure you want to delete this rental record?')) {
        privateTruckRentals.splice(index, 1);
        savePrivateTruckRentals(privateTruckRentals);
        showPrivateTruckRentalTab();
    }
}

// Render Modal Pop-up (Only builds/shows when explicitly opened)
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
                <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
                    <i class="fa-solid fa-truck-moving text-indigo-600"></i> Private Truck Rental Form
                </h3>
                <button onclick="closePrivateTruckModal()" class="text-slate-400 hover:text-slate-600 transition p-1">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <form id="privateTruckForm" onsubmit="handlePrivateTruckSubmit(event)" class="p-6 space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Date <span class="text-red-500">*</span></label>
                    <input type="date" id="rentalDate" required
                        class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-700">
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">No of days <span class="text-red-500">*</span></label>
                    <div class="flex items-center">
                        <button type="button" onclick="adjustRentalNumber('rentalDays', -1)" class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-l-xl border border-r-0 border-slate-200 transition text-xs font-bold">-</button>
                        <input type="number" id="rentalDays" value="0" min="0" required
                            class="w-full px-3 py-2.5 text-xs text-center bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-700">
                        <button type="button" onclick="adjustRentalNumber('rentalDays', 1)" class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-r-xl border border-l-0 border-slate-200 transition text-xs font-bold">+</button>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Amount <span class="text-red-500">*</span></label>
                    <div class="flex items-center">
                        <button type="button" onclick="adjustRentalNumber('rentalAmount', -10)" class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-l-xl border border-r-0 border-slate-200 transition text-xs font-bold">-</button>
                        <input type="number" id="rentalAmount" value="0" min="0" step="0.01" required
                            class="w-full px-3 py-2.5 text-xs text-center bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-700">
                        <button type="button" onclick="adjustRentalNumber('rentalAmount', 10)" class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-r-xl border border-l-0 border-slate-200 transition text-xs font-bold">+</button>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Payment type</label>
                    <select id="rentalPaymentType"
                        class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-700">
                        <option value="" disabled selected>Select payment method</option>
                        <option value="Cash">Cash</option>
                        <option value="Zelle">Zelle</option>
                        <option value="Cheque">Cheque</option>
                        <option value="PMO">PMO</option>
                        <option value="BC">BC</option>
                        <option value="PC">PC</option>
                        <option value="CC">CC</option>
                        <option value="WT">WT</option>
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Paid By</label>
                    <input type="text" id="rentalPaidBy" placeholder="Enter Payer Name"
                        class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-700">
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Truck_Label</label>
                    <input type="text" id="rentalTruckLabel" placeholder="days paid by"
                        class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-700">
                </div>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" onclick="closePrivateTruckModal()" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition border border-slate-200">Cancel</button>
                    <button type="submit" class="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition">Save</button>
                </div>
            </form>
        </div>
    `;
}

function openPrivateTruckModal() {
    renderPrivateTruckModal();
    const modal = document.getElementById('privateTruckModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closePrivateTruckModal() {
    const modal = document.getElementById('privateTruckModal');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
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

    const newRecord = {
        date: document.getElementById('rentalDate').value,
        days: document.getElementById('rentalDays').value,
        amount: document.getElementById('rentalAmount').value,
        paymentType: document.getElementById('rentalPaymentType').value,
        paidBy: document.getElementById('rentalPaidBy').value,
        truckLabel: document.getElementById('rentalTruckLabel').value
    };

    privateTruckRentals.unshift(newRecord);
    savePrivateTruckRentals(privateTruckRentals);

    closePrivateTruckModal();
    showPrivateTruckRentalTab();
}
