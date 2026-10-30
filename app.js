/**
 * MovePro - Ultimate Enterprise Final Application Core Logic (Synchronized with HTML & Charts)
 */

if (typeof window.currentUserRole === 'undefined') window.currentUserRole = 'Admin';
if (typeof window.currentLoggedInUser === 'undefined') window.currentLoggedInUser = null;
if (typeof window.revenueChartInstance === 'undefined') window.revenueChartInstance = null;
if (typeof window.paymentMixChartInstance === 'undefined') window.paymentMixChartInstance = null;

// ==========================================
// 1. DATA INITIALIZATION & STORAGE SYNC (Sorted Newest to Oldest)
// ==========================================
function formatJobDateForInput(dateStr) {
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

function formatJobDateToSlash(dateStr) {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-');
        return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year}`;
    }
    return dateStr;
}

function initMasterJobsData() {
    try {
        let stored = localStorage.getItem('movePro_masterJobs');
        if (!stored || JSON.parse(stored).length === 0) {
            if (typeof window.masterJobs !== 'undefined' && Array.isArray(window.masterJobs) && window.masterJobs.length > 0) {
                localStorage.setItem('movePro_masterJobs', JSON.stringify(window.masterJobs));
            }
        }
        window.masterJobs = JSON.parse(localStorage.getItem('movePro_masterJobs')) || window.masterJobs || [];
        
        // ترتيب السجلات تلقائياً من الأحدث للأقدم
        window.masterJobs.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
        });
    } catch (e) {
        console.error("Error initializing master jobs:", e);
        window.masterJobs = window.masterJobs || [];
    }
}
window.initMasterJobsData = initMasterJobsData;

function saveMasterJobsData(jobs) {
    try {
        jobs.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
        });
        window.masterJobs = jobs;
        localStorage.setItem('movePro_masterJobs', JSON.stringify(jobs));
    } catch (e) {
        console.error("Error saving master jobs:", e);
    }
}
window.saveMasterJobsData = saveMasterJobsData;

function populateYearFilter() {
    const yearSelect = document.getElementById('filterYear');
    if (!yearSelect) return;

    initMasterJobsData();
    const uniqueYears = [...new Set(window.masterJobs.map(item => item.year))].filter(y => y).sort((a, b) => b - a);
    const currentSelected = yearSelect.value;

    let optionsHTML = `<option value="ALL">All Years</option>`;
    uniqueYears.forEach(year => {
        optionsHTML += `<option value="${year}" ${year == currentSelected ? 'selected' : ''}>${year}</option>`;
    });

    yearSelect.innerHTML = optionsHTML;
}
window.populateYearFilter = populateYearFilter;

// ==========================================
// 2. CRUD TABLE & FILTERING
// ==========================================
function filterJobsTable() {
    initMasterJobsData();

    const monthEl = document.getElementById('filterMonth');
    const yearEl = document.getElementById('filterYear');
    
    const monthVal = monthEl ? monthEl.value : 'ALL';
    const yearVal = yearEl ? yearEl.value : 'ALL';

    let filtered = window.masterJobs;

    if (monthVal && monthVal !== 'ALL' && monthVal !== 'All Months') {
        filtered = filtered.filter(job => job.month && job.month.toString() === monthVal);
    }
    
    if (yearVal && yearVal !== 'ALL' && yearVal !== 'All Years') {
        filtered = filtered.filter(job => job.year && job.year.toString() === yearVal);
    }

    const countText = document.getElementById('filteredCountText');
    if (countText) {
        countText.innerText = `Showing ${filtered.length} of ${window.masterJobs.length} records`;
    }
    
    renderJobsCRUD(filtered);
}
window.filterJobsTable = filterJobsTable;

function renderUsers() {
    const container = document.getElementById('usersListContainer');
    if (!container) return;
    if (typeof systemUsers === 'undefined') return;
    container.innerHTML = systemUsers.map(u => `
        <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl border text-xs">
            <div>
                <p class="font-bold text-slate-900 text-sm">${u.name}</p>
                <p class="text-slate-500">${u.email}</p>
            </div>
            <div class="flex items-center space-x-3">
                <select class="p-2 border rounded-lg font-semibold bg-white" disabled>
                    <option value="Admin" ${u.role === 'Admin' ? 'selected' : ''}>Admin</option>
                    <option value="Member" ${u.role === 'Member' ? 'selected' : ''}>Member</option>
                    <option value="Viewer" ${u.role === 'Viewer' ? 'selected' : ''}>Viewer</option>
                </select>
            </div>
        </div>
    `).join('');
}
window.renderUsers = renderUsers;

function checkPermissions() {
    const addBtn = document.getElementById('addJobBtn');
    if (window.currentUserRole === 'Viewer') {
        if (addBtn) addBtn.style.display = 'none';
    } else {
        if (addBtn) addBtn.style.display = 'flex';
    }
}
window.checkPermissions = checkPermissions;

// ==========================================
// 3. PAYMENT ROWS MANAGEMENT
// ==========================================
function addPaymentRow(containerId, amount = '', method = 'Cash') {
    let container = document.getElementById(containerId);
    if (!container && containerId === 'destContextContainer') {
        container = document.getElementById('destContainer');
    }
    if (!container && containerId === 'destContainer') {
        container = document.getElementById('destContextContainer');
    }
    
    if (!container) {
        console.error("Payment container not found:", containerId);
        return;
    }

    const rowId = 'payment_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const rowDiv = document.createElement('div');
    rowDiv.className = 'flex items-center gap-2 payment-row mt-2';
    rowDiv.id = rowId;

    rowDiv.innerHTML = `
        <input type="text" placeholder="Amount (e.g. 500)" value="${amount}" class="flex-1 p-2.5 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 payment-amount">
        <select class="w-32 p-2.5 border rounded-xl text-xs font-semibold bg-white focus:outline-none focus:border-emerald-500 payment-method">
            <option value="Cash" ${method.toLowerCase() === 'cash' ? 'selected' : ''}>Cash</option>
            <option value="Zelle" ${method.toLowerCase() === 'zelle' ? 'selected' : ''}>Zelle</option>
            <option value="Cheque" ${['cheque', 'ck', 'check'].includes(method.toLowerCase()) ? 'selected' : ''}>Cheque</option>
            <option value="PMO" ${method.toUpperCase() === 'PMO' ? 'selected' : ''}>PMO</option>
            <option value="BC" ${method.toUpperCase() === 'BC' ? 'selected' : ''}>BC</option>
            <option value="PC" ${method.toUpperCase() === 'PC' ? 'selected' : ''}>PC</option>
            <option value="CC" ${method.toUpperCase() === 'CC' ? 'selected' : ''}>CC</option>
            <option value="WT" ${method.toUpperCase() === 'WT' ? 'selected' : ''}>WT</option>
            <option value="Others" ${method.toLowerCase() === 'others' ? 'selected' : ''}>Others</option>
        </select>
        <button type="button" onclick="removePaymentRow('${rowId}')" class="text-red-500 hover:text-red-700 text-sm font-bold px-1 cursor-pointer delete-payment-btn" title="Remove">
            <i class="fa-solid fa-xmark pointer-events-none"></i>
        </button>
    `;
    container.appendChild(rowDiv);
}
window.addPaymentRow = addPaymentRow;

function removePaymentRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
}
window.removePaymentRow = removePaymentRow;

function extractPaymentsFromContainer(containerId) {
    let container = document.getElementById(containerId);
    if (!container && containerId === 'destContextContainer') container = document.getElementById('destContainer');
    if (!container && containerId === 'destContainer') container = document.getElementById('destContextContainer');

    if (!container) return '-';

    const rows = container.querySelectorAll('.payment-row');
    const paymentsList = [];

    rows.forEach(row => {
        const amt = row.querySelector('.payment-amount')?.value.trim() || '';
        const mth = row.querySelector('.payment-method')?.value || 'Cash';
        if (amt !== '') {
            paymentsList.push(`${amt} ${mth}`);
        }
    });

    return paymentsList.length > 0 ? paymentsList.join(', ') : '-';
}

// ==========================================
// 4. HELPERS & DRIVERS STRICT MAPPERS
// ==========================================
function parseHelpersDisplay(val) {
    if (!val || val === '-' || val === '0' || val === 0) return '-';
    let strVal = String(val).trim();
    
    const helpersMap = {
        100: "1/2 (100)",
        200: "1 (200)",
        250: "1-1 1/2 (250)",
        400: "2 (400)",
        500: "2-1 1/2 (500)",
        600: "3 (600)",
        750: "3-1 1/2 (750)",
        800: "4 (800)",
        1000: "4-1 1/2 (1000)"
    };

    let num = 0;
    let match = strVal.match(/\(([\d.]+)\)/);
    if (match) {
        num = parseFloat(match[1]);
    } else {
        num = parseFloat(strVal.replace(/[^0-9.]/g, ''));
    }

    if (isNaN(num) || num === 0) return strVal.includes('(') ? strVal : '-';

    return helpersMap[num] || strVal;
}

function parseDriversDisplay(val) {
    if (!val || val === '-' || val === '0' || val === 0) return '-';
    let strVal = String(val).trim();
    if (strVal.includes('(')) return strVal;
    
    let num = parseFloat(strVal.replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num === 0) return strVal;

    const driversMap = {
        112.5: "1/2 (112.5)",
        225: "1 (225)",
        250: "1-1 1/2 (250)",
        337: "1-1 1/2 (337)",
        400: "2 (400)",
        450: "2 (450)",
        500: "2-1 1/2 (500)",
        675: "2-1 1/2 (675)"
    };

    return driversMap[num] || strVal;
}

window.parseHelpersDisplay = parseHelpersDisplay;
window.parseDriversDisplay = parseDriversDisplay;

// ==========================================
// 5. RENDERING CRUD TABLE
// ==========================================
function renderJobsCRUD(dataToRender) {
    const tbody = document.getElementById('jobsTableBody');
    if (!tbody) {
        console.error("Target element 'jobsTableBody' not found in DOM!");
        return;
    }
    
    const records = dataToRender || window.masterJobs || [];

    if (!records || records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="text-center p-6 text-slate-400 text-xs">No dispatch records found</td></tr>`;
        return;
    }
    
    tbody.innerHTML = records.map((item) => {
        const foremanDisplay = (!item.foreman || item.foreman.trim() === '') 
            ? `<span class="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px]">-</span>` 
            : `<span class="bg-amber-50 text-amber-800 px-2.5 py-1 rounded font-bold text-xs">${item.foreman}</span>`;
        
        let actions = `<span class="text-xs text-slate-400">-</span>`;
        if (window.currentUserRole === 'Admin') {
            actions = `
                <div class="flex items-center space-x-1 justify-center">
                    <button type="button" onclick="editJob('${item.jobNo}')" class="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer" title="Edit Dispatch"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button type="button" onclick="deleteJob('${item.jobNo}')" class="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;
        }

        const dieselVal = (item.diesel && item.diesel !== '-') ? item.diesel : '-';
        const hotelVal = (item.hotel && item.hotel !== '-') ? item.hotel : '-';
        const helpersVal = parseHelpersDisplay(item.helpers);
        const driversVal = parseDriversDisplay(item.drivers); 
        const puVal = (item.pu && item.pu !== '-') ? item.pu : '-';
        
        const rawDest = item.destination || item.dest;
        const destVal = (rawDest && rawDest !== '-') ? rawDest : '-';
        
        const totalVal = (item.total && item.total !== '-') ? item.total : '-';

        let totalNum = parseFloat(String(totalVal).replace(/[^0-9.]/g, '')) || 0;
        let foreman10Val = item.foreman10pct ? ('$' + item.foreman10pct) : (totalNum > 0 ? '$' + (totalNum * 0.1).toFixed(2) : '-');

        return `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
                <td class="p-3 text-slate-700 font-medium">${item.date || '-'}</td>
                <td class="p-3 text-slate-900 font-bold">${item.jobNo || '-'}</td>
                <td class="p-3 text-slate-700">${item.route || '-'}</td>
                <td class="p-3">${foremanDisplay}</td>
                <td class="p-3 text-emerald-800 font-bold">${foreman10Val}</td>
                <td class="p-3 text-purple-700 font-semibold">${helpersVal}</td>
                <td class="p-3 text-blue-700 font-semibold">${driversVal}</td> 
                <td class="p-3 text-emerald-600 font-bold">${totalVal}</td>
                <td class="p-3 text-slate-700">${puVal}</td>
                <td class="p-3 text-slate-700">${destVal}</td>
                <td class="p-3 text-emerald-700 font-semibold">${dieselVal}</td>
                <td class="p-3 text-indigo-700 font-semibold">${hotelVal}</td>
                <td class="p-3 text-center">${actions}</td>
            </tr>
        `;
    }).join('');
}
window.renderJobsCRUD = renderJobsCRUD;

// ==========================================
// 6. MODAL & JOB ACTIONS
// ==========================================
function openAddModal(isEdit = false, recordData = null, index = -1) {
    const modal = document.getElementById('jobModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '99999', 'important');
    }

    const jobForm = document.getElementById('jobForm');
    const modalTitle = document.getElementById('modalTitle');
    const editIndex = document.getElementById('editIndex');

    if (!isEdit) {
        if (jobForm) jobForm.reset();
        if (editIndex) editIndex.value = '-1';
        if (modalTitle) modalTitle.innerText = 'Add New Job Dispatch';

        const puContainer = document.getElementById('puContainer');
        const destContainer = document.getElementById('destContainer') || document.getElementById('destContextContainer');
        if (puContainer) puContainer.innerHTML = '';
        if (destContainer) destContainer.innerHTML = '';
    }
}
window.openAddModal = openAddModal;

function closeModal() {
    const modal = document.getElementById('jobModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.setProperty('display', 'none', 'important');
    }
}
window.closeModal = closeModal;

function saveJob(event) {
    if (event) event.preventDefault();

    const jobNoInput = document.getElementById('jobNo');
    if (!jobNoInput || !jobNoInput.value.trim()) {
        alert('Please enter the Job Number.');
        if (jobNoInput) jobNoInput.focus();
        return;
    }

    initMasterJobsData();
    const jobNoVal = jobNoInput.value.trim();

    const editIndexInput = document.getElementById('editIndex');
    const editIndex = editIndexInput ? parseInt(editIndexInput.value, 10) : -1;
    const isEditing = !isNaN(editIndex) && editIndex >= 0 && editIndex < window.masterJobs.length;

    const dateInput = document.getElementById('jobDate');
    const dateRaw = dateInput ? dateInput.value : '';
    let dateVal = dateRaw;
    let monthVal = new Date().getMonth() + 1;
    let yearVal = new Date().getFullYear();

    if (dateRaw) {
        dateVal = formatJobDateToSlash(dateRaw);
        const parts = dateVal.split('/');
        if (parts.length === 3) {
            monthVal = parseInt(parts[0]) || monthVal;
            yearVal = parseInt(parts[2]) || yearVal;
        }
    }

    let totalRaw = document.getElementById('jobTotal') ? document.getElementById('jobTotal').value.trim() : '-';
    let totalFormatted = totalRaw && totalRaw !== '-' && !totalRaw.startsWith('$') ? '$' + totalRaw : totalRaw;

    let totalNum = parseFloat(String(totalFormatted).replace(/[^0-9.]/g, '')) || 0;
    let foreman10Val = totalNum > 0 ? (totalNum * 0.1).toFixed(0) : '0';

    const fromVal = document.getElementById('routeFrom') ? document.getElementById('routeFrom').value.trim().toUpperCase() : '';
    const toVal = document.getElementById('routeTo') ? document.getElementById('routeTo').value.trim().toUpperCase() : '';
    const routeVal = (fromVal || toVal) ? `${fromVal} → ${toVal}` : '-';

    const puFormatted = extractPaymentsFromContainer('puContainer');
    const destFormatted = extractPaymentsFromContainer('destContainer');

    const dieselRaw = document.getElementById('dieselAmount') ? document.getElementById('dieselAmount').value.trim() : '';
    const dieselMethod = document.getElementById('dieselMethod') ? document.getElementById('dieselMethod').value : 'Cash';
    const dieselFormatted = dieselRaw ? `${dieselRaw} ${dieselMethod}` : '-';

    const hotelRaw = document.getElementById('hotelAmount') ? document.getElementById('hotelAmount').value.trim() : '';
    const hotelMethod = document.getElementById('hotelMethod') ? document.getElementById('hotelMethod').value : 'Cash';
    const hotelFormatted = hotelRaw ? `${hotelRaw} ${hotelMethod}` : '-';

    const helpersSelect = document.getElementById('helpersCost');
    const helpersFormatted = helpersSelect && helpersSelect.selectedIndex > 0 ? helpersSelect.options[helpersSelect.selectedIndex].text : '-';

    const driversSelect = document.getElementById('driversCost');
    const driversFormatted = driversSelect && driversSelect.selectedIndex > 0 ? driversSelect.options[driversSelect.selectedIndex].text : '-';

    const jobData = {
        date: dateVal,
        month: monthVal,
        year: yearVal,
        jobNo: jobNoVal,
        route: routeVal,
        foreman: document.getElementById('jobForeman') ? document.getElementById('jobForeman').value.trim() : '',
        foreman10pct: foreman10Val,
        total: totalFormatted,
        helpers: helpersFormatted,        
        drivers: driversFormatted,        
        pu: puFormatted,
        dest: destFormatted,
        diesel: dieselFormatted,
        hotel: hotelFormatted,
        storage: '-'
    };

    if (isEditing) {
        window.masterJobs[editIndex] = jobData;
    } else {
        const targetIndex = window.masterJobs.findIndex(j => j.jobNo === jobNoVal);
        if (targetIndex !== -1) {
            window.masterJobs[targetIndex] = jobData;
        } else {
            window.masterJobs.unshift(jobData);
        }
    }

    saveMasterJobsData(window.masterJobs);
    closeModal();
    populateYearFilter();
    filterJobsTable();
    updateDashboardAnalytics();
}
window.saveJob = saveJob;

function parseAndSumDiesel(val) {
    if (!val || val === '-' || val === '0' || val === 0) return 0;
    if (typeof val === 'number') return val;

    let strVal = String(val).trim();
    if (strVal.includes('+')) {
        let parts = strVal.split('+');
        let sum = 0;
        parts.forEach(part => {
            let cleanNum = parseFloat(part.replace(/[^0-9.]/g, '')) || 0;
            sum += cleanNum;
        });
        return sum;
    }

    return parseFloat(strVal.replace(/[^0-9.]/g, '')) || 0;
}
window.parseAndSumDiesel = parseAndSumDiesel;

function editJob(jobNoParam) {
    initMasterJobsData();
    const index = window.masterJobs.findIndex(j => j.jobNo === jobNoParam);

    if (index === -1 || !window.masterJobs[index]) {
        alert("Could not find the record for editing.");
        return;
    }

    const j = window.masterJobs[index];
    openAddModal(true, j, index); 

    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.innerText = 'Edit Dispatch Record';
    
    const editIndex = document.getElementById('editIndex');
    if (editIndex) editIndex.value = index;

    setTimeout(() => {
        if (document.getElementById('jobDate')) document.getElementById('jobDate').value = formatJobDateForInput(j.date);
        if (document.getElementById('jobNo')) document.getElementById('jobNo').value = j.jobNo || '';
        if (document.getElementById('jobForeman')) document.getElementById('jobForeman').value = j.foreman || '';
        if (document.getElementById('jobTotal')) document.getElementById('jobTotal').value = j.total ? String(j.total).replace('$', '').trim() : '';

        if (j.route && j.route.includes('→')) {
            const rParts = j.route.split('→');
            if (document.getElementById('routeFrom')) document.getElementById('routeFrom').value = rParts[0].trim();
            if (document.getElementById('routeTo')) document.getElementById('routeTo').value = rParts[1].trim();
        } else if (j.route) {
            if (document.getElementById('routeFrom')) document.getElementById('routeFrom').value = j.route.trim();
        }

        const helpersSelect = document.getElementById('helpersCost');
        if (helpersSelect && j.helpers && j.helpers !== '-') {
            const numHelpers = parseFloat(String(j.helpers).replace(/[^0-9.]/g, ''));
            let matched = false;
            for (let option of helpersSelect.options) {
                if (numHelpers > 0 && option.text.includes(`(${numHelpers})`)) {
                    option.selected = true;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                for (let option of helpersSelect.options) {
                    if (option.text.trim() === String(j.helpers).trim()) {
                        option.selected = true;
                        break;
                    }
                }
            }
        }

        const driversSelect = document.getElementById('driversCost');
        if (driversSelect && j.drivers && j.drivers !== '-') {
            const numDrivers = parseFloat(String(j.drivers).replace(/[^0-9.]/g, ''));
            let matched = false;
            for (let option of driversSelect.options) {
                if (numDrivers > 0 && option.text.includes(`(${numDrivers})`)) {
                    option.selected = true;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                for (let option of driversSelect.options) {
                    if (option.text.trim() === String(j.drivers).trim()) {
                        option.selected = true;
                        break;
                    }
                }
            }
        }

        if (j.diesel && j.diesel !== '-') {
            const dParts = j.diesel.split(' ');
            if (document.getElementById('dieselAmount')) document.getElementById('dieselAmount').value = dParts[0] || '';
            if (document.getElementById('dieselMethod') && dParts[1]) document.getElementById('dieselMethod').value = dParts[1];
        }

        if (j.hotel && j.hotel !== '-') {
            const hParts = j.hotel.split(' ');
            if (document.getElementById('hotelAmount')) document.getElementById('hotelAmount').value = hParts[0] || '';
            if (document.getElementById('hotelMethod') && hParts[1]) document.getElementById('hotelMethod').value = hParts[1];
        }

        const puContainer = document.getElementById('puContainer');
        if (puContainer) {
            puContainer.innerHTML = '';
            if (j.pu && j.pu !== '-') {
                j.pu.split(',').forEach(pItem => {
                    const parts = pItem.trim().split(' ');
                    if (parts.length >= 1) {
                        const amt = parts[0] || '';
                        const mth = parts[1] || 'Cash';
                        addPaymentRow('puContainer', amt, mth);
                    }
                });
            }
        }

        let destContainer = document.getElementById('destContainer') || document.getElementById('destContextContainer');
        if (destContainer) {
            destContainer.innerHTML = '';
            const destVal = j.dest || j.destination;
            if (destVal && destVal !== '-') {
                destVal.split(',').forEach(dItem => {
                    const parts = dItem.trim().split(' ');
                    if (parts.length >= 1) {
                        const amt = parts[0] || '';
                        const mth = parts[1] || 'Cash';
                        addPaymentRow(destContainer.id, amt, mth);
                    }
                });
            }
        }

    }, 50);
}
window.editJob = editJob;

function deleteJob(jobNo) {
    if (!confirm('Are you sure you want to delete this dispatch record?')) return;

    initMasterJobsData();
    const jobIndex = window.masterJobs.findIndex(j => j.jobNo === jobNo);

    if (jobIndex !== -1) {
        const deletedJob = window.masterJobs.splice(jobIndex, 1)[0];
        window.masterTrash = JSON.parse(localStorage.getItem('movepro_trash_bin')) || [];
        window.masterTrash.push(deletedJob);

        saveMasterJobsData(window.masterJobs);
        localStorage.setItem('movepro_trash_bin', JSON.stringify(window.masterTrash));

        filterJobsTable();
        updateDashboardAnalytics();
    }
}
window.deleteJob = deleteJob;

// ==========================================
// 7. DASHBOARD ANALYTICS & CHARTS
// ==========================================
function updateDashboardAnalytics() {
    try {
        initMasterJobsData();
        if (!window.masterJobs || window.masterJobs.length === 0) return;

        let totalRev = 0;
        let totalDieselCost = 0;
        let validJobsCount = 0; 
        const routeRevenueMap = {};
        const paymentMethodMap = { Cash: 0, Zelle: 0, Cheque: 0, PMO: 0, BC: 0, PC: 0, CC: 0, WT: 0, Others: 0 };
        const monthlyRev = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        window.masterJobs.forEach(job => {
            if (job.jobNo && (job.jobNo.toLowerCase().includes('cancel') || job.jobNo.toLowerCase().includes('none'))) {
                return; 
            }

            validJobsCount++; 

            totalDieselCost += parseAndSumDiesel(job.diesel);

            let amt = 0;
            if (job.total) {
                amt = parseFloat(String(job.total).replace(/[^0-9.]/g, '')) || 0;
            }
            totalRev += amt;

            if (job.month && job.month >= 1 && job.month <= 12) {
                monthlyRev[job.month - 1] += amt;
            }
            if (job.route) {
                routeRevenueMap[job.route] = (routeRevenueMap[job.route] || 0) + amt;
            }

            [job.pu, job.dest].forEach(payStr => {
                if (payStr && payStr !== '-') {
                    if (payStr.toUpperCase().includes('CASH')) paymentMethodMap.Cash += 1;
                    if (payStr.toUpperCase().includes('ZELLE')) paymentMethodMap.Zelle += 1;
                    if (payStr.toUpperCase().includes('CHEQUE') || payStr.toUpperCase().includes('CK')) paymentMethodMap.Cheque += 1;
                    if (payStr.toUpperCase().includes('PMO')) paymentMethodMap.PMO += 1;
                    if (payStr.toUpperCase().includes('BC')) paymentMethodMap.BC += 1;
                    if (payStr.toUpperCase().includes('PC')) paymentMethodMap.PC += 1;
                    if (payStr.toUpperCase().includes('CC')) paymentMethodMap.CC += 1;
                    if (payStr.toUpperCase().includes('WT')) paymentMethodMap.WT += 1;
                }
            });
        });

        const avgJobVal = validJobsCount > 0 ? (totalRev / validJobsCount) : 0;

        const revEl = document.getElementById('dashTotalRevenue');
        if (revEl) revEl.innerText = '$' + totalRev.toLocaleString('en-US');

        const jobsTextEl = document.getElementById('dashCompletedJobsText');
        if (jobsTextEl) jobsTextEl.innerHTML = `<i class="fa-solid fa-truck-check mr-1"></i>${validJobsCount} Active Dispatches`;

        const avgEl = document.getElementById('dashAvgJobValue');
        if (avgEl) avgEl.innerText = '$' + Math.round(avgJobVal).toLocaleString('en-US');

        const dieselEl = document.getElementById('dashTotalDiesel');
        if (dieselEl) dieselEl.innerText = '$' + totalDieselCost.toLocaleString('en-US');

        const topCorridorsContainer = document.getElementById('topCorridorsContainer');
        if (topCorridorsContainer) {
            const sortedRoutes = Object.entries(routeRevenueMap).sort((a, b) => b[1] - a[1]).slice(0, 4);
            topCorridorsContainer.innerHTML = sortedRoutes.map(([route, rev], idx) => `
                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border">
                    <div class="flex items-center space-x-2">
                        <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center">${idx + 1}</span>
                        <span class="font-bold text-emerald-800">${route}</span>
                    </div>
                    <span class="font-extrabold text-slate-900">$${rev.toLocaleString('en-US')}</span>
                </div>
            `).join('');
        }

        renderDashboardCharts(monthlyRev, paymentMethodMap);
    } catch (e) {
        console.error("Error updating dashboard analytics:", e);
    }
}
window.updateDashboardAnalytics = updateDashboardAnalytics;

function renderDashboardCharts(monthlyData, paymentData) {
    try {
        const ctxRevenue = document.getElementById('revenueChart');
        if (ctxRevenue && typeof Chart !== 'undefined') {
            if (window.revenueChartInstance) window.revenueChartInstance.destroy();
            window.revenueChartInstance = new Chart(ctxRevenue, {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                        label: 'Monthly Revenue ($)',
                        data: monthlyData,
                        backgroundColor: 'rgba(5, 150, 105, 0.85)',
                        borderRadius: 8,
                        hoverBackgroundColor: '#047857'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
                        x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                    }
                }
            });
        }

        const ctxPayment = document.getElementById('paymentMixChart');
        if (ctxPayment && typeof Chart !== 'undefined') {
            if (window.paymentMixChartInstance) window.paymentMixChartInstance.destroy();
            const paymentColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#6366f1', '#84cc16', '#64748b'];

            window.paymentMixChartInstance = new Chart(ctxPayment, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(paymentData),
                    datasets: [{
                        data: Object.values(paymentData),
                        backgroundColor: paymentColors,
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } },
                    cutout: '65%'
                }
            });
        }
    } catch (e) {
        console.error("Error rendering charts:", e);
    }
}
window.renderDashboardCharts = renderDashboardCharts;

// ==========================================
// 8. NAVIGATION & TABS
// ==========================================
function switchTab(tabName) {
    try {
        const tabs = ['dashboard', 'jobs', 'users', 'reports', 'trash', 'rentals', 'warehouse', 'pdf-report', 'recycle-bin'];
        
        // إخفاء جميع التبويبات وإعادة تعيين الأزرار الجانبية
        tabs.forEach(t => {
            const tabEl = document.getElementById(`tab-${t}`) || document.getElementById(`${t}-view`);
            const navEl = document.getElementById(`nav-${t}`) || document.getElementById(`nav-${t}-btn`);
            
            if (tabEl) {
                tabEl.classList.add('hidden');
                tabEl.classList.remove('flex', 'block');
                tabEl.style.setProperty('display', 'none', 'important');
            }
            if (navEl) {
                navEl.className = 'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer';
            }
        });

        // إظهار التبويب المطلوب وتنشيط الزر الخاص به
        const activeTab = document.getElementById(`tab-${tabName}`) || document.getElementById(`${tabName}-view`);
        const activeNav = document.getElementById(`nav-${tabName}`) || document.getElementById(`nav-${tabName}-btn`);
        
        if (activeTab) {
            activeTab.classList.remove('hidden');
            activeTab.classList.add('flex');
            activeTab.style.setProperty('display', 'flex', 'important');
        }
        if (activeNav) {
            activeNav.className = 'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl bg-emerald-600 text-white font-medium shadow-md transition cursor-pointer';
        }

        // تنفيذ دوال التحديث التلقائي حسب التبويب النشط
        if (tabName === 'dashboard') {
            setTimeout(updateDashboardAnalytics, 50);
        } else if (tabName === 'jobs') {
            filterJobsTable();
        } else if (tabName === 'reports' && typeof renderReportsTab === 'function') {
            renderReportsTab();
        } else if (tabName === 'trash' && typeof renderTrashBin === 'function') {
            renderTrashBin();
        } else if (tabName === 'rentals' && typeof renderPrivateTruckRentalTab === 'function') {
            renderPrivateTruckRentalTab();
        } else if (tabName === 'warehouse' && typeof renderWarehouseTab === 'function') {
            renderWarehouseTab(); // 🌟 تحميل وعرض بيانات المستودع فوراً عند النقر
        } else if (tabName === 'users') {
            renderUsers();
        }
    } catch (e) {
        console.error("Error switching tab:", e);
    }
}
window.switchTab = switchTab;



// ==========================================
// 9. INITIALIZATION
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    try {
        initMasterJobsData();
        window.currentUserRole = 'Admin';
        
        checkPermissions();
        renderUsers();
        populateYearFilter();
        
        updateDashboardAnalytics();
        filterJobsTable();
        switchTab('dashboard');
    } catch (error) {
        console.error("Initialization error on DOMContentLoaded:", error);
    }
});
