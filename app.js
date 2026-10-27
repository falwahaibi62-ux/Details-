/**
 * MovePro - Application Core Logic & Operations (Production Safe & Error Free)
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
// 3. RENDERING CRUD TABLE
// ==========================================
function renderJobsCRUD(dataToRender) {
    const tbody = document.getElementById('crudTableBody');
    if (!tbody) return;
    
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
                <div class="flex items-center space-x-1">
                    <button onclick="editJob('${item.jobNo}')" class="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer" title="Edit Dispatch"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="deleteJob('${item.jobNo}')" class="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;
        }

        return `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
                <td class="p-3 text-slate-700 font-medium">${item.date || '-'}</td>
                <td class="p-3 text-slate-900 font-bold">${item.jobNo || '-'}</td>
                <td class="p-3 text-slate-700">${item.route || '-'}</td>
                <td class="p-3">${foremanDisplay}</td>
                <td class="p-3 text-purple-700 font-semibold">${item.helpers || '-'}</td>
                <td class="p-3 text-blue-700 font-semibold">${item.drivers || '-'}</td> 
                <td class="p-3 text-emerald-600 font-bold">${item.total || '-'}</td>
                <td class="p-3 text-slate-700">${item.pu || '-'}</td>
                <td class="p-3 text-slate-700">${item.dest || '-'}</td>
                <td class="p-3 text-emerald-700 font-semibold">${item.diesel || '-'}</td>
                <td class="p-3 text-indigo-700 font-semibold">${item.hotel || '-'}</td>
                <td class="p-3 text-center">${actions}</td>
            </tr>
        `;
    }).join('');
}
window.renderJobsCRUD = renderJobsCRUD;

// ==========================================
// 4. NAVIGATION & TABS (Fixed & Safe)
// ==========================================
function switchTab(tabName) {
    try {
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

        const activeTab = document.getElementById(`tab-${tabName}`);
        const activeNav = document.getElementById(`nav-${tabName}`);
        
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
        }
    } catch (e) {
        console.error("Error switching tab:", e);
    }
}
window.switchTab = switchTab;

// ==========================================
// 5. DASHBOARD ANALYTICS
// ==========================================
function updateDashboardAnalytics() {
    try {
        initMasterJobsData();
        if (!window.masterJobs || window.masterJobs.length === 0) return;

        let totalRev = 0;
        const routeRevenueMap = {};
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
        });

        const completedJobsCount = window.masterJobs.length;
        const avgJobVal = completedJobsCount > 0 ? (totalRev / completedJobsCount) : 0;

        const revEl = document.getElementById('dashTotalRevenue');
        if (revEl) revEl.innerText = '$' + totalRev.toLocaleString('en-US');

        const jobsTextEl = document.getElementById('dashCompletedJobsText');
        if (jobsTextEl) jobsTextEl.innerHTML = `<i class="fa-solid fa-truck-check mr-1"></i>${completedJobsCount} Active Dispatches`;

        const avgEl = document.getElementById('dashAvgJobValue');
        if (avgEl) avgEl.innerText = '$' + Math.round(avgJobVal).toLocaleString('en-US');
    } catch (e) {
        console.error("Error updating dashboard analytics:", e);
    }
}
window.updateDashboardAnalytics = updateDashboardAnalytics;

// ==========================================
// 6. INITIALIZATION
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    try {
        initMasterJobsData();
        window.currentUserRole = 'Admin';
        
        checkPermissions();
        renderUsers();
        populateYearFilter();
        
        updateDashboardAnalytics();
        switchTab('dashboard');
    } catch (error) {
        console.error("Initialization error on DOMContentLoaded:", error);
    }
});
