/**
 * Private Truck Rental Form Component
 * Renders the modal and handles input fields for truck rentals (Date, No of days, Amount, Payment type, Paid By, Truck_Label).
 */

function renderPrivateTruckRentalModal() {
    // Check if modal container already exists, if not, create it
    let modalContainer = document.getElementById('privateTruckModal');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'privateTruckModal';
        modalContainer.className = 'fixed inset-0 bg-slate-950/60 backdrop-blur-xs hidden items-center justify-center z-50 p-4 overflow-y-auto';
        document.body.appendChild(modalContainer);
    }

    modalContainer.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 transform transition-all">
            <!-- Modal Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
                    <i class="fa-solid fa-truck-moving text-indigo-600"></i> Private Truck Rental Form
                </h3>
                <button onclick="closePrivateTruckModal()" class="text-slate-400 hover:text-slate-600 transition p-1">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <!-- Modal Body / Form Fields -->
            <form id="privateTruckForm" onsubmit="handlePrivateTruckSubmit(event)" class="p-6 space-y-4">
                <!-- Date Field -->
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Date <span class="text-red-500">*</span></label>
                    <div class="relative">
                        <input type="date" id="rentalDate" required
                            class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-700">
                    </div>
                </div>

                <!-- No of days Field -->
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">No of days <span class="text-red-500">*</span></label>
                    <div class="flex items-center">
                        <button type="button" onclick="adjustRentalNumber('rentalDays', -1)" class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-l-xl border border-r-0 border-slate-200 transition text-xs font-bold">
                            <i class="fa-solid fa-minus"></i>
                        </button>
                        <input type="number" id="rentalDays" value="0" min="0" required
                            class="w-full px-3 py-2.5 text-xs text-center bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-700">
                        <button type="button" onclick="adjustRentalNumber('rentalDays', 1)" class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-r-xl border border-l-0 border-slate-200 transition text-xs font-bold">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                </div>

                <!-- Amount Field -->
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Amount <span class="text-red-500">*</span></label>
                    <div class="flex items-center">
                        <button type="button" onclick="adjustRentalNumber('rentalAmount', -10)" class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-l-xl border border-r-0 border-slate-200 transition text-xs font-bold">
                            <i class="fa-solid fa-minus"></i>
                        </button>
                        <input type="number" id="rentalAmount" value="0" min="0" step="0.01" required
                            class="w-full px-3 py-2.5 text-xs text-center bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-700">
                        <button type="button" onclick="adjustRentalNumber('rentalAmount', 10)" class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-r-xl border border-l-0 border-slate-200 transition text-xs font-bold">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                </div>

                <!-- Payment type -->
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

                <!-- Paid By -->
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Paid By</label>
                    <input type="text" id="rentalPaidBy" placeholder="Enter Payer Name"
                        class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-700">
                </div>

                <!-- Truck_Label -->
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Truck_Label</label>
                    <input type="text" id="rentalTruckLabel" placeholder="days paid by"
                        class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-700">
                </div>

                <!-- Modal Actions / Footer -->
                <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" onclick="closePrivateTruckModal()"
                        class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition border border-slate-200">
                        Cancel
                    </button>
                    <button type="submit"
                        class="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition">
                        Save
                    </button>
                </div>
            </form>
        </div>
    `;
}

// Open Modal Function
function openPrivateTruckModal() {
    renderPrivateTruckRentalModal();
    const modal = document.getElementById('privateTruckModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

// Close Modal Function
function closePrivateTruckModal() {
    const modal = document.getElementById('privateTruckModal');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
}

// Adjust number helper for plus and minus buttons
function adjustRentalNumber(elementId, step) {
    const input = document.getElementById(elementId);
    if (input) {
        let currentValue = parseFloat(input.value) || 0;
        let newValue = currentValue + step;
        if (newValue < 0) newValue = 0;
        input.value = newValue;
    }
}

// Handle Form Submission
function handlePrivateTruckSubmit(event) {
    event.preventDefault();

    const rentalData = {
        date: document.getElementById('rentalDate').value,
        days: document.getElementById('rentalDays').value,
        amount: document.getElementById('rentalAmount').value,
        paymentType: document.getElementById('rentalPaymentType').value,
        paidBy: document.getElementById('rentalPaidBy').value,
        truckLabel: document.getElementById('rentalTruckLabel').value
    };

    console.log('Saved Private Truck Rental Data:', rentalData);

    // Save to localStorage or push to master records if needed
    let savedRentals = JSON.parse(localStorage.getItem('privateTruckRentals')) || [];
    savedRentals.push(rentalData);
    localStorage.setItem('privateTruckRentals', JSON.stringify(savedRentals));

    alert('Private Truck Rental record saved successfully!');
    closePrivateTruckModal();
    document.getElementById('privateTruckForm').reset();
}
