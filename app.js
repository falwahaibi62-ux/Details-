let currentUserRole = 'Admin';
let currentLoggedInUser = null;
let revenueChartInstance = null;

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
        populateYearFilter(); // تعبئة السنوات تلقائياً عند تسجيل الدخول
        filterJobsTable();
        renderUsers();
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

// دالة لاستخراج وتعبئة السنوات تلقائياً من قائمة الأجور والعمليات
function populateYearFilter() {
    const yearSelect = document.getElementById('filterYear');
    if (!yearSelect) return;

    // استخراج السنوات الفريدة وترتيبها تنازلياً
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

function updateUserRole(id, newRole) {
    const user = systemUsers.find(u => u.id === id);
    if(user) {
        user.role = newRole;
        if(currentLoggedInUser && currentLoggedInUser.id === id) {
            currentUserRole = newRole;
            document.getElementById('activeRoleText').innerText = newRole;
            document.getElementById('currentUserRoleBadge').innerText = newRole;
            checkPermissions();
        }
        renderUsers();
    }
}

function checkPermissions() {
    const addBtn = document.getElementById('addJobBtn');
    if (currentUserRole === 'Viewer') {
        if(addBtn) addBtn.style.display = 'none';
    } else {
        if(addBtn) addBtn.style.display = 'flex';
    }
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
                <td class="py-3 px-4 text-slate-600">${item.pu}</td>
                <td class="py-3 px-4 text-slate-600">${item.dest}</td>
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

function initDashboardChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    if (revenueChartInstance) revenueChartInstance.destroy();

    revenueChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['May', 'June', 'July', 'August', 'September', 'October'],
            datasets: [{
                label: 'Operations Volume',
                data: [45, 78, 62, 70, 52, 45],
                borderColor: '#059669',
                backgroundColor: 'rgba(5, 150, 105, 0.1)',
                fill: true,
                tension: 0.3,
                borderWidth: 3
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

function openAddModal() {
    if(currentUserRole === 'Viewer') {
        alert('Access denied: Viewer role cannot add records.');
        return;
    }
    document.getElementById('modalTitle').innerText = 'Add New Dispatch';
    document.getElementById('editIndex').value = '-1';
    document.getElementById('jobForm').reset();
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
    const dateVal = document.getElementById('jobDate').value;
    const parts = dateVal.split('/');
    const monthVal = parts.length > 0 ? parseInt(parts[0]) : 5;
    const yearVal = parts.length > 2 ? parseInt(parts[2]) : 2026;

    const newJob = {
        date: dateVal,
        month: monthVal,
        year: yearVal,
        jobNo: document.getElementById('jobNo').value,
        route: document.getElementById('jobRoute').value,
        foreman: document.getElementById('jobForeman').value,
        total: document.getElementById('jobTotal').value,
        pu: 'Cash',
        dest: '-'
    };

    if(index === -1) {
        masterJobs.push(newJob);
    } else {
        masterJobs[index] = newJob;
    }
    closeModal();
    populateYearFilter(); // تحديث قائمة السنوات تلقائياً عند إضافة سنة جديدة
    filterJobsTable();
}

function editJob(index) {
    if(currentUserRole === 'Viewer') return;
    const j = masterJobs[index];
    document.getElementById('modalTitle').innerText = 'Edit Dispatch Record';
    document.getElementById('editIndex').value = index;
    document.getElementById('jobDate').value = j.date;
    document.getElementById('jobNo').value = j.jobNo;
    document.getElementById('jobRoute').value = j.route;
    document.getElementById('jobForeman').value = j.foreman;
    document.getElementById('jobTotal').value = j.total;
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
    }
}

function downloadOfficialPDF() {
    const element = document.getElementById('pdfContentArea');
    html2pdf().from(element).save('MovePro_Audit_Report.pdf');
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
        setTimeout(initDashboardChart, 100);
    }
}

window.onload = () => {
    renderUsers();
};
