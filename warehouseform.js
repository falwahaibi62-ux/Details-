/**
 * Warehouse & Others Module - MovePro (Fixed Edit & Delete)
 */

if (typeof window.WAREHOUSE_STORAGE_KEY === 'undefined') {
    window.WAREHOUSE_STORAGE_KEY = 'movepro_warehouse_records';
}

function loadWarehouseRecords() {
    let saved = localStorage.getItem(window.WAREHOUSE_STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            console.error('Error parsing warehouse records:', e);
        }
    }
    return [];
}
window.loadWarehouseRecords = loadWarehouseRecords;

function saveWarehouseRecords(data) {
    localStorage.setItem(window.WAREHOUSE_STORAGE_KEY, JSON.stringify(data));
}

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
            <button type="button" onclick="openWarehouseModal()" class="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer">
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

    // إرسال السجل إلى سلة المهملات
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

    if (typeof openWarehouseModal === 'function') {
        openWarehouseModal();
    }

    // تعبئة حقول النموذج بالتعديل
    setTimeout(() => {
        const indexField = document.getElementById('editWarehouseIndex');
        if (indexField) indexField.value = index;

        const titleEl = document.getElementById('warehouseModalTitle');
        if (titleEl) titleEl.innerText = 'Edit Warehouse Record';

        if (document.getElementById('warehouseDate')) document.getElementById('warehouseDate').value = item.date || '';
        if (document.getElementById('warehouseService')) document.getElementById('warehouseService').value = item.services || '';
        if (document.getElementById('warehouseDetails')) document.getElementById('warehouseDetails').value = item.details || '';
        if (document.getElementById('warehousePaymentType')) document.getElementById('warehousePaymentType').value = item.paymentType || 'Cash';
        if (document.getElementById('warehouseAmount')) document.getElementById('warehouseAmount').value = item.amount || 0;
    }, 100);
}
window.editWarehouseRecord = editWarehouseRecord;
