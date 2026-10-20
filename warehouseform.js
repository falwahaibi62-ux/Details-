/**
 * Warehouse and Others Module
 */

const WAREHOUSE_STORAGE_KEY = window.WAREHOUSE_STORAGE_KEY || 'movepro_warehouse_records';
window.WAREHOUSE_STORAGE_KEY = WAREHOUSE_STORAGE_KEY;
function loadWarehouseRecords() {
    const saved = localStorage.getItem(WAREHOUSE_STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Error parsing warehouse records:', e);
        }
    }
    
    const defaultData = [
        { date: "2026-06-04", services: "Flooring", amount: 2200, paymentType: "Cash", details: "Flooring installation and materials" },
        { date: "2026-06-05", services: "Palettes", amount: 2000, paymentType: "Cash", details: "Warehouse palettes purchase" },
        { date: "2026-09-05", services: "Rent", amount: 5500, paymentType: "Others", details: "Warehouse monthly rent" }
    ];
    localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(defaultData));
    return defaultData;
}

function saveWarehouseRecords(data) {
    localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(data));
}

let warehouseRecords = loadWarehouseRecords();

function generateWarehouseRowsHTML() {
    if (!warehouseRecords || warehouseRecords.length === 0) {
        return `
            <tr>
                <td colspan="6" class="p-12 text-center text-slate-400 text-xs">
                    <i class="fa-solid fa-boxes-stacked text-3xl mb-2 block text-slate-300"></i>
                    No warehouse records found. Click "Add Record" to create one.
                </td>
            </tr>
        `;
    }

    return warehouseRecords.map((item, index) => `
        <tr class="hover:bg-slate-50/80 transition">
            <td class="p-3.5 font-medium text-slate-800">${item.date || '-'}</td>
            <td class="p-3.5 font-semibold text-slate-800">${item.services || '-'}</td>
            <td class="p-3.5 font-bold text-emerald-600">$${parseFloat(item.amount || 0).toLocaleString()}</td>
            <td class="p-3.5"><span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 text-[10px] font-bold">${item.paymentType || '-'}</span></td>
            <td class="p-3.5 text-slate-600">${item.details || '-'}</td>
            <td class="p-3.5 text-center">
                <button onclick="deleteWarehouseRecord(${index})" class="p-1.5 text-slate-400 hover:text-red-600 transition" title="Delete Record">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderWarehouseTab() {
    warehouseRecords = loadWarehouseRecords();
    const container = document.getElementById('tab-warehouse');
    if (!container) return;

    container.innerHTML = `
        <div class="glass-panel p-5 rounded-2xl flex justify-between items-center bg-white shadow-sm">
            <div>
                <h3 class="font-bold text-slate-900 text-base">Warehouse and Others Management</h3>
                <p class="text-xs text-slate-500">Manage warehouse expenses, labor, rent, and operational materials</p>
            </div>
            <button onclick="openWarehouseModal()" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition flex items-center space-x-2">
                <i class="fa-solid fa-plus"></i>
                <span>Add Record</span>
            </button>
        </div>

        <div class="glass-panel rounded-2xl overflow-hidden bg-white shadow-sm">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs min-w-[1000px]">
                    <thead class="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                            <th class="p-3 text-left">Date</th>
                            <th class="p-3 text-left">Service / Item</th>
                            <th class="p-3 text-left">Amount</th>
                            <th class="p-3 text-left">Payment Type</th>
                            <th class="p-3 text-left">Details</th>
                            <th class="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="warehouseTableBody" class="divide-y text-slate-700 bg-white">
                        ${generateWarehouseRowsHTML()}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function deleteWarehouseRecord(index) {
    if (!confirm('Are you sure you want to delete this warehouse record?')) return;

    const deletedItem = warehouseRecords.splice(index, 1)[0];
    saveWarehouseRecords(warehouseRecords);

    const TRASH_KEY = 'movepro_trash_bin';
    let trashBin = JSON.parse(localStorage.getItem(TRASH_KEY)) || [];
    
    trashBin.unshift({
        ...deletedItem,
        recordType: 'warehouse',
        deletedAt: new Date().toISOString()
    });
    
    localStorage.setItem(TRASH_KEY, JSON.stringify(trashBin));
    renderWarehouseTab();
    if (typeof renderTrashBin === 'function') renderTrashBin();
}

function renderWarehouseModal() {
    let modalContainer = document.getElementById('warehouseModal');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'warehouseModal';
        modalContainer.className = 'fixed inset-0 bg-slate-950/60 backdrop-blur-xs hidden items-center justify-center z-50 p-4 overflow-y-auto';
        document.body.appendChild(modalContainer);
    }

    modalContainer.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 transform transition-all">
            <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
                    <i class="fa-solid fa-warehouse text-indigo-600"></i> Warehouse and others Form
                </h3>
                <button onclick="closeWarehouseModal()" class="text-slate-400 hover:text-slate-600 transition p-1">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <form id="warehouseForm" onsubmit="handleWarehouseSubmit(event)" class="p-6 space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Date <span class="text-red-500">*</span></label>
                    <input type="date" id="warehouseDate" required class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/25 transition text-slate-700">
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Services</label>
                    <input type="text" id="warehouseServices" placeholder="Enter service name" class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/25 transition text-slate-700">
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Amount <span class="text-red-500">*</span></label>
                    <div class="flex items-center">
                        <button type="button" onclick="adjustWarehouseNumber('warehouseAmount', -10)" class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-l-xl border border-r-0 border-slate-200 transition text-xs font-bold">-</button>
                        <input type="number" id="warehouseAmount" value="0" min="0" step="0.01" required class="w-full px-3 py-2.5 text-xs text-center bg-white border border-slate-200 focus:outline-none transition text-slate-700">
                        <button type="button" onclick="adjustWarehouseNumber('warehouseAmount', 10)" class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-r-xl border border-l-0 border-slate-200 transition text-xs font-bold">+</button>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Payment type</label>
                    <select id="warehousePaymentType" class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none transition text-slate-700">
                        <option value="" disabled selected>Select payment method</option>
                        <option value="Cash">Cash</option>
                        <option value="Zelle">Zelle</option>
                        <option value="Others">Others</option>
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Service Details</label>
                    <textarea id="warehouseDetails" rows="3" placeholder="Enter service details..." class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none transition text-slate-700"></textarea>
                </div>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" onclick="closeWarehouseModal()" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition border border-slate-200">Cancel</button>
                    <button type="submit" class="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition">Save</button>
                </div>
            </form>
        </div>
    `;
}

function openWarehouseModal() {
    renderWarehouseModal();
    const modal = document.getElementById('warehouseModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeWarehouseModal() {
    const modal = document.getElementById('warehouseModal');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
}

function adjustWarehouseNumber(elementId, step) {
    const input = document.getElementById(elementId);
    if (input) {
        let currentValue = parseFloat(input.value) || 0;
        let newValue = currentValue + step;
        if (newValue < 0) newValue = 0;
        input.value = newValue;
    }
}

function handleWarehouseSubmit(event) {
    event.preventDefault();

    const newRecord = {
        date: document.getElementById('warehouseDate').value,
        services: document.getElementById('warehouseServices').value,
        amount: document.getElementById('warehouseAmount').value,
        paymentType: document.getElementById('warehousePaymentType').value,
        details: document.getElementById('warehouseDetails').value
    };

    warehouseRecords.unshift(newRecord);
    saveWarehouseRecords(warehouseRecords);

    closeWarehouseModal();
    renderWarehouseTab();
}
