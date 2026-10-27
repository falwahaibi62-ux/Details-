let currentUserRole = 'Admin';
let currentLoggedInUser = null;
let revenueChartInstance = null;
let paymentMixChartInstance = null;

function populateYearFilter() {
    const yearSelect = document.getElementById('filterYear');
    if (!yearSelect) return;

    const uniqueYears = [...new Set(masterJobs.map(item => item.year))].filter(y => y).sort((a, b) => b - a);
    const currentSelected = yearSelect.value;

    let optionsHTML = `<option value="ALL">All Years</option>`;
    uniqueYears.forEach(year => {
        optionsHTML += `<option value="${year}" ${year == currentSelected ? 'selected' : ''}>${year}</option>`;
    });

    yearSelect.innerHTML = optionsHTML;
}

// Function to filter the master jobs ledger based on selected month and year filters
function filterJobsTable() {
    const jobsTab = document.getElementById('tab-jobs');
    if (!jobsTab || jobsTab.classList.contains('hidden')) {
        return; 
    }

    const monthVal = document.getElementById('filterMonth')?.value || 'ALL';
    const yearVal = document.getElementById('filterYear')?.value || 'ALL';

    let filtered = masterJobs.filter(job => {
        const matchesMonth = (monthVal === 'ALL') || (job.month && job.month.toString() === monthVal);
        const matchesYear = (yearVal === 'ALL') || (job.year && job.year.toString() === yearVal);
        return matchesMonth && matchesYear;
    });

    const countText = document.getElementById('filteredCountText');
    if (countText) {
        countText.innerText = `Showing ${filtered.length} of ${masterJobs.length} records`;
    }
    
    if (typeof renderJobsCRUD === 'function') {
        renderJobsCRUD(filtered);
    }
}
window.masterJobs = window.masterJobs || [];
window.filterJobsTable = filterJobsTable;
function renderUsers() {
    const container = document.getElementById('usersListContainer');
    if(!container) return;
    if(typeof systemUsers === 'undefined') return;
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

function checkPermissions() {
    const addBtn = document.getElementById('addJobBtn');
    if (currentUserRole === 'Viewer') {
        if(addBtn) addBtn.style.display = 'none';
    } else {
        if(addBtn) addBtn.style.display = 'flex';
    }
}

function addPaymentRow(containerId, amount = '', method = 'Cash') {
    console.log("addPaymentRow called with containerId:", containerId);
    
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
        <button type="button" onclick="document.getElementById('${rowId}').remove()" class="text-red-500 hover:text-red-700 text-sm font-bold px-1 cursor-pointer">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    container.appendChild(rowDiv);
    console.log("Payment row added successfully to:", containerId);
}
window.addPaymentRow = addPaymentRow;

function removePaymentRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
}

function extractPaymentsFromContainer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return '-';

    const rows = container.querySelectorAll('.payment-row');
    const paymentsList = [];

    rows.forEach(row => {
        const amt = row.querySelector('.payment-amount').value.trim();
        const mth = row.querySelector('.payment-method').value;
        if (amt !== '') {
            paymentsList.push(`${amt} ${mth}`);
        }
    });

    return paymentsList.length > 0 ? paymentsList.join(', ') : '-';

}
window.addPaymentRow = addPaymentRow;


// Function to render the jobs CRUD table using unique jobNo for safe actions
function renderJobsCRUD(dataToRender) {
    const tbody = document.getElementById('crudTableBody');
    if(!tbody) return;
    
    if (!dataToRender || dataToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="text-center p-4 text-slate-400 text-xs">No dispatches found</td></tr>`;
        return;
    }
    
    tbody.innerHTML = dataToRender.map((item) => {
        const foremanDisplay = (!item.foreman || item.foreman.trim() === '') 
            ? `<span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">no name</span>` 
            : `<span class="bg-slate-100 text-slate-900 px-2.5 py-1 rounded font-bold">${item.foreman}</span>`;
        
        let actions = `<span class="text-xs text-slate-400">-</span>`;
        if (typeof currentUserRole !== 'undefined' && currentUserRole === 'Admin') {
            actions = `
                <button onclick="editJob('${item.jobNo}')" class="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg mr-1" title="Edit Dispatch"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteJob('${item.jobNo}')" class="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg" title="Move to Recycle Bin"><i class="fa-solid fa-trash-can"></i></button>
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
    const query = document.getElementById('globalSearch').value.toLowerCase();
    if (!query) {
        filterJobsTable();
        return;
    }
    let filtered = masterJobs.filter(item => 
       String(item.jobNo || '').toLowerCase().includes(query) || 
       String(item.route || '').toLowerCase().includes(query) || 
       String(item.foreman || '').toLowerCase().includes(query)
    );
   switchTab('jobs');
    renderJobsCRUD(filtered);
    const countText = document.getElementById('filteredCountText');
    if(countText) {
        countText.innerText = `Search results: ${filtered.length} records`;
    }
}


function openAddModal() {
    const modal = document.getElementById('jobModal');
    if (modal) {
        // نقل الـ modal برمجياً إلى نهاية الـ body لضمان ظهوره فوق جميع العناصر دون قيود
        document.body.appendChild(modal);
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '99999', 'important');
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
    } else {
        console.error("Element with id 'jobModal' not found!");
    }

    const jobForm = document.getElementById('jobForm');
    if (jobForm) jobForm.reset();

    const editIndex = document.getElementById('editIndex');
    if (editIndex) editIndex.value = '';

    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.innerText = 'Add New Job';

    console.log("Add Modal opened successfully!");
}
window.openAddModal = openAddModal;

function closeModal() {
    const modal = document.getElementById('jobModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.display = 'none';
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

    const jobNoVal = jobNoInput.value.trim();
    if (!window.masterJobs) window.masterJobs = [];

    const editIndexInput = document.getElementById('editIndex');
    const editIndex = editIndexInput ? parseInt(editIndexInput.value, 10) : -1;
    const isEditing = !isNaN(editIndex) && editIndex >= 0 && editIndex < window.masterJobs.length;

    const existingIndex = window.masterJobs.findIndex(j => j.jobNo === jobNoVal);
    if (!isEditing && existingIndex !== -1) {
        alert(`Job Number "${jobNoVal}" already exists. Please use a unique Job Number.`);
        jobNoInput.focus();
        return;
    }

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
        } else if (dateRaw.includes('/')) {
            const p = dateRaw.split('/');
            monthVal = parseInt(p[0]) || monthVal;
            yearVal = parseInt(p[2]) || yearVal;
            dateVal = dateRaw;
        }
    }

    const formatCurrency = (val) => {
        if (!val || val === '-') return '-';
        if (val.startsWith('$')) return val;
        let num = parseFloat(val.replace(/[^0-9.]/g, ''));
        return isNaN(num) ? val : '$' + num.toLocaleString('en-US');
    };

    let totalRaw = document.getElementById('jobTotal') ? document.getElementById('jobTotal').value.trim() : '';
    let totalFormatted = formatCurrency(totalRaw);

    const fromVal = document.getElementById('routeFrom') ? document.getElementById('routeFrom').value.trim().toUpperCase() : '';
    const toVal = document.getElementById('routeTo') ? document.getElementById('routeTo').value.trim().toUpperCase() : '';
    const routeVal = (fromVal || toVal) ? `${fromVal} → ${toVal}` : '-';

    const puFormatted = typeof extractPaymentsFromContainer === 'function' ? extractPaymentsFromContainer('puContainer') : '-';
    const destFormatted = typeof extractPaymentsFromContainer === 'function' ? extractPaymentsFromContainer('destContainer') : '-';

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

    if (typeof saveMasterJobs === 'function') saveMasterJobs(window.masterJobs);
    if (typeof closeModal === 'function') closeModal();
    if (typeof populateYearFilter === 'function') populateYearFilter();
    if (typeof filterJobsTable === 'function') filterJobsTable();
    if (typeof updateDashboardAnalytics === 'function') updateDashboardAnalytics();
}
window.saveJob = saveJob;
function editJob(param) {

    if (typeof renderJobModal === 'function') {
        renderJobModal();
    }
    
    let index = param;
    if (typeof param === 'string' || isNaN(param)) {
        index = masterJobs.findIndex(j => j.jobNo == param);
    } else {
        index = parseInt(param);
    }

    if (!masterJobs || index < 0 || !masterJobs[index]) {
        console.error("Job record not found for:", param);
        alert("Could not load the record for editing. Please refresh the table.");
        return;
    }

    const j = masterJobs[index];
    
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.innerText = 'Edit Dispatch Record';
    
    const editIndex = document.getElementById('editIndex');
    if (editIndex) editIndex.value = index;
    
    const dateInput = document.getElementById('jobDate');
    if (dateInput) {
        if (j.date && j.date.includes('/')) {
            const parts = j.date.split('/');
            if (parts.length === 3) {
                const mm = parts[0].padStart(2, '0');
                const dd = parts[1].padStart(2, '0');
                const yyyy = parts[2];
                dateInput.value = `${yyyy}-${mm}-${dd}`;
            } else {
                dateInput.value = j.date;
            }
        } else {
            dateInput.value = j.date || '';
        }
    }

    const jobNoInput = document.getElementById('jobNo');
    if (jobNoInput) jobNoInput.value = j.jobNo || '';

    const routeFrom = document.getElementById('routeFrom');
    const routeTo = document.getElementById('routeTo');
    if (j.route && j.route.includes('→')) {
        const parts = j.route.split('→');
        if (routeFrom) routeFrom.value = parts[0].trim();
        if (routeTo) routeTo.value = parts[1].trim();
    } else {
        if (routeFrom) routeFrom.value = j.route || '';
        if (routeTo) routeTo.value = '';
    }

    const jobForeman = document.getElementById('jobForeman');
    if (jobForeman) jobForeman.value = j.foreman || '';

    const jobTotal = document.getElementById('jobTotal');
    if (jobTotal) jobTotal.value = j.total || '';

    const helpersSelect = document.getElementById('helpersCost');
    if (helpersSelect) {
        if (j.helpersNum !== undefined && j.helpersNum !== null) {
            helpersSelect.value = j.helpersNum;
        } else if (j.helpers && j.helpers !== '-') {
            const num = parseFloat(j.helpers.replace(/[^0-9.]/g, '')) || 0;
            helpersSelect.value = num;
        } else {
            helpersSelect.value = '0';
        }
    }

    const driversSelect = document.getElementById('driversCost');
    if (driversSelect) {
        if (j.driversNum !== undefined && j.driversNum !== null) {
            driversSelect.value = j.driversNum;
        } else if (j.drivers && j.drivers !== '-') {
            const num = parseFloat(j.drivers.replace(/[^0-9.]/g, '')) || 0;
            driversSelect.value = num;
        } else {
            driversSelect.value = '0';
        }
    }

    const dieselAmount = document.getElementById('dieselAmount');
    const dieselMethod = document.getElementById('dieselMethod');
    if (j.diesel) {
        const parts = j.diesel.split(' ');
        if (dieselAmount) dieselAmount.value = parts[0] || '';
        if (dieselMethod && parts[1]) dieselMethod.value = parts[1];
    } else {
        if (dieselAmount) dieselAmount.value = '';
    }

    const hotelAmount = document.getElementById('hotelAmount');
    const hotelMethod = document.getElementById('hotelMethod');
    if (j.hotel) {
        const parts = j.hotel.split(' ');
        if (hotelAmount) hotelAmount.value = parts[0] || '';
        if (hotelMethod && parts[1]) hotelMethod.value = parts[1];
    } else {
        if (hotelAmount) hotelAmount.value = '';
    }

    const puContainer = document.getElementById('puContainer');
    const destContainer = document.getElementById('destContainer');
    if (puContainer) puContainer.innerHTML = '';
    if (destContainer) destContainer.innerHTML = '';

    if (j.puPayments && Array.isArray(j.puPayments)) {
        j.puPayments.forEach(p => addPaymentRow('puContainer', p.amount, p.method));
    }
    if (j.destPayments && Array.isArray(j.destPayments)) {
        j.destPayments.forEach(p => addPaymentRow('destContainer', p.amount, p.method));
    }

    const modal = document.getElementById('jobModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

window.editJob = editJob;

// Function to delete/move a specific dispatch record to the Recycle Bin safely using jobNo
function deleteJob(jobNo) {
    if (!confirm('Are you sure you want to move this dispatch to Recycle Bin?')) return;

    const jobIndex = masterJobs.findIndex(j => j.jobNo === jobNo);

    if (jobIndex !== -1) {
        const deletedJob = masterJobs.splice(jobIndex, 1)[0];
        window.masterTrash.push(deletedJob);

        saveMasterJobs(masterJobs);
        saveTrashBin(window.masterTrash);

        filterJobsTable();
        updateDashboardAnalytics();
        if (typeof renderTrashBin === 'function') renderTrashBin();
    }
}

function updateDashboardAnalytics() {
    if (!masterJobs || masterJobs.length === 0) return;

    let totalRev = 0;
    const routeRevenueMap = {};
    
    const paymentMethodMap = { 
        Cash: 0, 
        Zelle: 0, 
        Cheque: 0, 
        PMO: 0, 
        BC: 0, 
        PC: 0, 
        CC: 0, 
        WT: 0, 
        Others: 0 
    };
    
    const monthlyRev = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    masterJobs.forEach(job => {
        let amt = 0;
        if (job.total) {
            amt = parseFloat(job.total.replace(/[^0-9.]/g, '')) || 0;
        }
        totalRev += amt;

        if (job.month && job.month >= 1 && job.month <= 12) {
            monthlyRev[job.month - 1] += amt;
        }

        if (job.route) {
            routeRevenueMap[job.route] = (routeRevenueMap[job.route] || 0) + amt;
        }

        // دالة استخراج وفحص طرق الدفع بدقة لكل نصوص المدفوعات
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

    const completedJobsCount = masterJobs.length;
    const avgJobVal = completedJobsCount > 0 ? (totalRev / completedJobsCount) : 0;

    const revEl = document.getElementById('dashTotalRevenue');
    if (revEl) revEl.innerText = '$' + totalRev.toLocaleString('en-US');

    const jobsTextEl = document.getElementById('dashCompletedJobsText');
    if (jobsTextEl) jobsTextEl.innerHTML = `<i class="fa-solid fa-truck-check mr-1"></i>${completedJobsCount} Active Dispatches`;

    const avgEl = document.getElementById('dashAvgJobValue');
    if (avgEl) avgEl.innerText = '$' + Math.round(avgJobVal).toLocaleString('en-US');

    const topCorridorsContainer = document.getElementById('topCorridorsContainer');
    if (topCorridorsContainer) {
        const sortedRoutes = Object.entries(routeRevenueMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);

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

function renderDashboardCharts(monthlyData, paymentData) {
    const ctxRevenue = document.getElementById('revenueChart');
    if (ctxRevenue) {
        if (typeof revenueChartInstance !== 'undefined' && revenueChartInstance) revenueChartInstance.destroy();
        revenueChartInstance = new Chart(ctxRevenue, {
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
        if (typeof paymentMixChartInstance !== 'undefined' && paymentMixChartInstance) paymentMixChartInstance.destroy();
        
        // مصفوفة ألوان موسعة ومتناسقة تغطي جميع طرق الدفع الـ 9
        const paymentColors = [
            '#10b981', // Cash - أخضر
            '#3b82f6', // Zelle - أزرق
            '#8b5cf6', // Cheque - بنفسجي
            '#f59e0b', // PMO - برتقالي
            '#06b6d4', // BC - سماوي
            '#ec4899', // PC - وردي
            '#6366f1', // CC - أزرق نيلي
            '#84cc16', // WT - أخضر ليموني
            '#64748b'  // Others - رمادي
        ];

        paymentMixChartInstance = new Chart(ctxPayment, {
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
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
                },
                cutout: '65%'
            }
        });
    }
}
window.renderDashboardCharts = renderDashboardCharts;





function switchTab(tab) {
    if (typeof closeModal === 'function') {
        closeModal();
    }

    const tabs = ['dashboard', 'jobs', 'users', 'reports', 'trash', 'rentals', 'warehouse'];
    
    // إخفاء جميع التبويبات تماماً وفرض إخفائها بـ important
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

    const exportBtn = document.getElementById('exportPdfBtn');
    if (exportBtn) {
        if (tab === 'reports') { 
            exportBtn.classList.remove('hidden');
            exportBtn.classList.add('flex');
            exportBtn.style.setProperty('display', 'flex', 'important');
        } else {
            exportBtn.classList.add('hidden');
            exportBtn.classList.remove('flex');
            exportBtn.style.setProperty('display', 'none', 'important');
        }
    }

    if (tab === 'dashboard') {
        if (typeof updateDashboardAnalytics === 'function') setTimeout(updateDashboardAnalytics, 100);
    } else if (tab === 'jobs') {
        if (typeof filterJobsTable === 'function') filterJobsTable();
    } else if (tab === 'trash') {
        if (typeof renderTrashBin === 'function') renderTrashBin();
    } else if (tab === 'rentals') {
        if (typeof renderPrivateTruckRentalTab === 'function') renderPrivateTruckRentalTab();
    } else if (tab === 'warehouse') {
        if (typeof renderWarehouseTab === 'function') renderWarehouseTab();
    } else if (tab === 'reports') {
        if (typeof renderReportsTab === 'function') renderReportsTab();
    }
}
window.switchTab = switchTab;
// Function to render the Recycle Bin table view
function renderTrashBin() {
    const tbody = document.getElementById('trashTableBody');
    if (!tbody) return;

    const TRASH_KEY = 'movepro_trash_bin';
    let trashBin = JSON.parse(localStorage.getItem(TRASH_KEY)) || [];

    if (trashBin.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="p-12 text-center text-slate-400 text-xs">
                    <i class="fa-solid fa-trash text-3xl mb-2 block text-slate-300"></i>
                    Recycle Bin is empty.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = trashBin.map((item, index) => {
        if (item.recordType === 'rental') {
            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="p-3 text-slate-700 font-medium text-xs">${item.date || '-'}</td>
                    <td class="p-3 text-xs"><span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold text-[10px]">Rental</span></td>
                    <td class="p-3 text-slate-800 font-bold text-xs">${item.truckLabel || 'Truck Rental'}</td>
                    <td class="p-3 text-slate-600 text-xs">${item.days || 0} Days</td>
                    <td class="p-3 text-slate-600 text-xs">${item.paidBy || '-'}</td>
                    <td class="p-3 text-purple-700 text-xs">-</td>
                    <td class="p-3 text-blue-700 text-xs">-</td>
                    <td class="p-3 text-emerald-600 font-bold text-xs">$${parseFloat(item.amount || 0).toLocaleString()}</td>
                    <td class="p-3 text-center space-x-2">
                        <button onclick="restoreTrashItem(${index})" class="px-2.5 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold transition" title="Restore">
                            <i class="fa-solid fa-rotate-left"></i> Restore
                        </button>
                        <button onclick="permanentDeleteTrashItem(${index})" class="px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold transition" title="Delete Permanently">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        } else if (item.recordType === 'warehouse') {
            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="p-3 text-slate-700 font-medium text-xs">${item.date || '-'}</td>
                    <td class="p-3 text-xs"><span class="px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-bold text-[10px]">Warehouse</span></td>
                    <td class="p-3 text-slate-800 font-bold text-xs">${item.services || '-'}</td>
                    <td class="p-3 text-slate-600 text-xs">${item.paymentType || '-'}</td>
                    <td class="p-3 text-slate-600 text-xs" colspan="3">${item.details || '-'}</td>
                    <td class="p-3 text-emerald-600 font-bold text-xs">$${parseFloat(item.amount || 0).toLocaleString()}</td>
                    <td class="p-3 text-center space-x-2">
                        <button onclick="restoreTrashItem(${index})" class="px-2.5 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold transition" title="Restore">
                            <i class="fa-solid fa-rotate-left"></i> Restore
                        </button>
                        <button onclick="permanentDeleteTrashItem(${index})" class="px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold transition" title="Delete Permanently">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        } else {
            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="p-3 text-slate-700 font-medium text-xs">${item.date || '-'}</td>
                    <td class="p-3 text-xs"><span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-bold text-[10px]">Job</span></td>
                    <td class="p-3 text-slate-800 font-bold text-xs">${item.jobNo || '-'}</td>
                    <td class="p-3 text-slate-600 text-xs">${item.route || '-'}</td>
                    <td class="p-3 text-slate-600 text-xs">${item.foreman || '-'}</td>
                    <td class="p-3 text-purple-700 font-semibold text-xs">${item.helpers || '-'}</td>
                    <td class="p-3 text-blue-700 font-semibold text-xs">${item.drivers || '-'}</td>
                    <td class="p-3 text-emerald-600 font-bold text-xs">${item.total || '-'}</td>
                    <td class="p-3 text-center space-x-2">
                        <button onclick="restoreTrashItem(${index})" class="px-2.5 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold transition" title="Restore">
                            <i class="fa-solid fa-rotate-left"></i> Restore
                        </button>
                        <button onclick="permanentDeleteTrashItem(${index})" class="px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold transition" title="Delete Permanently">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }
    }).join('');
}
// Function to restore a job from Recycle Bin back to master jobs ledger
function restoreTrashItem(index) {
    const TRASH_KEY = 'movepro_trash_bin';
    let trashBin = JSON.parse(localStorage.getItem(TRASH_KEY)) || [];
    
    if (index < 0 || index >= trashBin.length) return;

    const trashItem = trashBin.splice(index, 1)[0];
    if (!trashItem) return;

    const { recordType, deletedAt, ...restoredItem } = trashItem;

    if (recordType === 'rental') {
        let rentals = JSON.parse(localStorage.getItem('movepro_private_truck_rentals')) || [];
        rentals.unshift(restoredItem);
        localStorage.setItem('movepro_private_truck_rentals', JSON.stringify(rentals));
    } else if (recordType === 'warehouse') {
        let warehouse = JSON.parse(localStorage.getItem('movepro_warehouse_records')) || [];
        warehouse.unshift(restoredItem);
        localStorage.setItem('movepro_warehouse_records', JSON.stringify(warehouse));
    } else {
        let jobs = JSON.parse(localStorage.getItem('movePro_masterJobs')) || [];
        jobs.unshift(restoredItem);
        localStorage.setItem('movePro_masterJobs', JSON.stringify(jobs));
    }

    localStorage.setItem(TRASH_KEY, JSON.stringify(trashBin));

    renderTrashBin();
    if (typeof filterJobsTable === 'function') filterJobsTable();
    if (typeof renderPrivateTruckRentalTab === 'function') renderPrivateTruckRentalTab();
    if (typeof renderWarehouseTab === 'function') renderWarehouseTab();
    if (typeof updateDashboardAnalytics === 'function') updateDashboardAnalytics();
}
// Unified Restore Function for warehouse and Jobs and Rentals
function renderTrashBin() {
    const tbody = document.getElementById('trashTableBody');
    if (!tbody) return;

    const TRASH_KEY = 'movepro_trash_bin';
    let trashBin = JSON.parse(localStorage.getItem(TRASH_KEY)) || [];

    if (trashBin.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="p-12 text-center text-slate-400 text-xs">
                    <i class="fa-solid fa-trash text-3xl mb-2 block text-slate-300"></i>
                    Recycle Bin is empty.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = trashBin.map((item, index) => {
        if (item.recordType === 'rental') {
            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="p-3 text-slate-700 font-medium text-xs">${item.date || '-'}</td>
                    <td class="p-3 text-xs"><span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold text-[10px]">Rental</span></td>
                    <td class="p-3 text-slate-800 font-bold text-xs">${item.truckLabel || 'Truck Rental'}</td>
                    <td class="p-3 text-slate-600 text-xs">${item.days || 0} Days</td>
                    <td class="p-3 text-slate-600 text-xs">${item.paidBy || '-'}</td>
                    <td class="p-3 text-purple-700 text-xs">-</td>
                    <td class="p-3 text-blue-700 text-xs">-</td>
                    <td class="p-3 text-emerald-600 font-bold text-xs">$${parseFloat(item.amount || 0).toLocaleString()}</td>
                    <td class="p-3 text-center space-x-2">
                        <button onclick="restoreTrashItem(${index})" class="px-2.5 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold transition" title="Restore">
                            <i class="fa-solid fa-rotate-left"></i> Restore
                        </button>
                        <button onclick="permanentDeleteTrashItem(${index})" class="px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold transition" title="Delete Permanently">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        } else if (item.recordType === 'warehouse') {
            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="p-3 text-slate-700 font-medium text-xs">${item.date || '-'}</td>
                    <td class="p-3 text-xs"><span class="px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-bold text-[10px]">Warehouse</span></td>
                    <td class="p-3 text-slate-800 font-bold text-xs">${item.services || 'Warehouse Service'}</td>
                    <td class="p-3 text-slate-600 text-xs">${item.details || '-'}</td>
                    <td class="p-3 text-slate-600 text-xs">${item.paymentType || '-'}</td>
                    <td class="p-3 text-purple-700 text-xs">-</td>
                    <td class="p-3 text-blue-700 text-xs">-</td>
                    <td class="p-3 text-emerald-600 font-bold text-xs">$${parseFloat(item.amount || 0).toLocaleString()}</td>
                    <td class="p-3 text-center space-x-2">
                        <button onclick="restoreTrashItem(${index})" class="px-2.5 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold transition" title="Restore">
                            <i class="fa-solid fa-rotate-left"></i> Restore
                        </button>
                        <button onclick="permanentDeleteTrashItem(${index})" class="px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold transition" title="Delete Permanently">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        } else {
            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="p-3 text-slate-700 font-medium text-xs">${item.date || '-'}</td>
                    <td class="p-3 text-xs"><span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-bold text-[10px]">Job</span></td>
                    <td class="p-3 text-slate-800 font-bold text-xs">${item.jobNo || '-'}</td>
                    <td class="p-3 text-slate-600 text-xs">${item.route || '-'}</td>
                    <td class="p-3 text-slate-600 text-xs">${item.foreman || '-'}</td>
                    <td class="p-3 text-purple-700 font-semibold text-xs">${item.helpers || '-'}</td>
                    <td class="p-3 text-blue-700 font-semibold text-xs">${item.drivers || '-'}</td>
                    <td class="p-3 text-emerald-600 font-bold text-xs">${item.total || '-'}</td>
                    <td class="p-3 text-center space-x-2">
                        <button onclick="restoreTrashItem(${index})" class="px-2.5 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold transition" title="Restore">
                            <i class="fa-solid fa-rotate-left"></i> Restore
                        </button>
                        <button onclick="permanentDeleteTrashItem(${index})" class="px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold transition" title="Delete Permanently">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }
    }).join('');
}
// Unified Permanent Delete Function
function permanentDeleteTrashItem(index) {
    if (!confirm('Are you sure you want to permanently delete this record?')) return;

    const TRASH_KEY = 'movepro_trash_bin';
    let trashBin = JSON.parse(localStorage.getItem(TRASH_KEY)) || [];
    
    if (index >= 0 && index < trashBin.length) {
        trashBin.splice(index, 1);
        localStorage.setItem(TRASH_KEY, JSON.stringify(trashBin));
        renderTrashBin();
    }
}

// Empty Entire Recycle Bin
function emptyTrashBin() {
    if (!confirm('Are you sure you want to empty the Recycle Bin? All records will be lost permanently.')) {
        return;
    }
    
    localStorage.removeItem('movepro_trash_bin');
    
    renderTrashBin();
}

window.onload = () => {
    if (typeof loadMasterJobs === 'function') {
        window.masterJobs = loadMasterJobs() || [];
    }
    
    if (!window.masterJobs) {
        window.masterJobs = [];  
    }

    if (typeof loadTruckRentals === 'function') {
        loadTruckRentals();
    }
    if (typeof loadWarehouseRecords === 'function') {
        warehouseRecords = loadWarehouseRecords();
    }
    
    currentUserRole = 'Admin';
    checkPermissions();
    renderUsers();
    populateYearFilter();
    renderTrashBin();

    if (typeof filterJobsTable === 'function') {
        filterJobsTable();
    } else if (typeof renderJobsCRUD === 'function') {
        renderJobsCRUD(window.masterJobs);
    }

    if (typeof updateDashboardAnalytics === 'function') {
        updateDashboardAnalytics();
    }
};

// مستمع آمن ومخصص فقط لأزرار المدفوعات والإلغاء داخل النوافذ المنبثقة
document.addEventListener('click', function(e) {
    const btn = e.target.closest('button');
    if (!btn) return;

    // استثناء زر Add New Job الرئيسي تماماً لكي يعمل بشكل طبيعي دون أي اعتراض
    if (btn.textContent.includes('Add New Job')) {
        return; 
    }

    const btnText = btn.textContent.trim();
    const btnHtml = btn.innerHTML;

    // معالجة أزرار الإلغاء وإغلاق النوافذ
    if (btnText === 'Cancel' || btn.getAttribute('onclick')?.includes('closeModal') || btn.querySelector('.fa-xmark')) {
        e.preventDefault();
        if (typeof closeModal === 'function') {
            closeModal();
        }
        return;
    }

    // معالجة أزرار إضافة المدفوعات
    const isAddPaymentBtn = btnText.includes('Payment') || btnHtml.includes('Add Payment') || btnText.includes('+ Add');
    
    if (isAddPaymentBtn) {
        e.preventDefault();
        
        const section = btn.closest('.border-t') || btn.closest('div.mb-4') || btn.parentElement;
        let containerId = null;

        if (section) {
            const containerDiv = section.querySelector('div[id$="Container"]');
            if (containerDiv) {
                containerId = containerDiv.id;
            }
        }

        if (!containerId) {
            const rowWrapper = btn.closest('div');
            const rowText = rowWrapper ? rowWrapper.textContent : '';
            if (rowText.includes('P.U')) {
                containerId = 'puContainer';
            } else if (rowText.includes('Destination') || rowText.includes('Balance')) {
                containerId = 'destContainer';
            } else {
                const allAddBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Payment'));
                const btnIndex = allAddBtns.indexOf(btn);
                containerId = (btnIndex === 0) ? 'puContainer' : 'destContainer';
            }
        }

        if (typeof addPaymentRow === 'function' && containerId) {
            addPaymentRow(containerId);
        } else {
            console.error("Target container ID not found or addPaymentRow is missing. Container ID was:", containerId);
        }
    }
});
