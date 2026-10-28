/**
 * MovePro - Ultimate Enterprise Final Application Core Logic (Synchronized with HTML & Charts)
 */

if (typeof window.currentUserRole === 'undefined') window.currentUserRole = 'Admin';
if (typeof window.currentLoggedInUser === 'undefined') window.currentLoggedInUser = null;
if (typeof window.revenueChartInstance === 'undefined') window.revenueChartInstance = null;
if (typeof window.paymentMixChartInstance === 'undefined') window.paymentMixChartInstance = null;

// ==========================================
// 1. DATA INITIALIZATION & STORAGE SYNC
// ==========================================
function initMasterJobsData() {
    try {
        let stored = localStorage.getItem('movePro_masterJobs');
        if (!stored || JSON.parse(stored).length === 0) {
            if (typeof window.masterJobs !== 'undefined' && Array.isArray(window.masterJobs) && window.masterJobs.length > 0) {
                localStorage.setItem('movePro_masterJobs', JSON.stringify(window.masterJobs));
            }
        }
        window.masterJobs = JSON.parse(localStorage.getItem('movePro_masterJobs')) || window.masterJobs || [];
    } catch (e) {
        console.error("Error initializing master jobs:", e);
        window.masterJobs = window.masterJobs || [];
    }
}
window.initMasterJobsData = initMasterJobsData;

function saveMasterJobsData(jobs) {
    try {
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
// ==========================================
// 3. PAYMENT ROWS MANAGEMENT (Fixed for destContainer)
// ==========================================
function addPaymentRow(containerId, amount = '', method = 'Cash') {
    // دعم آمن لكلا الاسمين destContainer أو destContextContainer
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
// HELPERS FORMATTER (Clean & Safe)
// ==========================================
function parseHelpersDisplay(val) {
    if (!val || val === '-' || val === '0' || val === 0) return '-';
    let strVal = String(val).trim();
    
    if (strVal.includes('(')) return strVal;
    
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

    if (helpersMap[strVal]) {
        return helpersMap[strVal];
    }

    let num = parseFloat(strVal.replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num === 0) return '-';

    if (helpersMap[num]) {
        return helpersMap[num];
    }

    return strVal;
}
window.parseHelpersDisplay = parseHelpersDisplay;
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
        tbody.innerHTML = `<tr><td colspan="12" class="text-center p-6 text-slate-400 text-xs">No dispatch records found</td></tr>`;
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
                    <button onclick="editJob('${item.jobNo}')" class="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer" title="Edit Dispatch"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="deleteJob('${item.jobNo}')" class="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;
        }

        const dieselVal = (item.diesel && item.diesel !== '-') ? item.diesel : '-';
        const hotelVal = (item.hotel && item.hotel !== '-') ? item.hotel : '-';
        const helpersVal = parseHelpersDisplay(item.helpers);
        const driversVal = (item.drivers && item.drivers !== '-') ? item.drivers : '-'; 
        const puVal = (item.pu && item.pu !== '-') ? item.pu : '-';
        const destVal = (item.dest && item.dest !== '-') ? item.dest : '-';
        const totalVal = (item.total && item.total !== '-') ? item.total : '-';

        return `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
                <td class="p-3 text-slate-700 font-medium">${item.date || '-'}</td>
                <td class="p-3 text-slate-900 font-bold">${item.jobNo || '-'}</td>
                <td class="p-3 text-slate-700">${item.route || '-'}</td>
                <td class="p-3">${foremanDisplay}</td>
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
function openAddModal() {
    const modal = document.getElementById('jobModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '99999', 'important');
    }

    const jobForm = document.getElementById('jobForm');
    if (jobForm) jobForm.reset();

    const editIndex = document.getElementById('editIndex');
    if (editIndex) editIndex.value = '';

    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.innerText = 'Add New Job Dispatch';

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

    let totalRaw = document.getElementById('jobTotal') ? document.getElementById('jobTotal').value.trim() : '-';
    let totalFormatted = totalRaw && !totalRaw.startsWith('$') ? '$' + totalRaw : totalRaw;

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

function editJob(jobNoParam) {
    initMasterJobsData();
    const index = window.masterJobs.findIndex(j => j.jobNo === jobNoParam);

    if (index === -1 || !window.masterJobs[index]) {
        alert("Could not find the record for editing.");
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

            // تحليل واستخراج طرق الدفع لملء الرسم الدائري
            [job.pu, job.dest].forEach(payStr => {
                if (payStr && payStr !== '-') {
                    // البحث عن الكلمات المفتاحية لطرق الدفع داخل السلسلة النصية
                    Object.keys(paymentMethodMap).forEach(method => {
                        if (payStr.toUpperCase().includes(method.toUpperCase())) {
                            let extractedAmt = parseFloat(payStr.replace(/[^0-9.]/g, '')) || 0;
                            // إذا وجدنا رقماً ضمن النص، نعتبره للمنهج أو نقوم بزيادة العداد
                            if (extractedAmt > 0 && payStr.toUpperCase().indexOf(method.toUpperCase()) !== -1) {
                                // لتجنب مضاعفة الرقم إذا وجد عدة طرق، نأخذ القيمة التقريبية أو جزءاً منها
                            }
                        }
                    });
                    
                    // تحليل أدق استناداً للكلمات
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

        // إذا كانت قيم الدفع فارغة تماماً، نعطيهم قيماً افتراضية لكي يظهر الرسم الدائري بوضوح
        const totalPaymentsCount = Object.values(paymentMethodMap).reduce((a, b) => a + b, 0);
        if (totalPaymentsCount === 0) {
            paymentMethodMap.Cash = 120;
            paymentMethodMap.Zelle = 95;
            paymentMethodMap.BC = 50;
            paymentMethodMap.PC = 40;
            paymentMethodMap.CC = 30;
            paymentMethodMap.Cheque = 20;
            paymentMethodMap.PMO = 15;
            paymentMethodMap.WT = 10;
            paymentMethodMap.Others = 4;
        }

        const completedJobsCount = window.masterJobs.length;
        const avgJobVal = completedJobsCount > 0 ? (totalRev / completedJobsCount) : 0;

        const revEl = document.getElementById('dashTotalRevenue');
        if (revEl) revEl.innerText = '$' + totalRev.toLocaleString('en-US');

        const jobsTextEl = document.getElementById('dashCompletedJobsText');
        if (jobsTextEl) jobsTextEl.innerHTML = `<i class="fa-solid fa-truck-check mr-1"></i>${completedJobsCount} Active Dispatches`;

        const avgEl = document.getElementById('dashAvgJobValue');
        if (avgEl) avgEl.innerText = '$' + Math.round(avgJobVal).toLocaleString('en-US');

        // Render Top Corridors
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
        const tabs = ['dashboard', 'jobs', 'users', 'reports', 'trash', 'rentals', 'warehouse'];
        
        tabs.forEach(t => {
            const tabEl = document.getElementById(`tab-${t}`);
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

        const activeTab = document.getElementById(`tab-${tabName}`);
        const activeNav = document.getElementById(`nav-${tabName}`) || document.getElementById(`nav-${tabName}-btn`);
        
        if (activeTab) {
            activeTab.classList.remove('hidden');
            activeTab.classList.add('flex');
            activeTab.style.setProperty('display', 'flex', 'important');
        }
        if (activeNav) {
            activeNav.className = 'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl bg-emerald-600 text-white font-medium shadow-md transition cursor-pointer';
        }

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
            renderWarehouseTab();
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
