let currentUserRole = 'Admin';
let currentLoggedInUser = null;
let revenueChartInstance = null;
let paymentMixChartInstance = null;

// ==========================================
// 1. DATA INITIALIZATION & STORAGE SYNC
// ==========================================
function initMasterJobsData() {
    let stored = localStorage.getItem('movePro_masterJobs');
    if (!stored || JSON.parse(stored).length === 0) {
        if (typeof window.masterJobs !== 'undefined' && Array.isArray(window.masterJobs) && window.masterJobs.length > 0) {
            localStorage.setItem('movePro_masterJobs', JSON.stringify(window.masterJobs));
        }
    }
    window.masterJobs = JSON.parse(localStorage.getItem('movePro_masterJobs')) || window.masterJobs || [];
}

function saveMasterJobsData(jobs) {
    window.masterJobs = jobs;
    localStorage.setItem('movePro_masterJobs', JSON.stringify(jobs));
}

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

// ==========================================
// 2. CRUD TABLE & FILTERING
// ==========================================
function filterJobsTable() {
    const jobsTab = document.getElementById('tab-jobs');
    // إذا لم يكن تبويب الـ jobs نشطاً، نكتفي بالخروج لتجنب أخطاء DOM
    if (!jobsTab) return;

    initMasterJobsData();

    const monthVal = document.getElementById('filterMonth')?.value || 'ALL';
    const yearVal = document.getElementById('filterYear')?.value || 'ALL';

    let filtered = window.masterJobs.filter(job => {
        const matchesMonth = (monthVal === 'ALL') || (job.month && job.month.toString() === monthVal);
        const matchesYear = (yearVal === 'ALL') || (job.year && job.year.toString() === yearVal);
        return matchesMonth && matchesYear;
    });

    const countText = document.getElementById('filteredCountText');
    if (countText) {
        countText.innerText = `Showing ${filtered.length} of ${window.masterJobs.length} records`;
    }
    
    renderJobsCRUD(filtered);
}
window.filterJobsTable = filterJobsTable;

function renderJobsCRUD(dataToRender) {
    const tbody = document.getElementById('crudTableBody');
    if (!tbody) return;
    
    const records = dataToRender || window.masterJobs || [];

    if (!records || records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="text-center p-6 text-slate-400 text-xs font-semibold">No dispatches found</td></tr>`;
        return;
    }
    
    tbody.innerHTML = records.map((item, index) => {
        const foremanDisplay = (!item.foreman || item.foreman.trim() === '') 
            ? `<span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">no name</span>` 
            : `<span class="bg-slate-100 text-slate-900 px-2.5 py-1 rounded font-bold">${item.foreman}</span>`;
        
        let actions = `<span class="text-xs text-slate-400">-</span>`;
        if (typeof currentUserRole !== 'undefined' && currentUserRole === 'Admin') {
            actions = `
                <button onclick="editJob(${index})" class="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg mr-1 cursor-pointer" title="Edit Dispatch"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteJob('${item.jobNo}')" class="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer" title="Move to Recycle Bin"><i class="fa-solid fa-trash-can"></i></button>
            `;
        }

        const dieselVal = (item.diesel && item.diesel !== '-') ? item.diesel : '-';
        const hotelVal = (item.hotel && item.hotel !== '-') ? item.hotel : '-';
        const helpersVal = (item.helpers && item.helpers !== '-') ? item.helpers : '-';
        const driversVal = (item.drivers && item.drivers !== '-') ? item.drivers : '-'; 

        return `
            <tr class="hover:bg-slate-50 transition border-b border-slate-150">
                <td class="p-3 text-slate-700 font-medium text-xs">${item.date || '-'}</td>
                <td class="p-3 text-slate-700 font-bold text-xs">${item.jobNo || '-'}</td>
                <td class="p-3 text-slate-600 text-xs">${item.route || '-'}</td>
                <td class="p-3 text-xs">${foremanDisplay}</td>
                <td class="p-3 text-purple-700 font-semibold text-xs">${helpersVal}</td>
                <td class="p-3 text-blue-700 font-semibold text-xs">${driversVal}</td> 
                <td class="p-3 text-emerald-600 font-bold text-xs">${item.total || '-'}</td>
                <td class="p-3 text-slate-600 text-xs">${item.pu || '-'}</td>
                <td class="p-3 text-slate-600 text-xs">${item.dest || '-'}</td>
                <td class="p-3 text-emerald-700 font-semibold text-xs">${dieselVal}</td>
                <td class="p-3 text-indigo-700 font-semibold text-xs">${hotelVal}</td>
                <td class="p-3 text-center">${actions}</td>
            </tr>
        `;
    }).join('');
}
window.renderJobsCRUD = renderJobsCRUD;

// ==========================================
// 3. PAYMENT ROWS MANAGEMENT (FIXED)
// ==========================================
function addPaymentRow(containerId, amount = '', method = 'Cash') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Container NOT found in DOM:", containerId);
        return;
    }

    const rowId = 'payment_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const rowDiv = document.createElement('div');
    rowDiv.className = 'flex items-center gap-2 payment-row mt-2';
    rowDiv.id = rowId;

    rowDiv.innerHTML = `
        <input type="text" placeholder="Amount (e.g. 500)" value="${amount}" class="flex-1 p-2.5 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 payment-amount">
        <select class="w-32 p-2.5 border rounded-xl text-xs font-semibold bg-white focus:outline-none focus:border-emerald-500 payment-method">
            <option value="Cash" ${method === 'Cash' ? 'selected' : ''}>Cash</option>
            <option value="Zelle" ${method === 'Zelle' ? 'selected' : ''}>Zelle</option>
            <option value="Cheque" ${method === 'Cheque' ? 'selected' : ''}>Cheque</option>
            <option value="PMO" ${method === 'PMO' ? 'selected' : ''}>PMO</option>
            <option value="BC" ${method === 'BC' ? 'selected' : ''}>BC</option>
            <option value="PC" ${method === 'PC' ? 'selected' : ''}>PC</option>
            <option value="CC" ${method === 'CC' ? 'selected' : ''}>CC</option>
            <option value="WT" ${method === 'WT' ? 'selected' : ''}>WT</option>
            <option value="Others" ${method === 'Others' ? 'selected' : ''}>Others</option>
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
    const container = document.getElementById(containerId);
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
// 4. MODAL & JOB ACTIONS (ADD / EDIT / DELETE)
// ==========================================
function openAddModal() {
    const modal = document.getElementById('jobModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '99999', 'important');
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
    }

    const jobForm = document.getElementById('jobForm');
    if (jobForm) jobForm.reset();

    const editIndex = document.getElementById('editIndex');
    if (editIndex) editIndex.value = '';

    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.innerText = 'Add New Job';

    // تنظيف حاويات المدفوعات عند الفتح لمنع أي تكرار سابق
    const puContainer = document.getElementById('puContainer');
    const destContainer = document.getElementById('destContainer');
    if (puContainer) puContainer.innerHTML = '';
    if (destContainer) destContainer.innerHTML = '';
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
        if (dateRaw.includes('-')) {
            const p = dateRaw.split('-');
            yearVal = parseInt(p[0]) || yearVal;
            monthVal = parseInt(p[1]) || monthVal;
            const dayVal = parseInt(p[2]) || 1;
            dateVal = `${monthVal}/${dayVal}/${yearVal}`;
        }
    }

    const formatCurrency = (val) => {
        if (!val || val === '-') return '-';
        if (String(val).startsWith('$')) return val;
        let num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
        return isNaN(num) ? val : '$' + num.toLocaleString('en-US');
    };

    let totalRaw = document.getElementById('jobTotal') ? document.getElementById('jobTotal').value.trim() : '';
    let totalFormatted = formatCurrency(totalRaw);

    const fromVal = document.getElementById('routeFrom') ? document.getElementById('routeFrom').value.trim().toUpperCase() : '';
    const toVal = document.getElementById('routeTo') ? document.getElementById('routeTo').value.trim().toUpperCase() : '';
    const routeVal = (fromVal || toVal) ? `${fromVal} → ${toVal}` : '-';

    const puFormatted = extractPaymentsFromContainer('puContainer');
    const destFormatted = extractPaymentsFromContainer('destContainer');

    let dieselRaw = document.getElementById('dieselAmount') ? document.getElementById('dieselAmount').value.trim() : '';
    const dieselMethod = document.getElementById('dieselMethod') ? document.getElementById('dieselMethod').value : '';
    const dieselFormatted = dieselRaw ? `${dieselRaw} ${dieselMethod}`.trim() : '-';

    let hotelRaw = document.getElementById('hotelAmount') ? document.getElementById('hotelAmount').value.trim() : '';
    const hotelMethod = document.getElementById('hotelMethod') ? document.getElementById('hotelMethod').value : '';
    const hotelFormatted = hotelRaw ? `${hotelRaw} ${hotelMethod}`.trim() : '-';

    const jobData = {
        date: dateVal,
        month: monthVal,
        year: yearVal,
        jobNo: jobNoVal,
        route: routeVal,
        foreman: document.getElementById('jobForeman') ? document.getElementById('jobForeman').value.trim() : '',
        helpers: document.getElementById('helpersCost')?.value || '0',
        drivers: document.getElementById('driversCost')?.value || '-',
        total: totalFormatted,
        pu: puFormatted,
        dest: destFormatted,
        diesel: dieselFormatted,
        hotel: hotelFormatted
    };

    if (isEditing) {
        window.masterJobs[editIndex] = jobData;
    } else {
        window.masterJobs.unshift(jobData);
    }

    saveMasterJobsData(window.masterJobs);
    closeModal();
    populateYearFilter();
    filterJobsTable();
    if (typeof updateDashboardAnalytics === 'function') updateDashboardAnalytics();
}
window.saveJob = saveJob;

function editJob(index) {
    initMasterJobsData();
    if (!window.masterJobs || !window.masterJobs[index]) return;
    const j = window.masterJobs[index];
    
    openAddModal();

    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.innerText = 'Edit Dispatch Record';
    
    const editIndex = document.getElementById('editIndex');
    if (editIndex) editIndex.value = index;

    const jobNoInput = document.getElementById('jobNo');
    if (jobNoInput) jobNoInput.value = j.jobNo || '';

    const jobForeman = document.getElementById('jobForeman');
    if (jobForeman) jobForeman.value = j.foreman || '';

    const jobTotal = document.getElementById('jobTotal');
    if (jobTotal) jobTotal.value = j.total || '';
}
window.editJob = editJob;

function deleteJob(jobNo) {
    if (!confirm('Are you sure you want to move this dispatch to Recycle Bin?')) return;

    initMasterJobsData();
    const jobIndex = window.masterJobs.findIndex(j => j.jobNo === jobNo);

    if (jobIndex !== -1) {
        const deletedJob = window.masterJobs.splice(jobIndex, 1)[0];
        window.masterTrash = JSON.parse(localStorage.getItem('movepro_trash_bin')) || [];
        window.masterTrash.push(deletedJob);

        saveMasterJobsData(window.masterJobs);
        localStorage.setItem('movepro_trash_bin', JSON.stringify(window.masterTrash));

        filterJobsTable();
        if (typeof updateDashboardAnalytics === 'function') updateDashboardAnalytics();
    }
}
window.deleteJob = deleteJob;

// ==========================================
// 5. NAVIGATION & TABS
// ==========================================
function switchTab(tab) {
    closeModal();

    const tabs = ['dashboard', 'jobs', 'users', 'reports', 'trash', 'rentals', 'warehouse'];
    
    tabs.forEach(t => {
        const tabEl = document.getElementById(`tab-${t}`);
        const navEl = document.getElementById(`nav-${t}`);
        
        if (tabEl) {
            tabEl.classList.add('hidden');
            tabEl.classList.remove('flex', 'block');
            tabEl.style.setProperty('display', 'none', 'important');
        }
        if (navEl) {
            navEl.className = 'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer';
        }
    });

    const activeTab = document.getElementById(`tab-${tab}`);
    const activeNav = document.getElementById(`nav-${tab}`);
    
    if (activeTab) {
        activeTab.classList.remove('hidden');
        activeTab.classList.add('flex');
        activeTab.style.setProperty('display', 'flex', 'important');
    }
    if (activeNav) {
        activeNav.className = 'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl bg-emerald-600 text-white font-medium shadow-md transition cursor-pointer';
    }

    if (tab === 'dashboard') {
        if (typeof updateDashboardAnalytics === 'function') updateDashboardAnalytics();
    } else if (tab === 'jobs') {
        filterJobsTable();
    } else if (tab === 'trash' && typeof renderTrashBin === 'function') {
        renderTrashBin();
    } else if (tab === 'rentals' && typeof renderPrivateTruckRentalTab === 'function') {
        renderPrivateTruckRentalTab();
    } else if (tab === 'warehouse' && typeof renderWarehouseTab === 'function') {
        renderWarehouseTab();
    } else if (tab === 'reports' && typeof renderReportsTab === 'function') {
        renderReportsTab();
    }
}
window.switchTab = switchTab;

// ==========================================
// 6. INITIALIZATION & SECURED EVENT DELEGATION
// ==========================================
window.onload = () => {
    try {
        initMasterJobsData();
        window.currentUserRole = 'Admin';
        
        if (typeof checkPermissions === 'function') checkPermissions();
        if (typeof renderUsers === 'function') renderUsers();
        
        populateYearFilter();
        filterJobsTable();

        if (typeof updateDashboardAnalytics === 'function') {
            updateDashboardAnalytics();
        }
        
        switchTab('dashboard');

    } catch (error) {
        console.error("An error occurred during window.onload execution:", error);
    }
};

/**
 * Global Event Delegation (Fixed to separate Modal Close from Payment Row Delete)
 */
document.addEventListener('click', function(e) {
    const btn = e.target.closest('button');
    if (!btn) return;

    // 1. معالجة زر الإغلاق للنافذة المنبثقة (Modal Cancel / Close)
    const isCancelBtn = btn.textContent.trim() === 'Cancel' || 
                        btn.getAttribute('onclick')?.includes('closeModal') || 
                        (btn.querySelector('.fa-xmark') && !btn.closest('.payment-row') && !btn.classList.contains('delete-payment-btn'));

    if (isCancelBtn && btn.closest('#jobModal')) {
        e.preventDefault();
        closeModal();
        return;
    }

    // 2. معالجة زر إضافة صف دفع جديد (Add Payment)
    const btnText = btn.textContent.trim();
    const isAddPaymentBtn = btnText.includes('Add Payment') || btn.innerHTML.includes('Add Payment') || btnText === '+ Add Payment';
    
    if (isAddPaymentBtn) {
        e.preventDefault();
        e.stopPropagation();
        
        const parentSection = btn.closest('div.space-y-2') || btn.parentElement;
        let targetContainerId = 'puContainer';

        if (parentSection && (parentSection.textContent.includes('Destination') || parentSection.textContent.includes('Balance'))) {
            targetContainerId = 'destContainer';
        }

        addPaymentRow(targetContainerId);
        return;
    }
});
