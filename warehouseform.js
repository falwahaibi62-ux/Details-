/**
 * Warehouse & Others Module - MovePro (Supabase Cloud Integrated & Clean Version)
 */

if (typeof window.WAREHOUSE_STORAGE_KEY === 'undefined') {
    window.WAREHOUSE_STORAGE_KEY = 'movepro_warehouse_records';
}

// دالة تحويل التاريخ من صيغة الجدول (M/D/YYYY) إلى صيغة حقل الإدخال (YYYY-MM-DD)
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

// دالة تحويل التاريخ من حقل الإدخال (YYYY-MM-DD) إلى صيغة الجدول (M/D/YYYY)
function formatWarehouseDateToSlash(dateStr) {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-');
        return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year}`;
    }
    return dateStr;
}

// جلب البيانات المباشرة من Supabase
async function loadWarehouseRecords() {
    try {
        if (!window.supabaseClient) {
            console.error("Supabase client is not initialized!");
            return [];
        }

        const { data, error } = await window.supabaseClient
            .from('warehouse_expenses')
            .select('*')
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

        // ترتيب السجلات من الأحدث للأقدم
        formattedRecords.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        window.currentWarehouseRecords = formattedRecords;
        return formattedRecords;

    } catch (e) {
        console.error('Error loading warehouse records from Supabase:', e);
        return [];
    }
}
window.loadWarehouseRecords = loadWarehouseRecords;

// إنشاء النافذة المنبثقة برمجياً لضمان عدم اختفائها أو فشل فتحها
function ensureWarehouseModalExists() {
    let modal = document.getElementById('warehouseModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'warehouseModal';
        modal.className = 'fixed inset-0 bg-slate-950/60 backdrop-blur-xs hidden items-center justify-center z-50 p-4 overflow-y-auto';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 transform transition-all">
                <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 id="warehouseModalTitle" class="text-base font-bold text-slate-800 flex items-center gap-2">
                        <i class="fa-solid fa-warehouse text-amber-500"></i> Add Warehouse Expense
                    </h3>
                    <button type="button" onclick="closeWarehouseModal()" class="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <form id="warehouseForm" onsubmit="handleWarehouseSubmit(event)" class="p-6 space-y-4 text-xs">
                    <input type="hidden" id="editWarehouseId" value="">

                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Date <span class="text-red-500">*</span></label>
                        <input type="date" id="warehouseDate" required class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none transition text-slate-700">
                    </div>

                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Category / Service <span class="text-red-500">*</span></label>
                        <input type="text" id="warehouseService" required placeholder="e.g. Warehouse Labor" class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none transition text-slate-700">
                    </div>

                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Description / Details</label>
                        <input type="text" id="warehouseDetails" placeholder="Enter description" class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none transition text-slate-700">
                    </div>

                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Payment Method</label>
                        <select id="warehousePaymentType" class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none transition text-slate-700">
                            <option value="Cash">Cash</option>
                            <option value="Zelle">Zelle</option>
                            <option value="Cheque">Cheque</option>
                            <option value="PMO">PMO</option>
                            <option value="Others">Others</option>
                        </select>
                    </div>

                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Amount ($) <span class="text-red-500">*</span></label>
                        <input type="number" id="warehouseAmount" value="0" min="0" step="0.01" required class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none transition text-slate-700">
                    </div>

                    <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onclick="closeWarehouseModal()" class="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition border border-slate-200 cursor-pointer">Cancel</button>
                        <button type="submit" class="px-5 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition cursor-pointer">Save Record</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

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

// عرض الشاشة والجدول بالكامل
async function renderWarehouseTab() {
    const container = document.getElementById('tab-warehouse');
    if (!container) return;

    container.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs mb-6">
            <div>
                <h3 class="font-bold text-slate-900 text-base">Warehouse & Inventory Management</h3>
                <p class="text-xs text-slate-500 mt-0.5">Track equipment, gear, and supplies stock levels and expenses.</p>
            </div>
            <button type="button" onclick="openWarehouseModal(false)" class="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer">
                <i class="fa-solid fa-plus"></i> Add Expense / Record
            </button>
        </div>

        <div class="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                    <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                        <tr>
                            <th class="p-3.5">Date</th>
                            <th class="p-3.5">Category</th>
                            <th class="p-3.5">Description</th>
                            <th class="p-3.5">Method</th>
                            <th class="p-3.5 text-right">Amount</th>
                            <th class="p-3.5 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="warehouseTableBody" class="divide-y divide-slate-100 text-slate-700">
                        <tr><td colspan="6" class="p-6 text-center text-slate-400">Loading warehouse records...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    ensureWarehouseModalExists();
    await refreshWarehouseData();
}
window.renderWarehouseTab = renderWarehouseTab;

// تحديث الجدول عند تغير البيانات
async function refreshWarehouseData() {
    const records = await loadWarehouseRecords();
    const tbody = document.getElementById('warehouseTableBody');
    if (!tbody) return;

    if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400">No warehouse records found</td></tr>`;
        return;
    }

    tbody.innerHTML = records.map((item) => `
        <tr class="hover:bg-slate-50 transition">
            <td class="p-3.5 font-medium">${item.date || '-'}</td>
            <td class="p-3.5 font-semibold text-slate-800">${item.services || '-'}</td>
            <td class="p-3.5 text-slate-600">${item.details || '-'}</td>
            <td class="p-3.5"><span class="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold">${item.paymentType || 'Cash'}</span></td>
            <td class="p-3.5 text-right font-bold text-purple-600">$${item.amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="p-3.5 text-center space-x-1">
                <button type="button" onclick="editWarehouseRecord(${item.id})" class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer" title="Edit">
                    <i class="fa-solid fa-pen-to-square text-xs"></i>
                </button>
                <button type="button" onclick="deleteWarehouseRecord(${item.id})" class="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition cursor-pointer" title="Delete">
                    <i class="fa-solid fa-trash text-xs"></i>
                </button>
            </td>
        </tr>
    `).join('');
}



// تجهيز حقول التعديل بحسب المعرف
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

// حفظ أو تحديث السجل في Supabase
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
