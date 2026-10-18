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
        populateYearFilter();
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
    
    // Clear dynamic containers and add one default row each
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
    const dateVal = document.getElementById('jobDate').value;
    const parts = dateVal.split('/');
    const monthVal = parts.length > 0 ? parseInt(parts[0]) : 5;
    const yearVal = parts.length > 2 ? parseInt(parts[2]) : 2026;

    let totalRaw = document.getElementById('jobTotal').value.trim();
    if (totalRaw && !totalRaw.startsWith('$') && totalRaw !== '-') {
        let num = parseFloat(totalRaw.replace(/[^0-9.]/g, ''));
        totalRaw = isNaN(num) ? totalRaw : '$' + num.toLocaleString('en-US');
    }

    let routeRaw = document.getElementById('jobRoute').value.trim().toUpperCase();
    if (routeRaw.includes(' ')) {
        routeRaw = routeRaw.replace(/\s+/g, ' ').replace(' TO ', ' → ').replace(' - ', ' → ');
    }

    const puFormatted = extractPaymentsFromContainer('puContainer');
    const destFormatted = extractPaymentsFromContainer('destContainer');

    const newJob = {
        date: dateVal,
        month: monthVal,
        year: yearVal,
        jobNo: document.getElementById('jobNo').value.trim(),
        route: routeRaw,
        foreman: document.getElementById('jobForeman').value.trim(),
        total: totalRaw,
        pu: puFormatted,
        dest: destFormatted
    };

    if(index === -1) {
        masterJobs.push(newJob);
    } else {
        masterJobs[index] = newJob;
    }
    closeModal();
    populateYearFilter();
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
    
    // Clear & Populate PU Container
    const puContainer = document.getElementById('puContainer');
    puContainer.innerHTML = '';
    if (j.pu && j.pu !== '-') {
        const puParts = j.pu.split(',');
        puParts.forEach(p => {
            const trimP = p.trim();
            const lastSpace = trimP.lastIndexOf(' ');
            if (lastSpace !== -1) {
                const amt = trimP.substring(0, lastSpace);
                const mth = trimP.substring(lastSpace + 1);
                addPaymentRow('puContainer', amt, mth);
            } else {
                addPaymentRow('puContainer', trimP, 'Cash');
            }
        });
    } else {
        addPaymentRow('puContainer');
    }

    // Clear & Populate Dest Container
    const destContainer = document.getElementById('destContainer');
    destContainer.innerHTML = '';
    if (j.dest && j.dest !== '-') {
        const destParts = j.dest.split(',');
        destParts.forEach(d => {
            const trimD = d.trim();
            const lastSpace = trimD.lastIndexOf(' ');
            if (lastSpace !== -1) {
                const amt = trimD.substring(0, lastSpace);
                const mth = trimD.substring(lastSpace + 1);
                addPaymentRow('destContainer', amt, mth);
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
}

window.onload = () => {
    renderUsers();
};
