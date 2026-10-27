/**
 * MovePro - Application Core Logic & Operations (Production Safe)
 */

if (typeof window.currentUserRole === 'undefined') window.currentUserRole = 'Admin';
if (typeof window.currentLoggedInUser === 'undefined') window.currentLoggedInUser = null;
if (typeof window.revenueChartInstance === 'undefined') window.revenueChartInstance = null;
if (typeof window.paymentMixChartInstance === 'undefined') window.paymentMixChartInstance = null;

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
window.populateYearFilter = populateYearFilter;

// ==========================================
// 2. CRUD TABLE & FILTERING
// ==========================================
function filterJobsTable() {
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
    
    if (typeof renderJobsCRUD === 'function') {
        renderJobsCRUD(filtered);
    }
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
// 4. RENDERING CRUD TABLE
// ==========================================
function renderJobsCRUD(dataToRender) {
    const tbody = document.getElementById('crudTableBody');
    if (!tbody) return;
    
    const records = dataToRender || window.masterJobs || [];

    if (!records || records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="text-center p-4 text-slate-400 text-xs">No dispatches found</td></tr>`;
        return;
    }
    
    tbody.innerHTML = records.map((item) => {
        const foremanDisplay = (!item.foreman || item.foreman.trim() === '') 
            ? `<span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">no name</span>` 
            : `<span class="bg-slate-100 text-slate-900 px-2.5 py-1 rounded font-bold">${item.foreman}</span>`;
        
        let actions = `<span class="text-xs text-slate-400">-</span>`;
        if (window.currentUserRole === 'Admin') {
            actions = `
                <button onclick="editJob('${item.jobNo}')" class="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg mr-1 cursor-pointer" title="Edit Dispatch"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteJob('${item.jobNo}')" class="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer" title="Move to Recycle Bin"><i class="fa-solid fa-trash-can"></i></button>
            `;
        }

        const dieselVal = (item.diesel && item.diesel !== '-') ? item.diesel : '-';
        const hotelVal = (item.hotel && item.hotel !== '-') ? item.hotel : '-';
        const helpersVal = (item.helpers && item.helpers !== '-') ? item.helpers : '-';
        const driversVal = (item.drivers && item.drivers !== '-') ? item.drivers : '-'; 

        const formatPaymentDisplay = (paymentField) => {
            if (!paymentField || paymentField === '-') return '-';
            if (Array.isArray(paymentField)) {
                return paymentField.map(p => `${p.amount || ''} (${p.method || 'Cash'})`).join(', ') || '-';
            }
            return paymentField;
        };

        return `
            <tr class="hover:bg-slate-50 transition border-b border-slate-150">
                <td class="p-3 text-slate-700 font-medium text-xs">${item.date || '-'}</td>
                <td class="p-3 text-slate-700 font-bold text-xs">${item.jobNo || '-'}</td>
                <td class="p-3 text-slate-600 text-xs">${item.route || '-'}</td>
                <td class="p-3 text-xs">${foremanDisplay}</td>
                <td class="p-3 text-purple-700 font-semibold text-xs">${helpersVal}</td>
                <td class="p-3 text-blue-700 font-semibold text-xs">${driversVal}</td> 
                <td class="p-3 text-emerald-600 font-bold text-xs">${item.total || '-'}</td>
                <td class="p-3 text-slate-600 text-xs">${formatPaymentDisplay(item.pu)}</td>
                <td class="p-3 text-slate-600 text-xs">${formatPaymentDisplay(item.dest)}</td>
                <td class="p-3 text-emerald-700 font-semibold text-xs">${dieselVal}</td>
                <td class="p-3 text-indigo-700 font-semibold text-xs">${hotelVal}</td>
                <td class="p-3 text-center">${actions}</td>
            </tr>
        `;
    }).join('');
}
window.renderJobsCRUD = renderJobsCRUD;

function globalSearchFilter() {
    initMasterJobsData();
    const query = document.getElementById('globalSearch')?.value.toLowerCase() || '';
    if (!query) {
        filterJobsTable();
        return;
    }
    let filtered = window.masterJobs.filter(item => 
       String(item.jobNo || '').toLowerCase().includes(query) || 
       String(item.route || '').toLowerCase().includes(query) || 
       String(item.foreman || '').toLowerCase().includes(query)
    );
    switchTab('jobs');
    renderJobsCRUD(filtered);
    const countText = document.getElementById('filteredCountText');
    if (countText) {
        countText.innerText = `Search results: ${filtered.length} records`;
    }
}
window.globalSearchFilter = globalSearchFilter;

// ==========================================
// 5. MODAL & JOB ACTIONS
// ==========================================
function openAddModal() {
    const modal = document.getElementById('jobModal');
    if (modal) {
        document.body.appendChild(modal);
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
            dateVal = `${String(monthVal).padStart(2, '0')}/${String(dayVal).padStart(2, '0')}/${yearVal}`;
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

    const puPayments = [];
    const puContainerEl = document.getElementById('puContainer');
    if (puContainerEl) {
        puContainerEl.querySelectorAll('.payment-row').forEach(row => {
            const amt = row.querySelector('.payment-amount')?.value.trim() || '';
            const mth = row.querySelector('.payment-method')?.value || 'Cash';
            if (amt) puPayments.push({ amount: amt, method: mth });
        });
    }

    const destPayments = [];
    const destContainerEl = document.getElementById('destContainer');
    if (destContainerEl) {
        destContainerEl.querySelectorAll('.payment-row').forEach(row => {
            const amt = row.querySelector('.payment-amount')?.value.trim() || '';
            const mth = row.querySelector('.payment-method')?.value || 'Cash';
            if (amt) destPayments.push({ amount: amt, method: mth });
        });
    }

    let dieselRaw = document.getElementById('dieselAmount') ? document.getElementById('dieselAmount').value.trim() : '';
    const dieselMethod = document.getElementById('dieselMethod') ? document.getElementById('dieselMethod').value : '';
    const dieselFormatted = dieselRaw ? `${formatCurrency(dieselRaw)} ${dieselMethod}`.trim() : '-';

    let hotelRaw = document.getElementById('hotelAmount') ? document.getElementById('hotelAmount').value.trim() : '';
    const hotelMethod = document.getElementById('hotelMethod') ? document.getElementById('hotelMethod').value : '';
    const hotelFormatted = hotelRaw ? `${formatCurrency(hotelRaw)} ${hotelMethod}`.trim() : '-';

    const helpersSelect = document.getElementById('helpersCost');
    let helpersFormatted = '-';
    let helpersCostVal = 0;
    if (helpersSelect && helpersSelect.selectedIndex !== -1) {
        helpersCostVal = parseFloat(helpersSelect.value) || 0;
        const selectedText = helpersSelect.options[helpersSelect.selectedIndex].text;
        helpersFormatted = helpersCostVal > 0 ? selectedText : '-';
    }

    const driversSelect = document.getElementById('driversCost');
    let driversFormatted = '-';
    let driversCostVal = 0;
    if (driversSelect && driversSelect.selectedIndex !== -1) {
        driversCostVal = parseFloat(driversSelect.value) || 0;
        const selectedText = driversSelect.options[driversSelect.selectedIndex].text;
        driversFormatted = driversCostVal > 0 ? selectedText : '-';
    }

    const jobData = {
        date: dateVal,
        month: monthVal,
        year: yearVal,
        jobNo: jobNoVal,
        route: routeVal,
        foreman: document.getElementById('jobForeman') ? document.getElementById('jobForeman').value.trim() : '',
        total: totalFormatted,
        helpers: helpersFormatted,        
        helpersNum: helpersCostVal, 
        drivers: driversFormatted,        
        driversNum: driversCostVal,     
        pu: puFormatted,
        dest: destFormatted,
        puPayments: puPayments,     
        destPayments: destPayments,   
        diesel: dieselFormatted,
        hotel: hotelFormatted
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

function editJob(param) {
    initMasterJobsData();
    let index = param;
    if (typeof param === 'string' || isNaN(param)) {
        index = window.masterJobs.findIndex(j => j.jobNo == param);
    } else {
        index = parseInt(param);
    }

    if (!window.masterJobs || index < 0 || !window.masterJobs[index]) {
        alert("Could not load the record for editing.");
        return;
    }

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

    if (j.puPayments && Array.isArray(j.puPayments)) {
        j.puPayments.forEach(p => addPaymentRow('puContainer', p.amount, p.method));
    }
    if (j.destPayments && Array.isArray(j.destPayments)) {
        j.destPayments.forEach(p => addPaymentRow('destContainer', p.amount, p.method));
    }
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
        updateDashboardAnalytics();
        if (typeof renderTrashBin === 'function') renderTrashBin();
    }
}
window.deleteJob = deleteJob;

// ==========================================
// 6. DASHBOARD ANALYTICS & CHARTS
// ==========================================
function updateDashboardAnalytics() {
    initMasterJobsData();
    if (!window.masterJobs || window.masterJobs.length === 0) return;

    let totalRev = 0;
    const routeRevenueMap = {};
    const paymentMethodMap = { Cash: 0, Zelle: 0, Cheque: 0, PMO: 0, BC: 0, PC: 0, CC: 0, WT: 0, Others: 0 };
    const monthlyRev = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    window.masterJobs.forEach(job => {
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

        const extractMethods = (text) => {
            if (!text || text === '-') return;
            const lower = text.toLowerCase();
            if (lower.includes('cash')) paymentMethodMap.Cash++;
            else if (lower.includes('zelle')) paymentMethodMap.Zelle++;
            else if (lower.includes('cheque')) paymentMethodMap.Cheque++;
            else if (lower.includes('pmo')) paymentMethodMap.PMO++;
            else if (lower.includes('bc')) paymentMethodMap.BC++;
            else if (lower.includes('pc')) paymentMethodMap.PC++;
            else if (lower.includes('cc')) paymentMethodMap.CC++;
            else if (lower.includes('wt')) paymentMethodMap.WT++;
            else paymentMethodMap.Others++;
        };

        extractMethods(job.pu);
        extractMethods(job.dest);
    });

    const completedJobsCount = window.masterJobs.length;
    const avgJobVal = completedJobsCount > 0 ? (totalRev / completedJobsCount) : 0;

    const revEl = document.getElementById('dashTotalRevenue');
    if (revEl) revEl.innerText = '$' + totalRev.toLocaleString('en-US');

    const jobsTextEl = document.getElementById('dashCompletedJobsText');
    if (jobsTextEl) jobsTextEl.innerHTML = `<i class="fa-solid fa-truck-check mr-1"></i>${completedJobsCount} Active Dispatches`;

    const avgEl = document.getElementById('dashAvgJobValue');
    if (avgEl) avgEl.innerText = '$' + Math.round(avgJobVal).toLocaleString('en-US');

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

    if (typeof renderDashboardCharts === 'function') {
        renderDashboardCharts(monthlyRev, paymentMethodMap);
    }
}
window.updateDashboardAnalytics = updateDashboardAnalytics;

function renderDashboardCharts(monthlyData, paymentData) {
    const ctxRevenue = document.getElementById('revenueChart');
    if (ctxRevenue) {
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
    if (ctxPayment) {
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
}
window.renderDashboardCharts = renderDashboardCharts;

// ==========================================
// 7. NAVIGATION & TABS
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
        setTimeout(updateDashboardAnalytics, 100);
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
// 8. INITIALIZATION & EVENT DELEGATION
// ==========================================
window.onload = () => {
    try {
        initMasterJobsData();
        window.currentUserRole = 'Admin';
        
        checkPermissions();
        renderUsers();
        populateYearFilter();
        
        if (typeof renderTrashBin === 'function') renderTrashBin();

        filterJobsTable();
        updateDashboardAnalytics();
        switchTab('dashboard');

    } catch (error) {
        console.error("An error occurred during window.onload execution:", error);
    }
};

document.addEventListener('click', function(e) {
    const btn = e.target.closest('button');
    if (!btn) return;

    const btnText = btn.textContent.trim();
    const isCancelBtn = btnText === 'Cancel' || btn.getAttribute('onclick')?.includes('closeModal') || (btn.querySelector('.fa-xmark') && !btn.closest('.payment-row') && !btn.classList.contains('delete-payment-btn'));

    if (isCancelBtn && btn.closest('#jobModal')) {
        e.preventDefault();
        closeModal();
        return;
    }

    const isAddPaymentBtn = btnText.includes('Payment') || btn.innerHTML.includes('Add Payment') || btnText.includes('+ Add');
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
