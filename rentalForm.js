/**
 * MovePro - Private Truck Rental Module
 * Supabase Integrated Version (Direct Cloud Database Sync)
 */

// 1. Data Utility Functions & Converters

// Escape user-entered text before inserting it into HTML (prevents script injection)
function escapeHTML(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
window.escapeHTML = escapeHTML;

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
window.formatDateForInput = formatDateForInput;

function formatDateToSlash(dateStr) {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-');
        return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year}`;
    }
    return dateStr;
}
window.formatDateToSlash = formatDateToSlash;

// 2. Fetch Data from Supabase
// This is the single source of truth for truck rental data.
// storage.js -> loadTruckRentals() delegates to this function.
const TRUCK_RENTALS_CACHE_KEY = 'movepro_private_truck_rentals';

async function loadPrivateTruckRentals() {
    try {
        if (!window.supabaseClient) {
            console.error("Supabase client is not initialized!");
            try {
                const cached = JSON.parse(localStorage.getItem(TRUCK_RENTALS_CACHE_KEY) || '[]');
                return Array.isArray(cached) ? cached : [];
            } catch (e) {
                return [];
            }
        }

        const { data, error } = await window.supabaseClient
            .from('truck_rental')
            .select('*')
            .or('is_deleted.is.null,is_deleted.eq.false') // Exclude soft-deleted records
            .order('id', { ascending: false });

        if (error) {
            console.error('Error fetching truck rentals from Supabase:', error);
            return [];
        }

        const formattedRentals = (data || []).map(item => ({
            id: item.id,
            date: item.date || '',
            days: parseInt(item.Days) || 0,
            amount: item.amount || '$0',
            paymentType: item.paymentType || 'Cash',
            paidBy: item.paidBy || '',
            truckLabel: item.truckLabel || ''
        }));

        window.currentTruckRentals = formattedRentals;
        try {
            localStorage.setItem(TRUCK_RENTALS_CACHE_KEY, JSON.stringify(formattedRentals));
        } catch (e) { /* storage unavailable - ignore */ }
        return formattedRentals;
    } catch (e) {
        console.error('Error loading private truck rentals:', e);
        return [];
    }
}
window.loadPrivateTruckRentals = loadPrivateTruckRentals;
// 3. Interface Rendering Function
async function renderPrivateTruckRentalTab() {
    const container = document.getElementById('tab-rentals') || document.getElementById('tab-private-truck-rental');
    if (!container) return;

    container.className = "view-section hidden flex flex-col space-y-6 w-full max-w-full";

    container.innerHTML = `
        <!-- 1. Header & Actions -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-surface-200/80 shadow-sm w-full">
            <div>
                <h2 class="text-xl font-bold text-surface-800">Private Truck Rental Management</h2>
                <p class="text-xs text-surface-500 mt-1">Manage and track private truck rental transactions and records</p>
            </div>
            <button onclick="openPrivateTruckModal()" class="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-sm cursor-pointer">
                <i class="fa-solid fa-plus"></i> Add New Rental
            </button>
        </div>

        <!-- 2. Financial Summary Cards -->
        <div class="bg-white rounded-2xl shadow-sm border border-surface-200/80 p-6 space-y-4 w-full">
            <div class="border-b border-surface-100 pb-3 flex flex-wrap justify-between items-center gap-2">
                <div>
                    <h3 class="text-sm font-bold text-surface-800">Private Truck Rental Financial Summary</h3>
                    <p class="text-[11px] text-surface-400">Comprehensive summary of rental duration, cash payments, and total expenses</p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-surface-700 bg-surface-100 px-3 py-1 rounded-xl">
                        Total Rental Records: <span id="rentalTotalRecordsCount" class="text-primary-600">0</span>
                    </span>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs w-full">
                <div class="p-4 bg-surface-50 rounded-xl border border-surface-200/60 text-center">
                    <span class="text-[10px] uppercase font-bold text-surface-500 block">Total Rental Days</span>
                    <span id="sumRentalDaysCell" class="text-lg font-extrabold text-surface-800 mt-1 block">0 Days</span>
                </div>
                <div class="p-4 bg-primary-50/40 rounded-xl border border-primary-100 text-center">
                    <span class="text-[10px] uppercase font-bold text-primary-700 block">Cash Payments</span>
                    <span id="sumRentalCashCell" class="text-lg font-extrabold text-primary-600 mt-1 block">$0.00</span>
                </div>
                <div class="p-4 bg-info-50/40 rounded-xl border border-info-100 text-center">
                    <span class="text-[10px] uppercase font-bold text-info-700 block">Other Payments (Zelle/Check)</span>
                    <span id="sumRentalOtherCell" class="text-lg font-extrabold text-info-600 mt-1 block">$0.00</span>
                </div>
                <div class="p-4 bg-warning-500 rounded-xl text-white text-center shadow-xs">
                    <span class="text-[10px] uppercase font-bold opacity-90 block">Grand Total Rental Cost</span>
                    <span id="sumRentalGrandTotalCell" class="text-lg font-black mt-1 block">$0.00</span>
                </div>
            </div>
        </div>

        <!-- 3. Detailed Records Table -->
        <div class="bg-white rounded-2xl overflow-hidden border border-surface-200 shadow-sm w-full">
            <div class="overflow-x-auto w-full">
                <table class="w-full text-left text-xs border-collapse min-w-[900px]">
                    <thead class="bg-surface-50 text-surface-600 uppercase text-[10px] tracking-wider border-b border-surface-200">
                        <tr>
                            <th class="p-3.5">Date</th>
                            <th class="p-3.5">No. of Days</th>
                            <th class="p-3.5 text-primary-700">Amount</th>
                            <th class="p-3.5">Payment Type</th>
                            <th class="p-3.5">Paid By</th>
                            <th class="p-3.5">Truck Label</th>
                            <th class="p-3.5 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="truckRentalTableBody" class="divide-y divide-surface-100 text-surface-700 bg-white">
                        <tr><td colspan="7" class="text-center py-6 text-surface-400 text-xs">Loading rental records...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    injectPrivateTruckModalHTML();
    await refreshPrivateTruckData();
}
window.renderPrivateTruckRentalTab = renderPrivateTruckRentalTab;

// 4. Reload Data & Update UI Components
async function refreshPrivateTruckData() {
    const rentals = await loadPrivateTruckRentals();
    
    const tbody = document.getElementById('truckRentalTableBody');
    if (tbody) tbody.innerHTML = generateRentalRowsHTML(rentals);

    renderTruckRentalSummary(rentals);
}
window.refreshPrivateTruckData = refreshPrivateTruckData;

// 5. Summary Calculations
function renderTruckRentalSummary(rentalsData) {
    const rentals = rentalsData || window.currentTruckRentals || [];
    
    let totalDays = 0;
    let sumCash = 0;
    let sumOther = 0;
    let grandTotal = 0;

    rentals.forEach(r => {
        totalDays += r.days || 0;

        let numAmt = parseFloat(String(r.amount || '0').replace(/[^0-9.]/g, '')) || 0;
        grandTotal += numAmt;

        const paymentType = String(r.paymentType || '').toLowerCase();
        if (paymentType.includes('cash')) {
            sumCash += numAmt;
        } else {
            sumOther += numAmt;
        }
    });

    const setElementText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    setElementText('rentalTotalRecordsCount', rentals.length);
    setElementText('sumRentalDaysCell', `${totalDays} Days`); 
    setElementText('sumRentalCashCell', `$${sumCash.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    setElementText('sumRentalOtherCell', `$${sumOther.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`); 
    setElementText('sumRentalGrandTotalCell', `$${grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
}
window.renderTruckRentalSummary = renderTruckRentalSummary;

// 6. Table Rows Generator
function generateRentalRowsHTML(rentalsData) {
    const rentals = rentalsData || window.currentTruckRentals || [];

    if (!rentals || rentals.length === 0) {
        return `<tr><td colspan="7" class="text-center py-6 text-surface-400 text-xs">No rental records found</td></tr>`;
    }

    return rentals.map((item) => {
        let numAmt = parseFloat(String(item.amount || '0').replace(/[^0-9.]/g, '')) || 0;
        let formattedAmount = '$' + numAmt.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        const safeId = Number(item.id) || 0;

        return `
            <tr class="hover:bg-surface-50 transition border-b border-surface-100">
                <td class="p-3.5 font-medium text-surface-800">${escapeHTML(item.date || '-')}</td>
                <td class="p-3.5 text-surface-600">${Number(item.days) || 0} Days</td>
                <td class="p-3.5 text-primary-700 font-bold">${formattedAmount}</td>
                <td class="p-3.5"><span class="px-2 py-0.5 bg-surface-100 text-surface-700 rounded-md text-[10px] font-bold">${escapeHTML(item.paymentType || '-')}</span></td>
                <td class="p-3.5 text-surface-600">${escapeHTML(item.paidBy || '-')}</td>
                <td class="p-3.5 text-surface-600">${escapeHTML(item.truckLabel || '-')}</td>
                <td class="p-3.5 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button type="button" onclick="editPrivateTruckRental(${safeId})" class="px-2 py-1 text-xs bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-lg cursor-pointer" title="Edit Rental"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button type="button" onclick="deletePrivateTruckRental(${safeId})" class="px-2 py-1 text-xs bg-danger-50 hover:bg-danger-100 text-danger-600 rounded-lg cursor-pointer" title="Delete Rental"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}
window.generateRentalRowsHTML = generateRentalRowsHTML;

// 7. Dynamic Modal Injection & Cloud CRUD Operations
function injectPrivateTruckModalHTML() {
    if (document.getElementById('privateTruckModal')) return;

    const modalDiv = document.createElement('div');
    modalDiv.id = 'privateTruckModal';
    modalDiv.className = 'fixed inset-0 bg-surface-900/50 backdrop-blur-xs hidden justify-center items-center p-4 z-50';

    modalDiv.innerHTML = `
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 border border-surface-100">
            <div class="flex justify-between items-center border-b pb-3">
                <h3 id="privateTruckModalTitle" class="text-base font-bold text-surface-800">Add New Truck Rental</h3>
                <button type="button" onclick="closePrivateTruckModal()" class="text-surface-400 hover:text-surface-600 font-bold text-lg">&times;</button>
            </div>
            
            <form id="privateTruckForm" onsubmit="savePrivateTruckRental(event)" class="space-y-4 text-xs">
                <input type="hidden" id="rentalEditId" value="">
                
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block font-semibold text-surface-700 mb-1">Date</label>
                        <input type="date" id="rentalDate" required class="w-full p-2.5 border rounded-xl focus:outline-none focus:border-primary-500">
                    </div>
                    <div>
                        <label class="block font-semibold text-surface-700 mb-1">Number of Days</label>
                        <input type="number" min="1" id="rentalDays" placeholder="e.g. 1" required class="w-full p-2.5 border rounded-xl focus:outline-none focus:border-primary-500">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block font-semibold text-surface-700 mb-1">Amount ($)</label>
                        <input type="number" step="0.01" id="rentalAmount" placeholder="e.g. 500" required class="w-full p-2.5 border rounded-xl focus:outline-none focus:border-primary-500">
                    </div>
                    <div>
                        <label class="block font-semibold text-surface-700 mb-1">Payment Type</label>
                        <select id="rentalPaymentType" class="w-full p-2.5 border rounded-xl focus:outline-none focus:border-primary-500 bg-white font-semibold">
                            <option value="Cash">Cash</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Zelle">Zelle</option>
                            <option value="Card">Card</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block font-semibold text-surface-700 mb-1">Paid By</label>
                        <input type="text" id="rentalPaidBy" placeholder="e.g. U-Haul, Sharef" required class="w-full p-2.5 border rounded-xl focus:outline-none focus:border-primary-500">
                    </div>
                    <div>
                        <label class="block font-semibold text-surface-700 mb-1">Truck Label / Note</label>
                        <input type="text" id="rentalTruckLabel" placeholder="e.g. 1 day rental" class="w-full p-2.5 border rounded-xl focus:outline-none focus:border-primary-500">
                    </div>
                </div>

                <div class="flex justify-end space-x-2 border-t pt-4">
                    <button type="button" onclick="closePrivateTruckModal()" class="px-4 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-xl font-semibold transition">Cancel</button>
                    <button type="submit" class="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition shadow-sm">Save Rental</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modalDiv);
}

function openPrivateTruckModal() {
    injectPrivateTruckModalHTML();
    const modal = document.getElementById('privateTruckModal');
    const form = document.getElementById('privateTruckForm');
    const editId = document.getElementById('rentalEditId');
    const title = document.getElementById('privateTruckModalTitle');

    if (form) form.reset();
    if (editId) editId.value = "";
    if (title) title.innerText = "Add New Truck Rental";

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}
window.openPrivateTruckModal = openPrivateTruckModal;

function closePrivateTruckModal() {
    const modal = document.getElementById('privateTruckModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}
window.closePrivateTruckModal = closePrivateTruckModal;

async function savePrivateTruckRental(e) {
    if (e) e.preventDefault();

    if (!window.supabaseClient) {
        alert("Supabase client is not initialized!");
        return;
    }

    const editId = document.getElementById('rentalEditId').value;
    const dateRaw = document.getElementById('rentalDate').value;
    const days = parseInt(document.getElementById('rentalDays').value, 10) || 1;
    const amountNum = parseFloat(document.getElementById('rentalAmount').value) || 0;
    const paymentType = document.getElementById('rentalPaymentType').value;
    const paidBy = document.getElementById('rentalPaidBy').value.trim();
    const truckLabel = document.getElementById('rentalTruckLabel').value.trim();

    // Build the payload to match the Supabase column names exactly
    const payload = {
        date: formatDateToSlash(dateRaw),
        Days: days,
        amount: '$' + amountNum.toFixed(2),
        paymentType: paymentType,
        paidBy: paidBy,
        truckLabel: truckLabel || `${days} day(s) rental`
    };

    let response;
    if (editId) {
        // Update an existing record
        response = await window.supabaseClient
            .from('truck_rental')
            .update(payload)
            .eq('id', editId);
    } else {
        // Insert a new record
        response = await window.supabaseClient
            .from('truck_rental')
            .insert([payload]);
    }

    if (response.error) {
        console.error('Error saving to Supabase:', response.error);
        alert('Supabase Error: ' + response.error.message);
    } else {
        closePrivateTruckModal();
        await refreshPrivateTruckData();
    }
}
window.savePrivateTruckRental = savePrivateTruckRental;

function editPrivateTruckRental(id) {
    const rentals = window.currentTruckRentals || [];
    const item = rentals.find(r => r.id === id);
    if (!item) return;

    openPrivateTruckModal();

    document.getElementById('privateTruckModalTitle').innerText = "Edit Truck Rental Record";
    document.getElementById('rentalEditId').value = item.id;
    document.getElementById('rentalDate').value = formatDateForInput(item.date);
    document.getElementById('rentalDays').value = item.days || 1;
    
    let rawAmount = parseFloat(String(item.amount).replace(/[^0-9.]/g, '')) || 0;
    document.getElementById('rentalAmount').value = rawAmount;
    
    document.getElementById('rentalPaymentType').value = item.paymentType || 'Cash';
    document.getElementById('rentalPaidBy').value = item.paidBy || '';
    document.getElementById('rentalTruckLabel').value = item.truckLabel || '';
}
window.editPrivateTruckRental = editPrivateTruckRental;

async function deletePrivateTruckRental(id) {
    if (!confirm('Are you sure you want to move this rental record to the Recycle Bin?')) return;

    if (!window.supabaseClient) {
        alert("Supabase client is not initialized!");
        return;
    }

    const { error } = await window.supabaseClient
        .from('truck_rental')
        .update({ is_deleted: true })
        .eq('id', id);

    if (error) {
        console.error('Error moving to Recycle Bin:', error);
        alert('Supabase Error: ' + error.message);
    } else {
        // 1. Reload truck rental data and refresh the UI immediately
        if (typeof refreshPrivateTruckData === 'function') {
            await refreshPrivateTruckData();
        }
        // 2. Refresh the Recycle Bin
        if (typeof renderTrashBin === 'function') {
            renderTrashBin();
        }
    }
}
window.deletePrivateTruckRental = deletePrivateTruckRental;
