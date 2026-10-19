let currentUserRole = 'Admin';
let currentLoggedInUser = null;
let revenueChartInstance = null;
let paymentMixChartInstance = null;

function handleLogin(e) {
    e.preventDefault();
    const nameInput = document.getElementById('loginName').value.trim().toLowerCase();
    const emailInput = document.getElementById('loginEmail').value.trim().toLowerCase();
    const errorDiv = document.getElementById('loginError');

    const matchedUser = systemUsers.find(u => 
        u.name.toLowerCase() === nameInput && u.email.toLowerCase() === emailInput
    );

    if (matchedUser) {
        currentLoggedInUser = matchedUser;
        currentUserRole = matchedUser.role;

        document.getElementById('currentUserNameDisplay').innerText = matchedUser.name;
        document.getElementById('currentUserRoleBadge').innerText = matchedUser.role;
        document.getElementById('activeRoleText').innerText = matchedUser.role;

        const initials = matchedUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        document.getElementById('userAvatarInitials').innerText = initials;

        const loginScreen = document.getElementById('loginScreen');
        loginScreen.classList.add('hidden');

        checkPermissions();
        populateYearFilter();
        filterJobsTable();
        renderUsers();
        updateDashboardAnalytics();
    } else {
        errorDiv.classList.remove('hidden');
    }
}

function logoutSession() {
    currentLoggedInUser = null;
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
}

function populateYearFilter() {
    const yearSelect = document.getElementById('filterYear');
    if (!yearSelect) return;

    const uniqueYears = [...new Set(masterJobs.map(item => item.year))].sort((a, b) => b - a);
    const currentSelected = yearSelect.value;

    yearSelect.innerHTML = uniqueYears.map(year => 
        `<option value="${year}" ${year == currentSelected ? 'selected' : ''}>${year}</option>`
    ).join('');
}

function renderUsers() {
    const container = document.getElementById('usersListContainer');
    if(!container) return;
    container.innerHTML = systemUsers.map(u => `
        <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl border text-xs">
            <div>
                <p class="font-bold text-slate-900 text-sm">${u.name}</p>
                <p class="text-slate-500">${u.email}</p>
            </div>
            <div class="flex items-center space-x-3">
                <select onchange="updateUserRole(${u.id}, this.value)" class="p-2 border rounded-lg font-semibold bg-white" ${currentUserRole !== 'Admin' ? 'disabled' : ''}>
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

// دالة إضافة صف دفعة ديناميكي (مبلغ + طريقة دفع)
function addPaymentRow(containerId, amount = '', method = 'Cash') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const rowId = 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const rowDiv = document.createElement('div');
    rowDiv.id = rowId;
    rowDiv.className = 'flex items-center gap-2 payment-row';

    rowDiv.innerHTML = `
        <input type="text" value="${amount}" placeholder="Amount (e.g. 500)" class="payment-amount flex-1 p-2 border rounded-xl text-xs">
        <select class="payment-method w-28 p-2 border rounded-xl text-xs font-semibold bg-white">
            <option value="Cash" ${method === 'Cash' ? 'selected' : ''}>Cash</option>
            <option value="Zelle" ${method === 'Zelle' ? 'selected' : ''}>Zelle</option>
            <option value="PS" ${method === 'PS' ? 'selected' : ''}>PS</option>
            <option value="BS" ${method === 'BS' ? 'selected' : ''}>BS</option>
            <option value="others" ${method === 'others' ? 'selected' : ''}>others</option>
        </select>
        <button type="button" onclick="removePaymentRow('${rowId}')" class="text-red-500 hover:text-red-700 px-2 font-bold text-sm">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;
    container.appendChild(rowDiv);
}

function removePaymentRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
}

// دالة تجميع واستخراج الدفعات المتعددة بنص واحد منظم
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

function renderJobsCRUD(dataToRender) {
    const tbody = document.getElementById('crudTableBody');
    if(!tbody) return;
    tbody.innerHTML = dataToRender.map((item, index) => {
        const foremanDisplay = (!item.foreman || item.foreman.trim() === '') 
            ? `<span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">no name</span>` 
            : `<span class="bg-slate-100 text-slate-900 px-2.5 py-1 rounded font-bold">${item.foreman}</span>`;
        
        let actions = `<span class="text-slate-400">Restricted</span>`;
        if(currentUserRole === 'Admin') {
            actions = `
                <button onclick="editJob(${index})" class="text-blue-600 hover:text-blue-800 mr-2 font-bold"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteJob(${index})" class="text-red-600 hover:text-red-800 font-bold"><i class="fa-solid fa-trash"></i></button>
            `;
        } else if(currentUserRole === 'Member') {
            actions = `<button onclick="editJob(${index})" class="text-blue-600 hover:text-blue-800 font-bold">Edit Only</button>`;
        }

        return `
            <tr class="hover:bg-slate-50 transition">
                <td class="py-3 px-4 font-mono text-slate-500">${item.date}</td>
                <td class="py-3 px-4 font-bold text-slate-900">${item.jobNo}</td>
                <td class="py-3 px-4 font-semibold text-emerald-700">${item.route}</td>
                <td class="py-3 px-4">${foremanDisplay}</td>
                <td class="py-3 px-4 font-extrabold text-slate-900">${item.total}</td>
                <td class="py-3 px-4 text-slate-600">${item.pu || '-'}</td>
                <td class="py-3 px-4 text-slate-600">${item.dest || '-'}</td>
                <td class="py-3 px-4 text-center">${actions}</td>
            </tr>
        `;
    }).join('');
}

function filterJobsTable() {
    const selectedMonth = document.getElementById('filterMonth').value;
    const selectedYear = document.getElementById('filterYear').value;

    let filtered = masterJobs.filter(item => {
        let matchMonth = (selectedMonth === 'ALL' || item.month == selectedMonth);
        let matchYear = (item.year == selectedYear);
        return matchMonth && matchYear;
    });

    renderJobsCRUD(filtered);
    const countText = document.getElementById('filteredCountText');
    if(countText) {
        countText.innerText = `Showing ${filtered.length} of ${masterJobs.length} records`;
    }
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
    if(currentUserRole === 'Viewer') {
        alert('Access denied: Viewer role cannot add records.');
        return;
    }
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

    // قراءة القيم من الحقلين المنفصلين ودمجهما بالشكل الصحيح
    const fromVal = document.getElementById('routeFrom').value.trim().toUpperCase();
    const toVal = document.getElementById('routeTo').value.trim().toUpperCase();
    const routeVal = `${fromVal} → ${toVal}`;

    const puFormatted = extractPaymentsFromContainer('puContainer');
    const destFormatted = extractPaymentsFromContainer('destContainer');

    // قراءة وتنسيق مصاريف الديزل
    let dieselRaw = document.getElementById('dieselAmount').value.trim();
    if (dieselRaw && !dieselRaw.startsWith('$') && dieselRaw !== '-') {
        let num = parseFloat(dieselRaw.replace(/[^0-9.]/g, ''));
        dieselRaw = isNaN(num) ? dieselRaw : '$' + num.toLocaleString('en-US');
    }
    const dieselFormatted = dieselRaw ? `${dieselRaw} ${document.getElementById('dieselMethod').value}` : '-';

    // قراءة وتنسيق مصاريف الفندق
    let hotelRaw = document.getElementById('hotelAmount').value.trim();
    if (hotelRaw && !hotelRaw.startsWith('$') && hotelRaw !== '-') {
        let num = parseFloat(hotelRaw.replace(/[^0-9.]/g, ''));
        hotelRaw = isNaN(num) ? hotelRaw : '$' + num.toLocaleString('en-US');
    }
    const hotelFormatted = hotelRaw ? `${hotelRaw} ${document.getElementById('hotelMethod').value}` : '-';

    const newJob = {
        date: dateVal,
        month: monthVal,
        year: yearVal,
        jobNo: document.getElementById('jobNo').value.trim(),
        route: routeVal,
        foreman: document.getElementById('jobForeman').value.trim(),
        total: totalRaw,
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
    closeModal();
    populateYearFilter();
    filterJobsTable();
    updateDashboardAnalytics();
}
function editJob(index) {
    if(currentUserRole === 'Viewer') return;
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

    // تفكيك المسار وتوزيعه على الحقلين المنفصلين routeFrom و routeTo
    if (j.route && j.route.includes('→')) {
        const parts = j.route.split('→');
        document.getElementById('routeFrom').value = parts[0].trim();
        document.getElementById('routeTo').value = parts[1].trim();
    } else if (j.route && j.route.includes('-')) {
        const parts = j.route.split('-');
        document.getElementById('routeFrom').value = parts[0].trim();
        document.getElementById('routeTo').value = parts[1].trim();
    } else {
        document.getElementById('routeFrom').value = j.route || '';
        document.getElementById('routeTo').value = '';
    }

    document.getElementById('jobForeman').value = j.foreman;
    document.getElementById('jobTotal').value = j.total;
    
    // تعبئة حقول الديزل
    if (j.diesel && j.diesel !== '-') {
        const parts = j.diesel.trim().split(' ');
        document.getElementById('dieselAmount').value = parts[0] || '';
        if (parts[1]) document.getElementById('dieselMethod').value = parts[1];
    } else {
        document.getElementById('dieselAmount').value = '';
        document.getElementById('dieselMethod').value = 'Cash';
    }

    // تعبئة حقول الفندق
    if (j.hotel && j.hotel !== '-') {
        const parts = j.hotel.trim().split(' ');
        document.getElementById('hotelAmount').value = parts[0] || '';
        if (parts[1]) document.getElementById('hotelMethod').value = parts[1];
    } else {
        document.getElementById('hotelAmount').value = '';
        document.getElementById('hotelMethod').value = 'Cash';
    }

    const puContainer = document.getElementById('puContainer');
    puContainer.innerHTML = '';
    if (j.pu && j.pu !== '-') {
        j.pu.split(',').forEach(p => {
            const trimP = p.trim();
            const lastSpace = trimP.lastIndexOf(' ');
            if (lastSpace !== -1) {
                addPaymentRow('puContainer', trimP.substring(0, lastSpace), trimP.substring(lastSpace + 1));
            } else {
                addPaymentRow('puContainer', trimP, 'Cash');
            }
        });
    } else {
        addPaymentRow('puContainer');
    }

    const destContainer = document.getElementById('destContainer');
    destContainer.innerHTML = '';
    if (j.dest && j.dest !== '-') {
        j.dest.split(',').forEach(d => {
            const trimD = d.trim();
            const lastSpace = trimD.lastIndexOf(' ');
            if (lastSpace !== -1) {
                addPaymentRow('destContainer', trimD.substring(0, lastSpace), trimD.substring(lastSpace + 1));
            } else {
                addPaymentRow('destContainer', trimD, 'Cash');
            }
        });
    } else {
        addPaymentRow('destContainer');
    }

    const modal = document.getElementById('jobModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function deleteJob(index) {
    if(currentUserRole !== 'Admin') {
        alert('Only Admin users can delete records.');
        return;
    }
    if(confirm('Are you sure you want to delete this record permanently?')) {
        masterJobs.splice(index, 1);
        populateYearFilter();
        filterJobsTable();
        updateDashboardAnalytics();
    }
}

// دوال تحليل وإحصاءات الداشبورد الاحترافي
function updateDashboardAnalytics() {
    if (!window.masterJobs || masterJobs.length === 0) return;

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
    ['dashboard', 'jobs', 'users', 'reports'].forEach(t => {
        const tabEl = document.getElementById(`tab-${t}`);
        const navEl = document.getElementById(`nav-${t}`);
        if(tabEl) tabEl.classList.add('hidden');
        if(navEl) navEl.className = 'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition';
    });
    const activeTab = document.getElementById(`tab-${tab}`);
    const activeNav = document.getElementById(`nav-${tab}`);
    if(activeTab) activeTab.classList.remove('hidden');
    if(activeNav) activeNav.className = 'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl bg-emerald-600 text-white font-medium shadow-md transition';

    if (tab === 'dashboard') {
        setTimeout(updateDashboardAnalytics, 100);
    }
}

window.onload = () => {
    renderUsers();
    updateDashboardAnalytics();
};
