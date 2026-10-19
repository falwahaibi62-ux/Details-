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
    const monthVal = document.getElementById('filterMonth')?.value || 'ALL';
    const yearVal = document.getElementById('filterYear')?.value || 'ALL';

    // Filter master jobs array based on month and year matching criteria
    let filtered = masterJobs.filter(job => {
        const matchesMonth = (monthVal === 'ALL') || (job.month && job.month.toString() === monthVal);
        const matchesYear = (yearVal === 'ALL') || (job.year && job.year.toString() === yearVal);
        return matchesMonth && matchesYear;
    });

    // Update the record count display text dynamically
    const countText = document.getElementById('filteredCountText');
    if (countText) {
        countText.innerText = `Showing ${filtered.length} of ${masterJobs.length} records`;
    }

    // Render the filtered records into the CRUD table view
    renderJobsCRUD(filtered);
}
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
    const container = document.getElementById(containerId);
    if (!container) return;

    const rowId = 'payment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

    const rowDiv = document.createElement('div');
    rowDiv.className = 'flex items-center gap-2';
    rowDiv.id = rowId;

    rowDiv.innerHTML = `
        <input type="text" placeholder="Amount (e.g. 500)" value="${amount}" class="flex-1 p-2.5 border rounded-xl text-xs focus:outline-none focus:border-emerald-500">
        
        <select class="w-28 p-2.5 border rounded-xl text-xs font-semibold bg-white focus:outline-none focus:border-emerald-500">
            <option value="Cash" ${method === 'Cash' ? 'selected' : ''}>Cash</option>
            <option value="Zelle" ${method === 'Zelle' ? 'selected' : ''}>Zelle</option>
            <option value="Cheque" ${method === 'Cheque' ? 'selected' : ''}>Cheque</option>
            <option value="PMO" ${method === 'PMO' ? 'selected' : ''}>PMO</option>
            <option value="BC" ${method === 'BC' ? 'selected' : ''}>BC</option>
            <option value="PC" ${method === 'PC' ? 'selected' : ''}>PC</option>
            <option value="CC" ${method === 'CC' ? 'selected' : ''}>CC</option>
            <option value="WT" ${method === 'WT' ? 'selected' : ''}>WT</option>
        </select>

        <button type="button" onclick="document.getElementById('${rowId}').remove()" class="text-red-500 hover:text-red-700 text-sm font-bold px-1">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    container.appendChild(rowDiv);
}
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

// Function to render the jobs CRUD table using unique jobNo for safe actions
function renderJobsCRUD(dataToRender) {
    const tbody = document.getElementById('crudTableBody');
    if(!tbody) return;
    
    tbody.innerHTML = dataToRender.map((item) => {
        const foremanDisplay = (!item.foreman || item.foreman.trim() === '') 
            ? `<span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">no name</span>` 
            : `<span class="bg-slate-100 text-slate-900 px-2.5 py-1 rounded font-bold">${item.foreman}</span>`;
        
        let actions = `<span class="text-slate-400">Restricted</span>`;
        if(currentUserRole === 'Admin') {
            actions = `
                <button onclick="editJob('${item.jobNo}')" class="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg mr-1" title="Edit Dispatch"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteJob('${item.jobNo}')" class="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg" title="Move to Recycle Bin"><i class="fa-solid fa-trash-can"></i></button>
            `;
        } else if(currentUserRole === 'Member') {
            actions = `<button onclick="editJob('${item.jobNo}')" class="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg font-bold" title="Edit Only">Edit Only</button>`;
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
function globalSearchFilter() {
    const query = document.getElementById('globalSearch').value.toLowerCase();
    if (!query) {
        filterJobsTable();
        return;
    }
    let filtered = masterJobs.filter(item => 
        item.jobNo.toLowerCase().includes(query) || 
        item.route.toLowerCase().includes(query) || 
        (item.foreman && item.foreman.toLowerCase().includes(query))
    );
    switchTab('jobs');
    renderJobsCRUD(filtered);
    const countText = document.getElementById('filteredCountText');
    if(countText) {
        countText.innerText = `Search results: ${filtered.length} records`;
    }
}

function openAddModal() {
    document.getElementById('modalTitle').innerText = 'Add New Dispatch';
    document.getElementById('editIndex').value = '-1';
    document.getElementById('jobForm').reset();
    
    document.getElementById('puContainer').innerHTML = '';
    document.getElementById('destContainer').innerHTML = '';
    addPaymentRow('puContainer');
    addPaymentRow('destContainer');

    const modal = document.getElementById('jobModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeModal() {
    const modal = document.getElementById('jobModal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
}

function saveJob(e) {
    e.preventDefault();
    const index = parseInt(document.getElementById('editIndex').value);
    const dateRaw = document.getElementById('jobDate').value;
    
    let dateVal = dateRaw;
    let monthVal = 5;
    let yearVal = 2026;

    if (dateRaw && dateRaw.includes('-')) {
        const p = dateRaw.split('-');
        yearVal = parseInt(p[0]);
        monthVal = parseInt(p[1]);
        const dayVal = parseInt(p[2]);
        dateVal = `${monthVal}/${dayVal}/${yearVal}`;
    }

    let totalRaw = document.getElementById('jobTotal').value.trim();
    if (totalRaw && !totalRaw.startsWith('$') && totalRaw !== '-') {
        let num = parseFloat(totalRaw.replace(/[^0-9.]/g, ''));
        totalRaw = isNaN(num) ? totalRaw : '$' + num.toLocaleString('en-US');
    }

    const fromVal = document.getElementById('routeFrom').value.trim().toUpperCase();
    const toVal = document.getElementById('routeTo').value.trim().toUpperCase();
    const routeVal = `${fromVal} → ${toVal}`;

    const puFormatted = extractPaymentsFromContainer('puContainer');
    const destFormatted = extractPaymentsFromContainer('destContainer');

    let dieselRaw = document.getElementById('dieselAmount').value.trim();
    if (dieselRaw && !dieselRaw.startsWith('$') && dieselRaw !== '-') {
        let num = parseFloat(dieselRaw.replace(/[^0-9.]/g, ''));
        dieselRaw = isNaN(num) ? dieselRaw : '$' + num.toLocaleString('en-US');
    }
    const dieselFormatted = dieselRaw ? `${dieselRaw} ${document.getElementById('dieselMethod').value}` : '-';

    let hotelRaw = document.getElementById('hotelAmount').value.trim();
    if (hotelRaw && !hotelRaw.startsWith('$') && hotelRaw !== '-') {
        let num = parseFloat(hotelRaw.replace(/[^0-9.]/g, ''));
        hotelRaw = isNaN(num) ? hotelRaw : '$' + num.toLocaleString('en-US');
    }
    const hotelFormatted = hotelRaw ? `${hotelRaw} ${document.getElementById('hotelMethod').value}` : '-';

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
    const newJob = {
        date: dateVal,
        month: monthVal,
        year: yearVal,
        jobNo: document.getElementById('jobNo').value.trim(),
        route: routeVal,
        foreman: document.getElementById('jobForeman').value.trim(),
        total: totalRaw,
        helpers: helpersFormatted,       
        helpersNum: helpersCostVal, 
        drivers: driversFormatted,       
        driversNum: driversCostVal,     
        pu: puFormatted,
        dest: destFormatted,
        diesel: dieselFormatted,
        hotel: hotelFormatted
    };

    if(index === -1) {
        masterJobs.push(newJob);
    } else {
        masterJobs[index] = newJob;
    }

    saveMasterJobs(masterJobs);
    closeModal();
    populateYearFilter();
    filterJobsTable();
    updateDashboardAnalytics();
}
function editJob(index) {
    const j = masterJobs[index];
    document.getElementById('modalTitle').innerText = 'Edit Dispatch Record';
    document.getElementById('editIndex').value = index;
    
    if (j.date && j.date.includes('/')) {
        const parts = j.date.split('/');
        if (parts.length === 3) {
            const mm = parts[0].padStart(2, '0');
            const dd = parts[1].padStart(2, '0');
            const yyyy = parts[2];
            document.getElementById('jobDate').value = `${yyyy}-${mm}-${dd}`;
        } else {
            document.getElementById('jobDate').value = j.date;
        }
    } else {
        document.getElementById('jobDate').value = j.date || '';
    }

    document.getElementById('jobNo').value = j.jobNo;

    if (j.route && j.route.includes('→')) {
        const parts = j.route.split('→');
        document.getElementById('routeFrom').value = parts[0].trim();
        document.getElementById('routeTo').value = parts[1].trim();
    } else {
        document.getElementById('routeFrom').value = j.route || '';
        document.getElementById('routeTo').value = '';
    }

    document.getElementById('jobForeman').value = j.foreman;
    document.getElementById('jobTotal').value = j.total;

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

    const modal = document.getElementById('jobModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}
// Function to delete/move a specific dispatch record to the Recycle Bin safely using jobNo
function deleteJob(jobNo) {
    if (!confirm('Are you sure you want to move this dispatch to Recycle Bin?')) return;

    // 1. Find the exact index of the job in the master list
    const jobIndex = masterJobs.findIndex(j => j.jobNo === jobNo);

    if (jobIndex !== -1) {
        // 2. Extract the specific job and push it to the trash bin array
        const deletedJob = masterJobs.splice(jobIndex, 1)[0];
        trashBin.push(deletedJob);

        // 3. Persist the updated state to LocalStorage
        saveMasterJobs(masterJobs);
        saveTrashBin(trashBin);

        // 4. Refresh the UI tables, analytics, and trash bin view
        filterJobsTable();
        updateDashboardAnalytics();
        renderTrashBin();
    }
}

function updateDashboardAnalytics() {
    if (!masterJobs || masterJobs.length === 0) return;

    let totalRev = 0;
    const routeRevenueMap = {};
    const paymentMethodMap = { Cash: 0, Zelle: 0, PS: 0, BS: 0, Others: 0 };
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

        const extractMethods = (text) => {
            if (!text || text === '-') return;
            const lower = text.toLowerCase();
            if (lower.includes('cash')) paymentMethodMap.Cash++;
            else if (lower.includes('zelle')) paymentMethodMap.Zelle++;
            else if (lower.includes('ps')) paymentMethodMap.PS++;
            else if (lower.includes('bs')) paymentMethodMap.BS++;
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

    renderDashboardCharts(monthlyRev, paymentMethodMap);
}

function renderDashboardCharts(monthlyData, paymentData) {
    const ctxRevenue = document.getElementById('revenueChart');
    if (ctxRevenue) {
        if (revenueChartInstance) revenueChartInstance.destroy();
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
        if (paymentMixChartInstance) paymentMixChartInstance.destroy();
        paymentMixChartInstance = new Chart(ctxPayment, {
            type: 'doughnut',
            data: {
                labels: Object.keys(paymentData),
                datasets: [{
                    data: Object.values(paymentData),
                    backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#64748b'],
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

function switchTab(tab) {
    const tabs = ['dashboard', 'jobs', 'users', 'reports', 'trash'];
    
    tabs.forEach(t => {
        const tabEl = document.getElementById(`tab-${t}`);
        const navEl = document.getElementById(`nav-${t}`);
        
        if (tabEl) {
            tabEl.classList.add('hidden'); 
        }
        if (navEl) {
            navEl.className = 'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition';
        }
    });

    const activeTab = document.getElementById(`tab-${tab}`);
    const activeNav = document.getElementById(`nav-${tab}`);
    
    if (activeTab) {
        activeTab.classList.remove('hidden'); 
    }
    if (activeNav) {
        activeNav.className = 'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl bg-emerald-600 text-white font-medium shadow-md transition';
    }

    if (tab === 'dashboard') {
        setTimeout(updateDashboardAnalytics, 100);
    } else if (tab === 'jobs') {
        filterJobsTable(); 
    } else if (tab === 'trash') {
        renderTrashBin();
    }
}

// Function to render the Recycle Bin table view
function renderTrashBin() {
    const tbody = document.getElementById('trashTableBody');
    if (!tbody) return;

    // Ensure trashBin array is initialized
    if (!window.trashBin) window.trashBin = [];

    if (trashBin.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-400">Recycle Bin is empty.</td></tr>`;
        return;
    }

    tbody.innerHTML = trashBin.map((item, index) => `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
            <td class="p-3 text-slate-700 font-medium text-xs">${item.date || '-'}</td>
            <td class="p-3 text-slate-700 font-bold text-xs">${item.jobNo || '-'}</td>
            <td class="p-3 text-slate-600 text-xs">${item.route || '-'}</td>
            <td class="p-3 text-xs">${item.foreman || 'no name'}</td>
            <td class="p-3 text-purple-700 font-semibold text-xs">${item.helpers || '-'}</td>
            <td class="p-3 text-blue-700 font-semibold text-xs">${item.drivers || '-'}</td>
            <td class="p-3 text-emerald-600 font-bold text-xs">${item.total || '-'}</td>
            <td class="p-3 text-center space-x-2">
                <button onclick="restoreJob(${index})" class="px-2.5 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold" title="Restore">
                    <i class="fa-solid fa-rotate-left"></i> Restore
                </button>
                <button onclick="permanentDeleteJob(${index})" class="px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold" title="Delete Permanently">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// Function to restore a job from Recycle Bin back to master jobs ledger
function restoreJob(index) {
    if (!window.trashBin) window.trashBin = [];
    if (!window.masterJobs) window.masterJobs = [];

    const restoredItem = trashBin.splice(index, 1)[0];
    if (restoredItem) {
        masterJobs.push(restoredItem);

        // Save states securely
        if (typeof saveMasterJobs === 'function') saveMasterJobs(masterJobs);
        if (typeof saveTrashBin === 'function') saveTrashBin(trashBin);

        // Refresh UI views
        filterJobsTable();
        updateDashboardAnalytics();
        renderTrashBin();
    }
}

// Function to permanently delete a single record from the Recycle Bin
function permanentDeleteJob(index) {
    if (!window.trashBin) window.trashBin = [];

    if (confirm('Are you sure you want to permanently delete this record? This action cannot be undone.')) {
        trashBin.splice(index, 1);
        if (typeof saveTrashBin === 'function') {
            saveTrashBin(trashBin);
        } else {
            localStorage.setItem('trashBin', JSON.stringify(trashBin));
        }
        renderTrashBin();
    }
}

// Function to empty the entire Recycle Bin
function emptyTrashBin() {
    if (!window.trashBin) window.trashBin = [];

    if (confirm('Are you sure you want to empty the Recycle Bin? All items will be permanently deleted.')) {
        trashBin = [];
        if (typeof saveTrashBin === 'function') {
            saveTrashBin(trashBin);
        } else {
            localStorage.setItem('trashBin', JSON.stringify(trashBin));
        }
        renderTrashBin();
    }
}

window.onload = () => {
    if (typeof loadMasterJobs === 'function') {
        masterJobs = loadMasterJobs();
    }
    currentUserRole = 'Admin';
    checkPermissions();
    renderUsers();
    populateYearFilter();
    filterJobsTable();
    updateDashboardAnalytics();
    renderTrashBin();
};
