/**
 * MovePro - Private Truck Rental Module
 * Supabase Integrated Version (Direct Cloud Database Sync)
 */

// 1. Data Utility Functions & Converters
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
async function loadPrivateTruckRentals() {
    try {
        if (!window.supabaseClient) {
            console.error("Supabase client is not initialized!");
            return [];
        }

        const { data, error } = await window.supabaseClient
            .from('truck_rental')
            .select('*')
            .or('is_deleted.is.null,is_deleted.eq.false') // استبعاد السجلات المحذوفة من الجدول النشط
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

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs w-full">
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
                        <tr><td colspan="7" class="text-center py-6 text-slate-400 text-xs">Loading rental records...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    injectPrivateTruckModalHTML();
    await refreshPrivateTruckData();
}
window.renderPrivateTruckRentalTab = renderPrivateTruckRentalTab;

function renderRentalRow(item, index) {
    return `
        <tr class="hover:bg-slate-50 border-b border-slate-100">
            <td class="p-3 border">${item.date || '-'}</td>
            <td class="p-3 border font-semibold text-slate-800">${item.truckLabel || '-'}</td>
            <td class="p-3 border text-center">${item.Days ?? '-'}</td>
            <td class="p-3 border">${item.paidBy || '-'}</td>
            <td class="p-3 border">
                <span class="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700">
                    ${item.paymentType || item.paymentMethod || '-'}
                </span>
            </td>
            <td class="p-3 border text-right font-bold text-emerald-600">$${item.amount || '0'}</td>
            <td class="p-3 border text-center space-x-2">
                <button onclick="editRental(${item.id || index})" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-semibold transition cursor-pointer" title="Edit">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button onclick="deleteRental(${item.id || index})" class="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition cursor-pointer" title="Delete">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        </tr>
    `;
}

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
        return `<tr><td colspan="7" class="text-center py-6 text-slate-400 text-xs">No rental records found</td></tr>`;
    }

    return rentals.map((item) => {
        let numAmt = parseFloat(String(item.amount || '0').replace(/[^0-9.]/g, '')) || 0;
        let formattedAmount = '$' + numAmt.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

        return `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="p-3.5 font-medium text-slate-800">${item.date || '-'}</td>
                <td class="p-3.5 text-slate-600">${item.days || 0} Days</td>
                <td class="p-3.5 text-emerald-700 font-bold">${formattedAmount}</td>
                <td class="p-3.5"><span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">${item.paymentType || '-'}</span></td>
                <td class="p-3.5 text-slate-600">${item.paidBy || '-'}</td>
                <td class="p-3.5 text-slate-600">${item.truckLabel || '-'}</td>
                <td class="p-3.5 text-center">
                    <div class="flex items-center justify-center space-x-1">
                        <button type="button" onclick="editPrivateTruckRental(${item.id})" class="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer" title="Edit Rental"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button type="button" onclick="deletePrivateTruckRental(${item.id})" class="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer" title="Delete Rental"><i class="fa-solid fa-trash-can"></i></button>
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
    modalDiv.className = 'fixed inset-0 bg-slate-900/50 backdrop-blur-xs hidden justify-center items-center p-4 z-50';

    modalDiv.innerHTML = `
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 border border-slate-100">
            <div class="flex justify-between items-center border-b pb-3">
                <h3 id="privateTruckModalTitle" class="text-base font-bold text-slate-800">Add New Truck Rental</h3>
                <button type="button" onclick="closePrivateTruckModal()" class="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
            </div>
            
            <form id="privateTruckForm" onsubmit="savePrivateTruckRental(event)" class="space-y-4 text-xs">
                <input type="hidden" id="rentalEditId" value="">
                
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Date</label>
                        <input type="date" id="rentalDate" required class="w-full p-2.5 border rounded-xl focus:outline-none focus:border-emerald-500">
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Number of Days</label>
                        <input type="number" min="1" id="rentalDays" placeholder="e.g. 1" required class="w-full p-2.5 border rounded-xl focus:outline-none focus:border-emerald-500">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Amount ($)</label>
                        <input type="number" step="0.01" id="rentalAmount" placeholder="e.g. 500" required class="w-full p-2.5 border rounded-xl focus:outline-none focus:border-emerald-500">
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Payment Type</label>
                        <select id="rentalPaymentType" class="w-full p-2.5 border rounded-xl focus:outline-none focus:border-emerald-500 bg-white font-semibold">
                            <option value="Cash">Cash</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Zelle">Zelle</option>
                            <option value="Card">Card</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Paid By</label>
                        <input type="text" id="rentalPaidBy" placeholder="e.g. U-Haul, Sharef" required class="w-full p-2.5 border rounded-xl focus:outline-none focus:border-emerald-500">
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Truck Label / Note</label>
                        <input type="text" id="rentalTruckLabel" placeholder="e.g. 1 day rental" class="w-full p-2.5 border rounded-xl focus:outline-none focus:border-emerald-500">
                    </div>
                </div>

                <div class="flex justify-end space-x-2 border-t pt-4">
                    <button type="button" onclick="closePrivateTruckModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition">Cancel</button>
                    <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition shadow-sm">Save Rental</button>
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

    // تجهيز الحقول لتتطابق مع أعمدة Supabase بالضبط
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
        // تحديث سجل موجود
        response = await window.supabaseClient
            .from('truck_rental')
            .update(payload)
            .eq('id', editId);
    } else {
        // إضافة سجل جديد
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
        // 1. إعادة جلب بيانات الشاحنات وتحديث الواجهة فوراً
        if (typeof refreshPrivateTruckData === 'function') {
            await refreshPrivateTruckData();
        }
        // 2. تحديث سلة المحذوفات
        if (typeof renderTrashBin === 'function') {
            renderTrashBin();
        }
    }
}
window.deletePrivateTruckRental = deletePrivateTruckRental;
