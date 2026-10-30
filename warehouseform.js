/**
 * Warehouse & Others Module - MovePro (Fixed Modal, Edit, Delete & Sorting)
 */

if (typeof window.WAREHOUSE_STORAGE_KEY === 'undefined') {
    window.WAREHOUSE_STORAGE_KEY = 'movepro_warehouse_records';
}

if (typeof window.initialWarehouseRecords === 'undefined') {
    window.initialWarehouseRecords = []; // أو القيمة الأصلية للمتغير
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

function loadWarehouseRecords() {
    let saved = localStorage.getItem(window.WAREHOUSE_STORAGE_KEY);
    let records = [];
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) records = parsed;
        } catch (e) {
            console.error('Error parsing warehouse records:', e);
        }
    }

    // ترتيب السجلات تلقائياً من التاريخ الأحدث للأقدم
    records.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA;
    });

    return records;
}
window.loadWarehouseRecords = loadWarehouseRecords;

function saveWarehouseRecords(data) {
    localStorage.setItem(window.WAREHOUSE_STORAGE_KEY, JSON.stringify(data));
}

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
                    <input type="hidden" id="editWarehouseIndex" value="-1">

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
                        <label class="block font-semibold text-slate-700 mb-1">Amount <span class="text-red-500">*</span></label>
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
        const indexField = document.getElementById('editWarehouseIndex');
        if (indexField) indexField.value = '-1';
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

function renderWarehouseTab() {
    const container = document.getElementById('tab-warehouse');
    if (!container) return;

    const records = loadWarehouseRecords();

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
                        ${records.length === 0 ? `<tr><td colspan="6" class="p-6 text-center text-slate-400">No warehouse records found</td></tr>` : 
                          records.map((item, index) => `
                            <tr class="hover:bg-slate-50 transition">
                                <td class="p-3.5 font-medium">${item.date || '-'}</td>
                                <td class="p-3.5 font-semibold text-slate-800">${item.services || '-'}</td>
                                <td class="p-3.5 text-slate-600">${item.details || '-'}</td>
                                <td class="p-3.5"><span class="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold">${item.paymentType || 'Cash'}</span></td>
                                <td class="p-3.5 text-right font-bold text-purple-600">$${parseFloat(item.amount || 0).toLocaleString()}</td>
                                <td class="p-3.5 text-center space-x-1">
                                    <button type="button" onclick="editWarehouseRecord(${index})" class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer" title="Edit">
                                        <i class="fa-solid fa-pen-to-square text-xs"></i>
                                    </button>
                                    <button type="button" onclick="deleteWarehouseRecord(${index})" class="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition cursor-pointer" title="Delete">
                                        <i class="fa-solid fa-trash text-xs"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
window.renderWarehouseTab = renderWarehouseTab;

function deleteWarehouseRecord(index) {
    if (!confirm('Are you sure you want to delete this warehouse record?')) return;

    let records = loadWarehouseRecords();
    if (index < 0 || index >= records.length) return;

    const deletedItem = records.splice(index, 1)[0];
    saveWarehouseRecords(records);

    const TRASH_KEY = 'movepro_trash_bin';
    let trashBin = JSON.parse(localStorage.getItem(TRASH_KEY)) || [];
    trashBin.unshift({
        ...deletedItem,
        recordType: 'warehouse',
        deletedAt: new Date().toISOString()
    });
    localStorage.setItem(TRASH_KEY, JSON.stringify(trashBin));

    renderWarehouseTab();
    if (typeof updateDashboardAnalytics === 'function') updateDashboardAnalytics();
}
window.deleteWarehouseRecord = deleteWarehouseRecord;

function editWarehouseRecord(index) {
    let records = loadWarehouseRecords();
    const item = records[index];
    if (!item) return;

    openWarehouseModal(true);

    setTimeout(() => {
        const indexField = document.getElementById('editWarehouseIndex');
        if (indexField) indexField.value = index;

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

function handleWarehouseSubmit(event) {
    if (event) event.preventDefault();

    const indexField = document.getElementById('editWarehouseIndex');
    const index = indexField ? parseInt(indexField.value, 10) : -1;

    const rawDate = document.getElementById('warehouseDate')?.value || '';
    const formattedDate = formatWarehouseDateToSlash(rawDate);

    const newRecord = {
        date: formattedDate,
        services: document.getElementById('warehouseService')?.value || '',
        details: document.getElementById('warehouseDetails')?.value || '',
        paymentType: document.getElementById('warehousePaymentType')?.value || 'Cash',
        amount: parseFloat(document.getElementById('warehouseAmount')?.value) || 0
    };

    let records = loadWarehouseRecords();

    if (index >= 0 && index < records.length) {
        records[index] = newRecord;
    } else {
        records.unshift(newRecord);
    }

    saveWarehouseRecords(records);
    closeWarehouseModal();
    renderWarehouseTab();
    
    if (typeof updateDashboardAnalytics === 'function') {
        updateDashboardAnalytics();
    }
}
window.handleWarehouseSubmit = handleWarehouseSubmit;
