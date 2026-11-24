/**
 * Warehouse & Others Module - MovePro (Supabase Cloud Integrated & Clean Version)
 */

if (typeof window.WAREHOUSE_STORAGE_KEY === 'undefined') {
    window.WAREHOUSE_STORAGE_KEY = 'movepro_warehouse_records';
}

// Convert a date from table format (M/D/YYYY) to input-field format (YYYY-MM-DD)
function formatWarehouseDateForInput(dateStr) {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        let month = parts[0].padStart(2, '0');
        let day = parts[1].padStart(2, '0');
        let year = parts[2];
        return `${year}-${month}-${day}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return dateStr;
}

// Convert a date from input-field format (YYYY-MM-DD) to table format (M/D/YYYY)
function formatWarehouseDateToSlash(dateStr) {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-');
        return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year}`;
    }
    return dateStr;
}

async function loadWarehouseData() {
    try {
        if (!window.supabaseClient) {
            console.error("Supabase client is not initialized!");
            return [];
        }

        // Fetch only non-deleted warehouse records directly from Supabase
        const { data, error } = await window.supabaseClient
            .from('warehouse_expenses')
            .select('*')
            .or('is_deleted.is.null,is_deleted.eq.false')
            .order('id', { ascending: false });

        if (error) {
            console.error('Error fetching warehouse records from Supabase:', error);
            return [];
        }

        const formattedRecords = (data || []).map(item => ({
            id: item.id,
            date: item.date || '',
            services: item.services || '',
            details: item.details || '',
            paymentType: item.paymentType || 'Cash',
            amount: parseFloat(item.amount) || 0
        }));

        formattedRecords.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        window.currentWarehouseRecords = formattedRecords;
        
        return formattedRecords;

    } catch (e) {
        console.error('Error loading warehouse records from Supabase:', e);
        return [];
    }
}
window.loadWarehouseData = loadWarehouseData;

// Compatibility wrapper used to fetch records on Refresh
async function loadWarehouseRecords() {
    return await loadWarehouseData();
}
window.loadWarehouseRecords = loadWarehouseRecords;

// Create the warehouse modal dynamically to avoid missing-element errors
function ensureWarehouseModalExists() {
    let modal = document.getElementById('warehouseModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'warehouseModal';
        modal.className = 'fixed inset-0 bg-surface-950/60 backdrop-blur-xs hidden items-center justify-center z-50 p-4 overflow-y-auto';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-surface-100 transform transition-all">
                <div class="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-surface-50/50">
                    <h3 id="warehouseModalTitle" class="text-base font-bold text-surface-800 flex items-center gap-2">
                        <i class="fa-solid fa-warehouse text-warning-500"></i> Add Warehouse Expense
                    </h3>
                    <button type="button" onclick="closeWarehouseModal()" class="text-surface-400 hover:text-surface-600 transition p-1 cursor-pointer">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <form id="warehouseForm" autocomplete="off" onsubmit="handleWarehouseSubmit(event)" class="p-6 space-y-4 text-xs">
                    <input type="hidden" id="editWarehouseId" value="">

                    <div>
                        <label class="block font-semibold text-surface-700 mb-1">Date <span class="text-danger-500">*</span></label>
                        <input type="date" id="warehouseDate" required class="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-xl focus:outline-none transition text-surface-700">
                    </div>

                    <div>
                        <label class="block font-semibold text-surface-700 mb-1">Category / Service <span class="text-danger-500">*</span></label>
                        <input type="text" id="warehouseService" autocomplete="off" required placeholder="Category / Service" class="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-xl focus:outline-none transition text-surface-700">
                    </div>

                    <div>
                        <label class="block font-semibold text-surface-700 mb-1">Description / Details</label>
                        <input type="text" id="warehouseDetails" autocomplete="off" placeholder="Description" class="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-xl focus:outline-none transition text-surface-700">
                    </div>

                    <div>
                        <label class="block font-semibold text-surface-700 mb-1">Payment Method</label>
                        <select id="warehousePaymentType" class="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-xl focus:outline-none transition text-surface-700">
                            <option value="Cash">Cash</option>
                            <option value="Zelle">Zelle</option>
                            <option value="CashApp">CashApp</option>
                            <option value="PMO">PMO</option>
                            <option value="Others">Others</option>
                        </select>
                    </div>

                    <div>
                        <label class="block font-semibold text-surface-700 mb-1">Amount ($) <span class="text-danger-500">*</span></label>
                        <input type="number" id="warehouseAmount" autocomplete="off" placeholder="Amount" min="0" step="0.01" required class="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-xl focus:outline-none transition text-surface-700">
                    </div>

                    <div class="flex items-center justify-end gap-3 pt-4 border-t border-surface-100">
                        <button type="button" onclick="closeWarehouseModal()" class="px-4 py-2 font-semibold text-surface-600 hover:bg-surface-100 rounded-xl transition border border-surface-200 cursor-pointer">Cancel</button>
                        <button type="submit" class="px-5 py-2 font-semibold text-white bg-secondary-600 hover:bg-secondary-700 rounded-xl shadow-sm transition cursor-pointer">Save Record</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }
}
window.ensureWarehouseModalExists = ensureWarehouseModalExists;

function openWarehouseModal(isEdit = false) {
    ensureWarehouseModalExists();
    const modal = document.getElementById('warehouseModal');
    const form = document.getElementById('warehouseForm');
    const titleEl = document.getElementById('warehouseModalTitle');

    if (form && !isEdit) {
        form.reset();
        const idField = document.getElementById('editWarehouseId');
        if (idField) idField.value = '';
        if (titleEl) titleEl.innerText = 'Add Warehouse Expense';
    }

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.setProperty('display', 'flex', 'important');
    }
}
window.openWarehouseModal = openWarehouseModal;

function closeWarehouseModal() {
    const modal = document.getElementById('warehouseModal');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        modal.style.setProperty('display', 'none', 'important');
    }
}
window.closeWarehouseModal = closeWarehouseModal;

// Render the full warehouse view and table
async function renderWarehouseTab() {
    const container = document.getElementById('tab-warehouse');
    if (!container) return;

    container.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-surface-200 shadow-xs mb-6">
            <div>
                <h3 class="font-bold text-surface-900 text-base">Warehouse & Inventory Management</h3>
                <p class="text-xs text-surface-500 mt-0.5">Track equipment, gear, and supplies stock levels and expenses.</p>
            </div>
            <button type="button" onclick="openWarehouseModal(false)" class="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer">
                <i class="fa-solid fa-plus"></i> Add Expense / Record
            </button>
        </div>

        ${window.WathekDateRange ? window.WathekDateRange.barHTML('warehouseDate', 'applyWarehouseDateFilter', 'clearWarehouseDateFilter', window.warehouseDateFilter) : ''}

        <div class="bg-white rounded-2xl shadow-sm border border-surface-200/80 p-6 space-y-4 w-full mb-6">
            <div class="border-b border-surface-100 pb-3">
                <h3 class="text-sm font-bold text-surface-800">Warehouse Financial Summary</h3>
                <p class="text-[11px] text-surface-400">Summary of the records shown below (follows the date filter)</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs w-full">
                <div class="p-4 bg-surface-50 rounded-xl border border-surface-200/60 text-center">
                    <span class="text-[10px] uppercase font-bold text-surface-500 block">Total Records</span>
                    <span id="sumWarehouseCountCell" class="text-lg font-extrabold text-surface-800 mt-1 block">0</span>
                </div>
                <div class="p-4 bg-primary-50/40 rounded-xl border border-primary-100 text-center">
                    <span class="text-[10px] uppercase font-bold text-primary-700 block">Cash Payments</span>
                    <span id="sumWarehouseCashCell" class="text-lg font-extrabold text-primary-600 mt-1 block">$0.00</span>
                </div>
                <div class="p-4 bg-info-50/40 rounded-xl border border-info-100 text-center">
                    <span class="text-[10px] uppercase font-bold text-info-700 block">Other Payments</span>
                    <span id="sumWarehouseOtherCell" class="text-lg font-extrabold text-info-600 mt-1 block">$0.00</span>
                </div>
                <div class="p-4 bg-warning-500 rounded-xl text-white text-center shadow-xs">
                    <span class="text-[10px] uppercase font-bold opacity-90 block">Grand Total Warehouse Cost</span>
                    <span id="sumWarehouseGrandTotalCell" class="text-lg font-black mt-1 block">$0.00</span>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-2xl shadow-xs border border-surface-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                    <thead class="bg-surface-50 border-b border-surface-200 text-surface-600 uppercase text-[10px]">
                        <tr>
                            <th class="p-3.5">Date</th>
                            <th class="p-3.5">Category</th>
                            <th class="p-3.5">Description</th>
                            <th class="p-3.5">Method</th>
                            <th class="p-3.5 text-right">Amount</th>
                            <th class="p-3.5 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="warehouseTableBody" class="divide-y divide-surface-100 text-surface-700">
                        <tr><td colspan="6" class="p-6 text-center text-surface-400">Loading warehouse records...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    ensureWarehouseModalExists();
    await refreshWarehouseData();
}
window.renderWarehouseTab = renderWarehouseTab;

// Refresh the table when the data changes
async function refreshWarehouseData() {
    await loadWarehouseRecords(); // keeps the full list in window.currentWarehouseRecords (the reports read it)
    applyWarehouseDateFilter();
}
window.refreshWarehouseData = refreshWarehouseData;

// Separate date filter of this page: changes only what is shown here, never the saved data or the reports
window.warehouseDateFilter = window.warehouseDateFilter || { from: '', to: '' };

function applyWarehouseDateFilter() {
    const fromEl = document.getElementById('warehouseDateFrom');
    const toEl = document.getElementById('warehouseDateTo');
    if (fromEl) window.warehouseDateFilter.from = fromEl.value || '';
    if (toEl) window.warehouseDateFilter.to = toEl.value || '';
    const f = window.warehouseDateFilter;

    const all = window.currentWarehouseRecords || [];
    const records = window.WathekDateRange ? all.filter((r) => window.WathekDateRange.inRange(r.date, f.from, f.to)) : all;

    // Summary cards (same cash rule as the reports: CashApp is not cash)
    let cash = 0;
    let other = 0;
    records.forEach((r) => {
        const amount = Number(r.amount) || 0;
        if (/cash(?!app)/.test(String(r.paymentType || '').toLowerCase())) cash += amount; else other += amount;
    });
    const money = (v) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };
    setText('sumWarehouseCountCell', String(records.length));
    setText('sumWarehouseCashCell', money(cash));
    setText('sumWarehouseOtherCell', money(other));
    setText('sumWarehouseGrandTotalCell', money(cash + other));
    setText('warehouseDateCount', (f.from || f.to) ? 'Showing ' + records.length + ' of ' + all.length + ' records' : all.length + ' records');

    const tbody = document.getElementById('warehouseTableBody');
    if (!tbody) return;

    if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-surface-400">No warehouse records found</td></tr>`;
        return;
    }

    tbody.innerHTML = records.map((item) => `
        <tr class="hover:bg-surface-50 transition">
            <td class="p-3.5 font-medium">${item.date || '-'}</td>
            <td class="p-3.5 font-semibold text-surface-800">${item.services || '-'}</td>
            <td class="p-3.5 text-surface-600">${item.details || '-'}</td>
            <td class="p-3.5"><span class="px-2 py-0.5 bg-surface-100 rounded text-[10px] font-bold">${item.paymentType || 'Cash'}</span></td>
            <td class="p-3.5 text-right font-bold text-accent-600">$${item.amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="p-3.5 text-center space-x-1">
                <button type="button" onclick="editWarehouseRecord(${item.id})" class="p-1.5 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-lg transition cursor-pointer" title="Edit">
                    <i class="fa-solid fa-pen-to-square text-xs"></i>
                </button>
                <button type="button" onclick="deleteWarehouseRecord(${item.id})" class="p-1.5 bg-danger-50 hover:bg-danger-100 text-danger-600 rounded-lg transition cursor-pointer" title="Delete">
                    <i class="fa-solid fa-trash text-xs"></i>
                </button>
            </td>
        </tr>
    `).join('');
}
window.applyWarehouseDateFilter = applyWarehouseDateFilter;

function clearWarehouseDateFilter() {
    window.warehouseDateFilter = { from: '', to: '' };
    const fromEl = document.getElementById('warehouseDateFrom');
    const toEl = document.getElementById('warehouseDateTo');
    if (fromEl) fromEl.value = '';
    if (toEl) toEl.value = '';
    applyWarehouseDateFilter();
}
window.clearWarehouseDateFilter = clearWarehouseDateFilter;

// Fill the edit form fields for the given record ID
function editWarehouseRecord(id) {
    const records = window.currentWarehouseRecords || [];
    const item = records.find(r => r.id === id);
    if (!item) return;

    openWarehouseModal(true);

    setTimeout(() => {
        const idField = document.getElementById('editWarehouseId');
        if (idField) idField.value = item.id;

        const titleEl = document.getElementById('warehouseModalTitle');
        if (titleEl) titleEl.innerText = 'Edit Warehouse Record';

        if (document.getElementById('warehouseDate')) document.getElementById('warehouseDate').value = formatWarehouseDateForInput(item.date);
        if (document.getElementById('warehouseService')) document.getElementById('warehouseService').value = item.services || '';
        if (document.getElementById('warehouseDetails')) document.getElementById('warehouseDetails').value = item.details || '';
        if (document.getElementById('warehousePaymentType')) document.getElementById('warehousePaymentType').value = item.paymentType || 'Cash';
        if (document.getElementById('warehouseAmount')) document.getElementById('warehouseAmount').value = item.amount || 0;
    }, 50);
}
window.editWarehouseRecord = editWarehouseRecord;

// Save or update the record in Supabase
async function handleWarehouseSubmit(event) {
    if (event) event.preventDefault();

    if (!window.supabaseClient) {
        alert("Supabase client is not initialized!");
        return;
    }

    const idField = document.getElementById('editWarehouseId');
    const editId = idField ? idField.value : '';

    const rawDate = document.getElementById('warehouseDate')?.value || '';
    const formattedDate = formatWarehouseDateToSlash(rawDate);

    const payload = {
        date: formattedDate,
        services: document.getElementById('warehouseService')?.value || '',
        details: document.getElementById('warehouseDetails')?.value || '',
        paymentType: document.getElementById('warehousePaymentType')?.value || 'Cash',
        amount: parseFloat(document.getElementById('warehouseAmount')?.value) || 0
    };

    let response;
    if (editId) {
        response = await window.supabaseClient
            .from('warehouse_expenses')
            .update(payload)
            .eq('id', editId);
    } else {
        response = await window.supabaseClient
            .from('warehouse_expenses')
            .insert([payload]);
    }

    if (response.error) {
        console.error('Error saving warehouse record to Supabase:', response.error);
        alert('Supabase Error: ' + response.error.message);
    } else {
        closeWarehouseModal();
        await refreshWarehouseData();
        if (typeof updateDashboardAnalytics === 'function') updateDashboardAnalytics();
    }
}
window.handleWarehouseSubmit = handleWarehouseSubmit;
