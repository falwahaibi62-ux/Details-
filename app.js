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
    rowDiv.className = 'flex items-center gap-2 payment-row'; // <-- أضفنا payment-row هنا
    rowDiv.id = rowId;

    rowDiv.innerHTML = `
        <input type="text" placeholder="Amount (e.g. 500)" value="${amount}" class="flex-1 p-2.5 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 payment-amount">
        
        <select class="w-28 p-2.5 border rounded-xl text-xs font-semibold bg-white focus:outline-none focus:border-emerald-500 payment-method">
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
        
        let actions = `<span class="text-xs text-slate-400">-</span>`;
        if (currentUserRole === 'Admin') {
            actions = `
                <button onclick="editJob('${item.jobNo}')" class="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg mr-1" title="Edit Dispatch"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteJob('${item.jobNo}')" class="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg" title="Move to Recycle Bin"><i class="fa-solid fa-trash-can"></i></button>
            `;
        } else if (currentUserRole === 'Member') {
            actions = `<span class="text-xs text-slate-400">-</span>`; 
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
    // إعادة تعيين نموذج الإدخال إذا وجد
    const form = document.getElementById('jobForm'); // أو اسم الـ ID الخاص بالنموذج لديك
    if (form) form.reset();
    
    const editIndex = document.getElementById('editIndex');
    if (editIndex) editIndex.value = -1;

    // إظهار نافذة الإدخال (Modal)
    const modal = document.getElementById('jobModal'); // أو اسم الـ ID الخاص بالنافذة المنبثقة لديك
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}


function closeModal() {
    const modal = document.getElementById('jobModal');
    if (!modal) return; // <-- حماية إضافية
    modal.classList.remove('flex');
    modal.classList.add('hidden');
}



function saveJob(e) {
    e.preventDefault();

    // 1. التحقق الآمن من مؤشر التعديل لضمان عدم حدوث خطأ NaN
    const editIndexInput = document.getElementById('editIndex');
    const index = editIndexInput ? parseInt(editIndexInput.value) : -1;

    // 2. التحقق من رقم الوظيفة الأساسي
    const jobNoInput = document.getElementById('jobNo');
    if (!jobNoInput || !jobNoInput.value.trim()) {
        alert('الرجاء إدخال رقم الوظيفة (Job Number).');
        if (jobNoInput) jobNoInput.focus();
        return;
    }

    const dateRaw = document.getElementById('jobDate').value;
    let dateVal = dateRaw;
    let monthVal = 5;
    let yearVal = 2026;

    if (dateRaw && dateRaw.includes('-')) {
        const p = dateRaw.split('-');
        yearVal = parseInt(p[0]) || 2026;
        monthVal = parseInt(p[1]) || 5;
        const dayVal = parseInt(p[2]) || 1;
        dateVal = `${monthVal}/${dayVal}/${yearVal}`;
    }

    let totalRaw = document.getElementById('jobTotal') ? document.getElementById('jobTotal').value.trim() : '';
    if (totalRaw && !totalRaw.startsWith('$') && totalRaw !== '-') {
        let num = parseFloat(totalRaw.replace(/[^0-9.]/g, ''));
        totalRaw = isNaN(num) ? totalRaw : '$' + num.toLocaleString('en-US');
    }

    const fromVal = document.getElementById('routeFrom') ? document.getElementById('routeFrom').value.trim().toUpperCase() : '';
    const toVal = document.getElementById('routeTo') ? document.getElementById('routeTo').value.trim().toUpperCase() : '';
    const routeVal = `${fromVal} → ${toVal}`;

    const puFormatted = typeof extractPaymentsFromContainer === 'function' ? extractPaymentsFromContainer('puContainer') : '-';
    const destFormatted = typeof extractPaymentsFromContainer === 'function' ? extractPaymentsFromContainer('destContainer') : '-';

    let dieselRaw = document.getElementById('dieselAmount') ? document.getElementById('dieselAmount').value.trim() : '';
    if (dieselRaw && !dieselRaw.startsWith('$') && dieselRaw !== '-') {
        let num = parseFloat(dieselRaw.replace(/[^0-9.]/g, ''));
        dieselRaw = isNaN(num) ? dieselRaw : '$' + num.toLocaleString('en-US');
    }
    const dieselMethod = document.getElementById('dieselMethod') ? document.getElementById('dieselMethod').value : '';
    const dieselFormatted = dieselRaw ? `${dieselRaw} ${dieselMethod}` : '-';

    let hotelRaw = document.getElementById('hotelAmount') ? document.getElementById('hotelAmount').value.trim() : '';
    if (hotelRaw && !hotelRaw.startsWith('$') && hotelRaw !== '-') {
        let num = parseFloat(hotelRaw.replace(/[^0-9.]/g, ''));
        hotelRaw = isNaN(num) ? hotelRaw : '$' + num.toLocaleString('en-US');
    }
    const hotelMethod = document.getElementById('hotelMethod') ? document.getElementById('hotelMethod').value : '';
    const hotelFormatted = hotelRaw ? `${hotelRaw} ${hotelMethod}` : '-';

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
        jobNo: jobNoInput.value.trim(),
        route: routeVal,
        foreman: document.getElementById('jobForeman') ? document.getElementById('jobForeman').value.trim() : '',
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

    if (!window.masterJobs) window.masterJobs = [];

    if(isNaN(index) || index === -1) {
        window.masterJobs.unshift(newJob); // الإضافة في البداية لتظهر الوظيفة الجديدة مباشرة
    } else {
        window.masterJobs[index] = newJob;
    }

    if (typeof saveMasterJobs === 'function') saveMasterJobs(window.masterJobs);
    if (typeof closeModal === 'function') closeModal();
    if (typeof populateYearFilter === 'function') populateYearFilter();
    if (typeof filterJobsTable === 'function') filterJobsTable();
    if (typeof updateDashboardAnalytics === 'function') updateDashboardAnalytics();
}


function editJob(param) {
    // التحقق مما إذا كان المدخل رقم إرسالية (String) أو مؤشر (Number) وإيجاد الفهرس الصحيح
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

    const modal = document.getElementById('jobModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

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
    // 1. إغلاق أي نافذة منبثقة (Modal) مفتوحة فوراً لمنع تداخل الحالة عند التنقل
    if (typeof closeModal === 'function') {
        closeModal();
    }

    const tabs = ['dashboard', 'jobs', 'users', 'reports', 'trash', 'rentals', 'warehouse'];
    
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

    // التحكم بظهور زر تصدير الـ PDF الرسمي حصرياً في صفحة التقارير ('reports')
    const exportBtn = document.getElementById('exportPdfBtn');
    if (exportBtn) {
        if (tab === 'reports') { 
            exportBtn.classList.remove('hidden');
            exportBtn.classList.add('flex');
        } else {
            exportBtn.classList.add('hidden');
            exportBtn.classList.remove('flex');
        }
    }

    if (tab === 'dashboard') {
        setTimeout(updateDashboardAnalytics, 100);
    } else if (tab === 'jobs') {
        filterJobsTable();
    } else if (tab === 'trash') {
        renderTrashBin();
    } else if (tab === 'rentals') {
        renderPrivateTruckRentalTab();
    } else if (tab === 'warehouse') {
        renderWarehouseTab();
    } else if (tab === 'reports') {
        if (typeof renderReportsTab === 'function') {
            renderReportsTab();
        }
    }
}

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
        masterJobs = loadMasterJobs();
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
    filterJobsTable();
    updateDashboardAnalytics();
    renderTrashBin();

  
    document.addEventListener('click', function(event) {
        const addBtn = event.target.closest('#addJobBtn');
        if (addBtn) {
            event.preventDefault();
            event.stopPropagation();
            
            

            const modal = document.getElementById('jobModal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                modal.style.display = 'none';
                modal.offsetHeight; // إعادة الرسم الفوري
                modal.style.display = 'flex';
            }
        }
    });
};
