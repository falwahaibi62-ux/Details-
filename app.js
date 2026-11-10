/**
 * MovePro - Core Application & Operations Management (Production Ready & Cleaned)
 */

if (typeof window.currentUserRole === 'undefined') window.currentUserRole = 'Admin';
if (typeof window.currentLoggedInUser === 'undefined') window.currentLoggedInUser = null;
if (typeof window.revenueChartInstance === 'undefined') window.revenueChartInstance = null;
if (typeof window.paymentMixChartInstance === 'undefined') window.paymentMixChartInstance = null;

// ==========================================
// 1. DATA INITIALIZATION & SUPABASE CLOUD SYNC
// ==========================================

// The users list is loaded from the user_role table (see fetchUsersFromSupabase)
if (typeof window.systemUsers === 'undefined') {
    window.systemUsers = [];
}

// Escapes text before it is placed inside HTML
function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}
window.escapeHtml = escapeHtml;

async function loadDataFromSupabase() {
    const { data, error } = await supabase.from('jobs_report').select('*');
    
    if (!error && data) {
        window.masterJobs = data; 
        window.currentFilteredJobs = data; 
        
        if (typeof populateSummaryTables === 'function') {
            populateSummaryTables(data);
        }
        
        if (typeof generateSummaryReportData === 'function') {
            generateSummaryReportData();
        }
    }
}

function formatJobDateForInput(dateStr) {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        let month = parts[0].padStart(2, '0');
        let day = parts[1].padStart(2, '0');
        let year = parts[2];
        return `${year}-${month}-${day}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return dateStr;
}
window.formatJobDateForInput = formatJobDateForInput;

function formatJobDateToSlash(dateStr) {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, mon, day] = dateStr.split('-');
        return `${parseInt(mon, 10)}/${parseInt(day, 10)}/${year}`;
    }
    return dateStr;
}
window.formatJobDateToSlash = formatJobDateToSlash;

// ==========================================
// 2. دالة فلترة جدول العمليات (Operations Ledger)
// ==========================================
function filterLedgerTable() {
    const fromInput = document.getElementById('ledgerFromDate') || 
                      document.getElementById('reportStartDate') || 
                      document.getElementById('filterStartDate') || 
                      document.getElementById('fromDate');
                      
    const toInput = document.getElementById('ledgerToDate') || 
                    document.getElementById('reportEndDate') || 
                    document.getElementById('filterEndDate') || 
                    document.getElementById('toDate');
    
    const fromVal = fromInput ? fromInput.value : '';
    const toVal = toInput ? toInput.value : '';

    let data = window.masterJobs || [];

    function parseDateObj(dateStr, isEndDate = false) {
        if (!dateStr) return null;
        
        let y, m, d;
        const cleanStr = String(dateStr).trim().split(' ')[0];

        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
            const parts = cleanStr.split('-').map(Number);
            y = parts[0]; m = parts[1]; d = parts[2];
        } 
        else if (cleanStr.includes('-') || cleanStr.includes('/')) {
            const separator = cleanStr.includes('-') ? '-' : '/';
            const parts = cleanStr.split(separator).map(Number);
            if (parts.length === 3) {
                if (parts[0] > 1000) {
                    y = parts[0]; m = parts[1]; d = parts[2];
                } 
                else {
                    y = parts[2];
                    if (parts[0] > 12) {
                        d = parts[0]; m = parts[1];
                    } else {
                        m = parts[0]; d = parts[1];
                    }
                }
            }
        }

        if (y && m && d) {
            return isEndDate 
                ? new Date(y, m - 1, d, 23, 59, 59, 999) 
                : new Date(y, m - 1, d, 0, 0, 0, 0);
        }

        const dObj = new Date(dateStr);
        if (isNaN(dObj.getTime())) return null;
        return isEndDate 
            ? new Date(dObj.getFullYear(), dObj.getMonth(), dObj.getDate(), 23, 59, 59, 999) 
            : new Date(dObj.getFullYear(), dObj.getMonth(), dObj.getDate(), 0, 0, 0, 0);
    }

    const fDate = parseDateObj(fromVal, false);
    const tDate = parseDateObj(toVal, true);

    data = data.filter(item => {
        if (!item.date) return false;
        const itemDate = parseDateObj(item.date, false);
        if (!itemDate) return false;
        
        if (fDate && itemDate < fDate) return false;
        if (tDate && itemDate > tDate) return false;
        
        return true;
    });

    window.currentFilteredJobs = data;

    if (typeof renderTable === 'function') {
        renderTable(data);
    }

    const summaryContainer = document.getElementById('paymentSummaryContainer');
    if (summaryContainer && typeof window.generatePaymentMethodSummaryTableHTML === 'function') {
        summaryContainer.innerHTML = window.generatePaymentMethodSummaryTableHTML();
    }

    const totalMasterCount = (window.masterJobs || []).length;
    const counterEl = document.getElementById('filteredCountText') || document.getElementById('ledgerCounter');
    
    if (counterEl) {
        counterEl.innerText = `Showing ${data.length} of ${totalMasterCount} records`;
    }
}

window.filterLedgerTable = filterLedgerTable;
window.filterJobsTable = filterLedgerTable;

document.addEventListener('DOMContentLoaded', () => {
    const fromInput = document.getElementById('filterStartDate') || document.getElementById('fromDate') || document.getElementById('ledgerFromDate');
    const toInput = document.getElementById('filterEndDate') || document.getElementById('toDate') || document.getElementById('ledgerToDate');

    if (fromInput && !fromInput.hasAttribute('data-filter-bound')) {
        fromInput.setAttribute('data-filter-bound', 'true');
        fromInput.addEventListener('change', () => filterLedgerTable());
    }
    if (toInput && !toInput.hasAttribute('data-filter-bound')) {
        toInput.setAttribute('data-filter-bound', 'true');
        toInput.addEventListener('change', () => filterLedgerTable());
    }
});

function getFilteredJobsData() {
    return window.currentFilteredJobs || window.masterJobs || [];
}
window.getFilteredJobsData = getFilteredJobsData;

function formatDateOnly(dateStr) {
    if (!dateStr) return '-';
    return String(dateStr).trim().split(' ')[0];
}
window.formatDateOnly = formatDateOnly;

function assignPaymentMethodRevenue(paymentStr, amount, paymentMethodMap) {
    if (!paymentStr) {
        paymentMethodMap.Unspecified = (paymentMethodMap.Unspecified || 0) + amount;
        return;
    }
    const lower = paymentStr.toLowerCase();
    if (lower.includes('cash')) paymentMethodMap.Cash = (paymentMethodMap.Cash || 0) + amount;
    else if (lower.includes('zelle')) paymentMethodMap.Zelle = (paymentMethodMap.Zelle || 0) + amount;
    else if (lower.includes('cheque') || lower.includes('check') || lower.includes('ck')) paymentMethodMap.Cheque = (paymentMethodMap.Cheque || 0) + amount;
    else if (lower.includes('pmo')) paymentMethodMap.PMO = (paymentMethodMap.PMO || 0) + amount;
    else if (lower.includes('bc')) paymentMethodMap.BC = (paymentMethodMap.BC || 0) + amount;
    else if (lower.includes('pc')) paymentMethodMap.PC = (paymentMethodMap.PC || 0) + amount;
    else if (lower.includes('cc')) paymentMethodMap.CC = (paymentMethodMap.CC || 0) + amount;
    else if (lower.includes('wt')) paymentMethodMap.WT = (paymentMethodMap.WT || 0) + amount;
    else if (lower.includes('other')) paymentMethodMap.Others = (paymentMethodMap.Others || 0) + amount;
    else paymentMethodMap.Unspecified = (paymentMethodMap.Unspecified || 0) + amount;
}
window.assignPaymentMethodRevenue = assignPaymentMethodRevenue;

async function initMasterJobsData() {
    try {
        if (!window.supabaseClient) {
            console.error("❌ Supabase client is not initialized!");
            window.masterJobs = [];
            return;
        }

        const { data: jobsData, error } = await window.supabaseClient
            .from('jobs_report')
            .select('*')
            .or('is_deleted.is.null,is_deleted.eq.false')
            .order('id', { ascending: false });

        if (error) {
            console.error("Supabase Error:", error);
            window.masterJobs = [];
            return;
        }

        window.masterJobs = (jobsData || []).map(item => {
            let rawDate = item.date || '';
            let dVal = rawDate ? String(rawDate).trim().split(' ')[0] : '';
            let mVal = 1;
            let yVal = new Date().getFullYear();

            if (dVal) {
                const parts = dVal.split('/');
                if (parts.length === 3) {
                    mVal = parseInt(parts[0]) || 1;
                    yVal = parseInt(parts[2]) || yVal;
                } else if (dVal.includes('-')) {
                    const dashParts = dVal.split('-');
                    if (dashParts.length === 3) {
                        yVal = parseInt(dashParts[0]) || yVal;
                        mVal = parseInt(dashParts[1]) || 1;
                    }
                }
            }

            const foremanVal = item.foreman_name || '';

            return {
                id: item.id,
                date: dVal,
                month: mVal,
                year: yVal,
                jobNo: item.job_no || item.jobNo || item.job_number || '',
                job_no: item.job_no || '',
                route: item.route || ((item.route_from && item.route_to) ? `${item.route_from} → ${item.route_to}` : ''),
                route_from: item.route_from || '',
                route_to: item.route_to || '',
                foreman: foremanVal,
                foremanName: foremanVal,
                foreman_name: foremanVal,
                foreman10pct: item.foreman_cost || '0',
                foreman_cost: item.foreman_cost || '0',
                total: item.total_amount || '$0',
                total_amount: item.total_amount || '$0',
                helpers: item.helpers_cost || '-',
                helpers_cost: item.helpers_cost || '-',
                drivers: item.drivers_cost || '-',
                drivers_cost: item.drivers_cost || '-',
                pu: item.pu_payments || '-',
                pu_payments: item.pu_payments || '-',
                dest: item.destination_payments || '-',
                destination: item.destination_payments || '-',
                destination_payments: item.destination_payments || '-',
                diesel: item.diesel_expense || '-',
                diesel_expense: item.diesel_expense || '-',
                hotel: item.hotel_expense || '-',
                hotel_expense: item.hotel_expense || '-',
                storage: item.storage || '-'
            };
        });

        window.masterJobs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        window.currentFilteredJobs = window.masterJobs;

        if (typeof populateYearFilter === 'function') populateYearFilter();
        
        // 🌟 التعديل الحاسم: التأكد من إظهار البيانات في الجدول مباشرة بشكل افتراضي
        if (typeof renderTable === 'function') {
            renderTable(window.masterJobs);
        } else if (typeof filterLedgerTable === 'function') {
            filterLedgerTable();
        }

        const summaryContainer = document.getElementById('paymentSummaryContainer');
        if (summaryContainer && typeof generatePaymentMethodSummaryTableHTML === 'function') {
            summaryContainer.innerHTML = generatePaymentMethodSummaryTableHTML();
        }

        if (typeof updateDashboardAnalytics === 'function') updateDashboardAnalytics();

    } catch (e) {
        console.error("Error in initMasterJobsData:", e);
        window.masterJobs = [];
    }
}
window.initMasterJobsData = initMasterJobsData;

async function saveMasterJobsData(jobs) {
    window.masterJobs = jobs;
    filterLedgerTable();
    if (typeof updateDashboardAnalytics === 'function') {
        updateDashboardAnalytics();
    }
}
window.saveMasterJobsData = saveMasterJobsData;

function populateYearFilter() {
    const yearSelect = document.getElementById('filterYear');
    if (!yearSelect) return;

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
// 3. CRUD TABLE & FILTERING
// ==========================================
function filterJobsTable() {
    const startInput = document.getElementById('ledgerFromDate') || document.getElementById('filterStartDate') || document.getElementById('fromDate');
    const endInput = document.getElementById('ledgerToDate') || document.getElementById('filterEndDate') || document.getElementById('toDate');

    const startValStr = startInput ? startInput.value : '';
    const endValStr = endInput ? endInput.value : '';

    const rawData = window.masterJobs || window.allJobsData || [];

    function parseDateObj(dateStr, isEndDate = false) {
        if (!dateStr) return null;
        const cleanStr = String(dateStr).trim().split(' ')[0];
        let y = 0, m = 0, d = 0;

        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
            const parts = cleanStr.split('-').map(Number);
            y = parts[0]; m = parts[1]; d = parts[2];
        } else if (cleanStr.includes('-') || cleanStr.includes('/')) {
            const separator = cleanStr.includes('-') ? '-' : '/';
            const parts = cleanStr.split(separator).map(Number);
            if (parts.length === 3) {
                if (parts[0] > 1000) {
                    y = parts[0]; m = parts[1]; d = parts[2];
                } else {
                    y = parts[2];
                    if (parts[0] > 12) {
                        d = parts[0]; m = parts[1];
                    } else {
                        m = parts[0]; d = parts[1];
                    }
                }
            }
        }

        if (y && m && d) {
            return isEndDate 
                ? new Date(y, m - 1, d, 23, 59, 59, 999) 
                : new Date(y, m - 1, d, 0, 0, 0, 0);
        }

        const dObj = new Date(dateStr);
        if (isNaN(dObj.getTime())) return null;
        return isEndDate 
            ? new Date(dObj.getFullYear(), dObj.getMonth(), dObj.getDate(), 23, 59, 59, 999) 
            : new Date(dObj.getFullYear(), dObj.getMonth(), dObj.getDate(), 0, 0, 0, 0);
    }

    const fDate = parseDateObj(startValStr, false);
    const tDate = parseDateObj(endValStr, true);

    const filtered = rawData.filter(item => {
        const itemDateStr = item.date || item.created_at;
        if (!itemDateStr) return false;

        const itemDate = parseDateObj(itemDateStr, false);
        if (!itemDate) return false;

        if (fDate && itemDate < fDate) return false;
        if (tDate && itemDate > tDate) return false;

        return true;
    });

    window.currentFilteredJobs = (!startValStr && !endValStr) ? rawData : filtered;
    const activeDisplayData = window.currentFilteredJobs;

    if (typeof renderTable === 'function') {
        renderTable(activeDisplayData);
    }
    
    const countEl = document.getElementById('filteredCountText') || document.getElementById('ledgerCounter');
    if (countEl) {
        const totalMasterCount = (window.masterJobs || []).length;
        countEl.innerText = `Showing ${activeDisplayData.length} of ${totalMasterCount} records`;
    }

    const summaryContainer = document.getElementById('paymentSummaryContainer');
    if (summaryContainer && typeof window.generatePaymentMethodSummaryTableHTML === 'function') {
        summaryContainer.innerHTML = window.generatePaymentMethodSummaryTableHTML();
    }
}

window.filterJobsTable = filterJobsTable;
window.filterLedgerTable = filterJobsTable;

// Reset button of the Jobs page: clears the two dates and shows all records
function resetDateFilter() {
    ['ledgerFromDate', 'ledgerToDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    filterJobsTable();
}
window.resetDateFilter = resetDateFilter;

// ==========================================
// 4. USERS & PERMISSIONS MANAGEMENT
// ==========================================
async function fetchUsersFromSupabase() {
    if (typeof supabaseClient === 'undefined') return;

    try {
        const { data, error } = await supabaseClient
            .from('user_role')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.error("Error fetching users:", error.message);
            return;
        }

        window.systemUsers = data || [];
        if (typeof renderUsers === 'function') renderUsers();
    } catch (err) {
        console.error("Error fetching users:", err);
    }
}
window.fetchUsersFromSupabase = fetchUsersFromSupabase;

function renderUsers() {
    const container = document.getElementById('usersListContainer');
    if (!container) return;
    
    if (typeof window.systemUsers === 'undefined') {
        window.systemUsers = [];
    }

    let html = `
        <div class="flex justify-between items-center pb-4 mb-3 border-b border-slate-100 px-2">
            <div>
                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">User Profile & Credentials</span>
            </div>
            <div class="flex items-center gap-3">
                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Access Controls</span>
                <button id="addUserBtn" onclick="openAddUserModal()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer">
                    <i class="fa-solid fa-user-plus text-[10px]"></i> Add User
                </button>
            </div>
        </div>
        <div class="space-y-3">
    `;

    if (window.systemUsers.length === 0) {
        html += `<div class="p-6 text-center text-slate-400 text-xs">No users found in database. Click "Add User" to create one.</div>`;
    } else {
        html += window.systemUsers.map((u) => {
            const userStatus = u.status || 'enable';
            let roleBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            let roleIcon = 'fa-user-shield';
            
            if (u.role === 'Member') {
                roleBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                roleIcon = 'fa-user-tie';
            } else if (u.role === 'Viewer') {
                roleBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                roleIcon = 'fa-eye';
            }

            if (userStatus === 'disable') {
                roleBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                roleIcon = 'fa-user-slash';
            }

            return `
                <div class="flex items-center justify-between p-4 bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl rounded-2xl hover:border-emerald-500/50 transition-all group">
                    <div class="flex items-center space-x-3.5">
                        <div class="w-11 h-11 rounded-xl ${roleBadgeColor} border flex items-center justify-center font-bold text-sm shadow-2xs">
                            <i class="fa-solid ${roleIcon}"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">${escapeHtml(u.name)}</h4>
                            <p class="text-xs text-slate-400 font-medium">${escapeHtml(u.email)}</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center space-x-2">
                        <div class="relative">
                            <select onchange="updateUserField(${u.id}, 'role', this.value)" class="appearance-none bg-slate-50/80 border border-slate-200/60 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:border-emerald-500 transition cursor-pointer">
                                <option value="Admin" ${u.role === 'Admin' ? 'selected' : ''}>🛡️ Admin</option>
                                <option value="Member" ${u.role === 'Member' ? 'selected' : ''}>💼 Member</option>
                                <option value="Viewer" ${u.role === 'Viewer' ? 'selected' : ''}>👁️ Viewer</option>
                            </select>
                        </div>

                        <div class="relative">
                            <select onchange="updateUserField(${u.id}, 'status', this.value)" class="appearance-none border text-xs font-bold rounded-xl px-3 py-2.5 pr-8 focus:outline-none transition cursor-pointer ${userStatus === 'disable' ? 'bg-rose-50/80 border-rose-200 text-rose-700' : 'bg-emerald-50/80 border-emerald-200 text-emerald-700'}">
                                <option value="enable" ${userStatus === 'enable' ? 'selected' : ''}>🟢 Enable</option>
                                <option value="disable" ${userStatus === 'disable' ? 'selected' : ''}>🔴 Disable</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    html += `</div>`;
    container.innerHTML = html;
    
    if (typeof checkPermissions === 'function') checkPermissions();
}
window.renderUsers = renderUsers;

async function openAddUserModal() {
    const userName = prompt("Enter new user name:");
    if (!userName) return;
    
    const userEmail = prompt("Enter user email address:");
    if (!userEmail) return;

    const roleInput = prompt("Enter user role (Admin, Member, Viewer):", "Member");
    if (!roleInput) return;
    const userRole = ['Admin', 'Member', 'Viewer'].find(r => r.toLowerCase() === roleInput.trim().toLowerCase());
    if (!userRole) {
        alert('Role must be Admin, Member or Viewer.');
        return;
    }

    if (typeof supabaseClient === 'undefined') return;

    try {
        const { error } = await supabaseClient
            .from('user_role')
            .insert([{ name: userName, email: userEmail, role: userRole, status: 'enable' }]);

        if (error) alert('Failed to add user: ' + error.message);
        else fetchUsersFromSupabase();
    } catch (err) {
        console.error("Error adding user:", err);
    }
}
window.openAddUserModal = openAddUserModal;

async function updateUserField(userId, fieldName, fieldValue) {
    if (typeof supabaseClient === 'undefined') return;

    try {
        const updateData = {};
        updateData[fieldName] = fieldValue;

        const { error } = await supabaseClient
            .from('user_role')
            .update(updateData)
            .eq('id', userId);

        if (error) alert('Failed to update user: ' + error.message);
        else fetchUsersFromSupabase();
    } catch (err) {
        console.error("Error updating user field:", err);
    }
}
window.updateUserField = updateUserField;

function checkPermissions() {
    const addJobBtn = document.getElementById('addJobBtn');
    const addUserBtn = document.getElementById('addUserBtn');
    const editButtons = document.querySelectorAll('.edit-action-btn, .btn-edit');
    const deleteButtons = document.querySelectorAll('.delete-action-btn, .btn-danger');

    const currentRole = window.currentUserRole || 'Viewer';

    if (currentRole === 'Viewer') {
        if (addJobBtn) addJobBtn.style.display = 'none';
        if (addUserBtn) addUserBtn.style.display = 'none';
        editButtons.forEach(btn => btn.style.display = 'none');
        deleteButtons.forEach(btn => btn.style.display = 'none');
    } else if (currentRole === 'Member') {
        if (addJobBtn) addJobBtn.style.display = 'flex';
        if (addUserBtn) addUserBtn.style.display = 'flex';
        editButtons.forEach(btn => { btn.style.display = 'none'; btn.disabled = true; });
        deleteButtons.forEach(btn => { btn.style.display = 'none'; btn.disabled = true; });
    } else {
        if (addJobBtn) addJobBtn.style.display = 'flex';
        if (addUserBtn) addUserBtn.style.display = 'flex';
        editButtons.forEach(btn => { btn.style.display = ''; btn.disabled = false; });
        deleteButtons.forEach(btn => { btn.style.display = ''; btn.disabled = false; });
    }
}
window.checkPermissions = checkPermissions;

// ==========================================
// 5. PAYMENT & EXPENSES MANAGEMENT
// ==========================================
function formatToUSDate(dateInput) {
    if (!dateInput) return '';
    let dateObj = new Date(dateInput);
    if (isNaN(dateObj.getTime())) {
        const str = String(dateInput).trim();
        let parts = str.includes('/') ? str.split('/') : (str.includes('-') ? str.split('-') : []);
        if (parts.length === 3) {
            let year = parts[0].length === 4 ? parts[0] : parts[2];
            let month = parts[0].length === 4 ? parts[1] : parts[1];
            let day = parts[0].length === 4 ? parts[2] : parts[0];
            dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
            return str;
        }
    }
    if (isNaN(dateObj.getTime())) return dateInput;
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const yyyy = dateObj.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
}
window.formatToUSDate = formatToUSDate;

function addCustomExpenseField() {
    const container = document.getElementById('dynamic-expenses-container');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 pt-2';
    div.innerHTML = `
        <input type="text" placeholder="Expense Name" class="w-1/3 p-2.5 border rounded-xl text-xs focus:outline-none focus:border-emerald-500">
        <input type="text" placeholder="Amount" class="flex-1 p-2.5 border rounded-xl text-xs focus:outline-none focus:border-emerald-500">
        <select class="w-28 p-2.5 border rounded-xl text-xs font-semibold bg-white">
            <option value="Unspecified" selected>Unspecified</option>
            <option value="Cash">Cash</option>
            <option value="Zelle">Zelle</option>
            <option value="Diesel">Diesel</option>
            <option value="Oil">Oil</option>
            <option value="Penske">Penske</option>
            <option value="Dif">Dif</option>
            <option value="Others">Others</option>
        </select>
        <button type="button" onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700 px-2 font-bold text-sm">×</button>
    `;
    container.appendChild(div);
}

window.addDieselEntryField = function(amount = '', method = 'Unspecified') {
    const container = document.getElementById('diesel-entries-container');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 diesel-row pt-2';
    div.innerHTML = `
        <input type="text" placeholder="Amount" class="flex-1 p-2.5 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 diesel-amount" value="${escapeHtml(amount)}">
        <select class="w-28 p-2.5 border rounded-xl text-xs font-semibold bg-white diesel-method">
            <option value="Unspecified" ${method === 'Unspecified' ? 'selected' : ''}>Unspecified</option>
            <option value="Cash" ${method === 'Cash' ? 'selected' : ''}>Cash</option>
            <option value="Zelle" ${method === 'Zelle' ? 'selected' : ''}>Zelle</option>
            <option value="Diesel" ${method === 'Diesel' ? 'selected' : ''}>Diesel</option>
            <option value="Oil" ${method === 'Oil' ? 'selected' : ''}>Oil</option>
            <option value="Penske" ${method === 'Penske' ? 'selected' : ''}>Penske</option>
            <option value="Dif" ${method === 'Dif' ? 'selected' : ''}>Dif</option>
            <option value="Others" ${method === 'Others' ? 'selected' : ''}>Others</option>
        </select>
        <button type="button" onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700 px-2 font-bold text-sm">×</button>
    `;
    container.appendChild(div);
};

function collectDieselDataForSave() {
    const rows = document.querySelectorAll('#diesel-entries-container .diesel-row');
    let entries = [];
    rows.forEach(row => {
        const amount = row.querySelector('.diesel-amount').value.trim();
        const method = row.querySelector('.diesel-method').value;
        if (amount) entries.push(`${amount} ${method}`);
    });
    return entries.join(' + ');
}
window.collectDieselDataForSave = collectDieselDataForSave;

function addPaymentRow(containerId, amount = '', method = '') {
    let container = document.getElementById(containerId);
    if (!container && containerId === 'destContextContainer') container = document.getElementById('destContainer');
    if (!container && containerId === 'destContainer') container = document.getElementById('destContextContainer');
    if (!container) return;

    const safeMethod = (method || '').toString().toLowerCase();
    const safeAmount = (amount || '').toString();
    const rowId = 'payment_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const rowDiv = document.createElement('div');
    rowDiv.className = 'flex items-center gap-2 payment-row mt-2';
    rowDiv.id = rowId;

    rowDiv.innerHTML = `
        <input type="text" placeholder="Amount (e.g. 500)" value="${escapeHtml(safeAmount)}" class="flex-1 p-2.5 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 payment-amount">
        <select class="w-32 p-2.5 border rounded-xl text-xs font-semibold bg-white focus:outline-none focus:border-emerald-500 payment-method">
            <option value="" ${safeMethod === '' || safeMethod === 'unspecified' ? 'selected' : ''}>Unspecified</option>
            <option value="Cash" ${safeMethod === 'cash' ? 'selected' : ''}>Cash</option>
            <option value="Zelle" ${safeMethod === 'zelle' ? 'selected' : ''}>Zelle</option>
            <option value="Cheque" ${['cheque', 'ck', 'check'].includes(safeMethod) ? 'selected' : ''}>Cheque</option>
            <option value="PMO" ${safeMethod === 'pmo' ? 'selected' : ''}>PMO</option>
            <option value="BC" ${safeMethod === 'bc' ? 'selected' : ''}>BC</option>
            <option value="PC" ${safeMethod === 'pc' ? 'selected' : ''}>PC</option>
            <option value="CC" ${safeMethod === 'cc' ? 'selected' : ''}>CC</option>
            <option value="WT" ${safeMethod === 'wt' ? 'selected' : ''}>WT</option>
            <option value="Others" ${['others', 'other'].includes(safeMethod) ? 'selected' : ''}>Others</option>
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
        const amountInput = row.querySelector('.payment-amount');
        const methodSelect = row.querySelector('.payment-method');
        const amount = amountInput ? amountInput.value.trim() : '';
        let method = methodSelect ? methodSelect.value.trim() : 'unspecified';
        if (amount) paymentsList.push(`${amount} ${method}`);
    });
    return paymentsList.length > 0 ? paymentsList.join(', ') : '-';
}
window.extractPaymentsFromContainer = extractPaymentsFromContainer;

// ==========================================
// 6. HELPERS & DRIVERS MAPPERS
// ==========================================
function parseHelpersDisplay(val) {
    if (!val || val === '-' || val === '0' || val === 0) return '-';
    let strVal = String(val).trim();
    const helpersMap = {
        100: "1/2 (100)", 200: "1 (200)", 250: "1-1 1/2 (250)", 400: "2 (400)",
        500: "2-1 1/2 (500)", 600: "3 (600)", 750: "3-1 1/2 (750)", 800: "4 (800)", 1000: "4-1 1/2 (1000)"
    };
    let num = 0;
    let match = strVal.match(/\(([\d.]+)\)/);
    if (match) num = parseFloat(match[1]);
    else num = parseFloat(strVal.replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num === 0) return strVal.includes('(') ? strVal : '-';
    return helpersMap[num] || strVal;
}

function parseDriversDisplay(val) {
    if (!val || val === '-' || val === '0' || val === 0) return '-';
    let strVal = String(val).trim();
    if (strVal.includes('(')) return strVal;
    let num = parseFloat(strVal.replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num === 0) return strVal;
    const driversMap = {
        112.5: "1/2 (112.5)", 225: "1 (225)", 250: "1-1 1/2 (250)", 337: "1-1 1/2 (337)",
        400: "2 (400)", 450: "2 (450)", 500: "2-1 1/2 (500)", 675: "2-1 1/2 (675)"
    };
    return driversMap[num] || strVal;
}
window.parseHelpersDisplay = parseHelpersDisplay;
window.parseDriversDisplay = parseDriversDisplay;

// ==========================================
// 7. MODALS & CRUD ACTIONS
// ==========================================
function openAddModal(isEdit = false) {
    const modal = document.getElementById('jobModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '99999', 'important');
    }

    const jobForm = document.getElementById('jobForm');
    const modalTitleEl = document.getElementById('modalTitle');
    if (modalTitleEl) modalTitleEl.innerText = isEdit ? 'Edit Job' : 'Add New Job';
    if (!isEdit) {
        if (jobForm) {
            jobForm.removeAttribute('data-edit-id');
            jobForm.reset();
        }
        const dieselContainer = document.getElementById('diesel-entries-container');
        if (dieselContainer) {
            dieselContainer.innerHTML = '';
            if (typeof window.addDieselEntryField === 'function') window.addDieselEntryField('', 'Unspecified');
        }
        const puContainer = document.getElementById('puContainer');
        const destContainer = document.getElementById('destContainer') || document.getElementById('destContextContainer');
        if (puContainer) puContainer.innerHTML = '';
        if (destContainer) destContainer.innerHTML = '';
    }
}
window.openAddModal = openAddModal;

function openEditJobModal(jobIdOrNo) {
    const jobs = window.masterJobs || [];
    const targetId = String(jobIdOrNo).trim();
    const job = jobs.find(j => String(j.id || '').trim() === targetId || String(j.jobNo || j.job_no || '').trim().toLowerCase() === targetId.toLowerCase());

    if (!job) {
        alert("Job record not found!");
        return;
    }

    openAddModal(true);
    const jobForm = document.getElementById('jobForm');
    if (jobForm) jobForm.setAttribute('data-edit-id', job.id || '');

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val !== undefined && val !== null ? val : '';
    };

    function formatDateForInput(dateStr) {
        if (!dateStr) return '';
        try {
            const cleanDate = dateStr.split(' ')[0];
            const parts = cleanDate.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
            return cleanDate;
        } catch (e) {
            return dateStr;
        }
    }

    setVal('jobDate', formatDateForInput(job.date || job.job_date || ''));
    setVal('jobNo', job.jobNo || job.job_no || job.job_number || '');

    let routeStr = job.route || job.route_to || '';
    let fromVal = '', toVal = '';
    if (routeStr.includes('→')) {
        const parts = routeStr.split('→');
        fromVal = parts[0]?.trim() || '';
        toVal = parts[1]?.trim() || '';
    } else if (routeStr.includes('->')) {
        const parts = routeStr.split('->');
        fromVal = parts[0]?.trim() || '';
        toVal = parts[1]?.trim() || '';
    } else {
        fromVal = routeStr;
    }

    const fromEl = document.getElementById('routeFrom') || document.querySelector('[name="routeFrom"]');
    if (fromEl) fromEl.value = fromVal;
    const toEl = document.getElementById('routeTo') || document.querySelector('[name="routeTo"]');
    if (toEl) toEl.value = toVal;

    setVal('jobForeman', job.foreman || job.foreman_name || '');
    setVal('jobTotal', job.total || job.total_amount || '');

    const setSelectVal = (selectId, val) => {
        const select = document.getElementById(selectId);
        if (select && val) {
            for (let option of select.options) {
                if (option.text.trim() === String(val).trim() || option.value.trim() === String(val).trim()) {
                    select.value = option.value;
                    break;
                }
            }
        }
    };

    setSelectVal('helpersCost', job.helpers || job.helpers_cost);
    setSelectVal('driversCost', job.drivers || job.drivers_cost);

    const dieselContainer = document.getElementById('diesel-entries-container');
    if (dieselContainer) dieselContainer.innerHTML = '';
    const dieselValStr = String(job.diesel || job.diesel_expense || '');
    if (dieselValStr && dieselValStr !== '-') {
        dieselValStr.split('+').forEach(entry => {
            const parts = entry.trim().split(' ');
            const amt = parts[0] !== '-' ? parts[0] : '';
            const meth = parts.slice(1).join(' ') || 'Unspecified';
            if (typeof window.addDieselEntryField === 'function') window.addDieselEntryField(amt, meth);
        });
    } else {
        if (typeof window.addDieselEntryField === 'function') window.addDieselEntryField('', 'Unspecified');
    }

    const hotelValStr = String(job.hotel || job.hotel_expense || '');
    const hotelParts = hotelValStr.split(' ');
    setVal('hotelAmount', hotelParts[0] !== '-' ? hotelParts[0] : '');
    if (hotelParts.length > 1) {
        const hotelMethod = document.getElementById('hotelMethod');
        if (hotelMethod) hotelMethod.value = hotelParts[1];
    }

    if (typeof populatePaymentContainer === 'function') {
        if (job.pu || job.pu_payments) populatePaymentContainer('puContainer', job.pu || job.pu_payments);
        if (job.destination || job.dest || job.destination_payments) populatePaymentContainer('destContainer', job.destination || job.dest || job.destination_payments);
    }
}
window.openEditJobModal = openEditJobModal;

function populatePaymentContainer(containerId, paymentStr) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (!paymentStr || paymentStr === '-' || paymentStr === '---' || paymentStr.toUpperCase() === 'NULL') return;

    String(paymentStr).split(/,(?!\d{3}(?:\D|$))/).forEach(p => {
        let trimmed = p.trim();
        if (!trimmed) return;
        let amount = '', method = 'Unspecified';
        const parts = trimmed.split(' ');
        if (parts.length >= 2) {
            amount = parts[0];
            method = parts.slice(1).join(' ');
        } else {
            amount = trimmed;
            method = 'unspecified';
        }
        if (typeof addPaymentRow === 'function') addPaymentRow(containerId, amount, method);
    });
}
window.populatePaymentContainer = populatePaymentContainer;

function parseAndSumDiesel(val) {
    if (!val || val === '-' || val === '0' || val === 0) return 0;
    if (typeof val === 'number') return val;
    let strVal = String(val).trim();
    if (strVal.includes('+')) {
        let sum = 0;
        strVal.split('+').forEach(part => { sum += parseFloat(part.replace(/[^0-9.]/g, '')) || 0; });
        return sum;
    }
    return parseFloat(strVal.replace(/[^0-9.]/g, '')) || 0;
}
window.parseAndSumDiesel = parseAndSumDiesel;

function closeModal() {
    const jobFormEl = document.getElementById('jobForm');
    if (jobFormEl) jobFormEl.removeAttribute('data-edit-id');
    const modal = document.getElementById('jobModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.setProperty('display', 'none', 'important');
    }
}
window.closeModal = closeModal;

async function saveJob(event) {
    if (event) event.preventDefault();

    const jobNoInput = document.getElementById('jobNo');
    const jobNoVal = jobNoInput ? jobNoInput.value.trim() : '';
    const dateInput = document.getElementById('jobDate');
    const dateVal = dateInput && dateInput.value ? formatJobDateToSlash(dateInput.value) : '';

    let totalRaw = document.getElementById('jobTotal') ? document.getElementById('jobTotal').value.trim() : '-';
    let totalFormatted = totalRaw && totalRaw !== '-' && !totalRaw.startsWith('$') ? '$' + totalRaw : totalRaw;
    let totalNum = parseFloat(String(totalFormatted).replace(/[^0-9.]/g, '')) || 0;
    let foreman10Val = totalNum > 0 ? (totalNum * 0.1).toFixed(0) : '0';

    const routeValue = `${document.getElementById('routeFrom').value.trim()} → ${document.getElementById('routeTo').value.trim()}`;
    const puFormatted = extractPaymentsFromContainer('puContainer');
    const destFormatted = extractPaymentsFromContainer('destContainer');
    const dieselCollected = typeof collectDieselDataForSave === 'function' ? collectDieselDataForSave() : '';
    const dieselFormatted = dieselCollected ? dieselCollected : '-';

    const hotelRaw = document.getElementById('hotelAmount') ? document.getElementById('hotelAmount').value.trim() : '';
    const hotelMethod = document.getElementById('hotelMethod') ? document.getElementById('hotelMethod').value : 'Cash';
    const hotelFormatted = hotelRaw ? `${hotelRaw} ${hotelMethod}` : '-';

    const helpersSelect = document.getElementById('helpersCost');
    const helpersFormatted = helpersSelect && helpersSelect.selectedIndex > 0 ? helpersSelect.options[helpersSelect.selectedIndex].text : '-';

    const driversSelect = document.getElementById('driversCost');
    const driversFormatted = driversSelect && driversSelect.selectedIndex > 0 ? driversSelect.options[driversSelect.selectedIndex].text : '-';

    const supabasePayload = {
        date: dateVal,
        job_no: jobNoVal,
        route: routeValue,
        foreman_name: document.getElementById('jobForeman') ? document.getElementById('jobForeman').value.trim() : '',
        foreman_cost: foreman10Val,
        total_amount: totalFormatted,
        helpers_cost: helpersFormatted,
        drivers_cost: driversFormatted,
        pu_payments: puFormatted,
        destination_payments: destFormatted,
        diesel_expense: dieselFormatted,
        hotel_expense: hotelFormatted,
        storage: '-'
    };

    if (!window.supabaseClient) {
        alert("Supabase client not initialized!");
        return;
    }

    const jobForm = document.getElementById('jobForm');
    const editRecordId = jobForm ? jobForm.getAttribute('data-edit-id') : null;

    let error = null;
    if (editRecordId && editRecordId !== '') {
        const { error: updateError } = await window.supabaseClient.from('jobs_report').update(supabasePayload).eq('id', editRecordId);
        error = updateError;
    } else {
        const { error: insertError } = await window.supabaseClient.from('jobs_report').insert([supabasePayload]);
        error = insertError;
    }

    if (error) {
        alert('Supabase Error: ' + error.message);
    } else {
        if (jobForm) jobForm.removeAttribute('data-edit-id');
        closeModal();
        
        // جلب أحدث البيانات من قاعدة البيانات وإعادة رسم الجدول فوراً
        if (typeof initMasterJobsData === 'function') {
            await initMasterJobsData();
        }
        if (typeof renderTable === 'function' && window.masterJobs) {
            renderTable(window.masterJobs);
        }

        alert('Record saved successfully!');
    }
}
window.saveJob = saveJob;

// ==========================================
// 8. RECYCLE BIN & TRASH MANAGEMENT (النسخة النهائية المصححة)
// ==========================================

async function softDeleteRecord(tableName, recordId) {
    if (!confirm('Are you sure you want to move this record to the Recycle Bin?')) return false;
    if (!window.supabaseClient) {
        alert("Supabase client not initialized!");
        return false;
    }

    if (!recordId) {
        alert("Error: Record ID is missing!");
        return false;
    }

    const cleanId = typeof recordId === 'string' ? recordId.trim() : Number(recordId);
    console.log(`🗑️ [SoftDelete] جاري نقل السجل إلى سلة المحذوفات: Table=${tableName}, ID=`, cleanId);

    // تحديث حقل is_deleted إلى true بغض النظر عن محتوى الحقول الأخرى
    const { data, error } = await window.supabaseClient
        .from(tableName)
        .update({ is_deleted: true })
        .eq('id', cleanId)
        .select();

    if (error) {
        console.error(`❌ [SoftDelete Error] فشل تحديث السجل في ${tableName}:`, error.message);
        alert('Failed to move record to recycle bin: ' + error.message);
        return false;
    } else {
        console.log(`✅ [SoftDelete Success] تم نقل السجل بنجاح:`, data);
        alert('Record moved to Recycle Bin successfully!');
        
        // تحديث الواجهات حسب الجدول المُعدّل
        if (tableName === 'jobs_report') {
            if (typeof initMasterJobsData === 'function') await initMasterJobsData();
            if (typeof renderTable === 'function' && window.masterJobs) renderTable(window.masterJobs);
        } else if (tableName === 'warehouse_expenses') {
            if (typeof loadWarehouseData === 'function') await loadWarehouseData();
        } else if (tableName === 'truck_rental') {
            if (typeof loadPrivateTruckRentals === 'function') await loadPrivateTruckRentals();
        }

        // تحديث سلة المحذوفات فوراً
        if (typeof renderTrashBin === 'function') await renderTrashBin();
        if (typeof updateDashboardAnalytics === 'function') updateDashboardAnalytics();
        
        return true;
    }
}
window.softDeleteRecord = softDeleteRecord;

// دوال الحذف المباشرة للأقسام
async function deleteJob(jobId) { 
    await softDeleteRecord('jobs_report', jobId); 
}
window.deleteJob = deleteJob;

async function deleteWarehouseRecord(id) {
    await softDeleteRecord('warehouse_expenses', id);
}
window.deleteWarehouseRecord = deleteWarehouseRecord;

async function deleteTruckRental(id) {
    await softDeleteRecord('truck_rental', id);
}
window.deleteTruckRental = deleteTruckRental;



// ==========================================
// 📦 دالة عرض سلة المحذوفات الموحدة لكافة الأقسام (محصنة ضد القيم الفارغة)
// ==========================================
async function renderTrashBin() {
    try {
        if (!window.supabaseClient) {
            console.error("❌ Supabase client is not initialized!");
            return;
        }
        
        let allDeletedRecords = [];

        // 1. جلب محذوفات العمليات (Jobs)
        const { data: jobsData } = await window.supabaseClient
            .from('jobs_report')
            .select('*')
            .eq('is_deleted', true)
            .order('id', { ascending: false });
            
        if (jobsData) {
            allDeletedRecords.push(...jobsData.map(item => ({ 
                ...item, 
                tableName: 'jobs_report', 
                displayType: 'Job Report',
                identifier: item.job_no || item.jobNo || `Job #${item.id}`,
                details: item.route || '-',
                assigned: item.foreman_name || item.foreman || '-',
                helpers: item.helpers_cost || item.helpers || '-',
                drivers: item.drivers_cost || item.drivers || '-',
                amount: item.total_amount || item.total || '$0'
            })));
        }

        // 2. جلب محذوفات المستودع (Warehouse)
        const { data: warehouseData } = await window.supabaseClient
            .from('warehouse_expenses')
            .select('*')
            .eq('is_deleted', true)
            .order('id', { ascending: false });
            
        if (warehouseData) {
            allDeletedRecords.push(...warehouseData.map(item => ({ 
                ...item, 
                tableName: 'warehouse_expenses', 
                displayType: 'Warehouse',
                identifier: item.services || item.category || `Item #${item.id}`,
                details: item.details || item.description || '-',
                assigned: item.paymentType || item.method || '-',
                helpers: '-',
                drivers: '-',
                amount: item.amount || item.cost || '$0'
            })));
        }

        // 3. جلب محذوفات الشاحنات (Truck Rental)
        const { data: rentalData } = await window.supabaseClient
            .from('truck_rental')
            .select('*')
            .eq('is_deleted', true)
            .order('id', { ascending: false });
            
        if (rentalData) {
            allDeletedRecords.push(...rentalData.map(item => ({ 
                ...item, 
                tableName: 'truck_rental', 
                displayType: 'Truck Rental',
                identifier: item.truckLabel || item.truck_no || `Rental #${item.id}`,
                details: item.paymentType || item.notes || '-',
                assigned: item.paidBy || item.driver_name || '-',
                helpers: '-',
                drivers: '-',
                amount: item.amount || item.total_amount || '$0'
            })));
        }

        const trashContainer = document.getElementById('trashTableBody');
        if (!trashContainer) {
            console.warn("⚠️ عنصر جدول سلة المحذوفات (trashTableBody) غير موجود في الصفحة.");
            return;
        }

        if (allDeletedRecords.length === 0) {
            trashContainer.innerHTML = `<tr><td colspan="9" class="text-center py-6 text-slate-400 font-medium">Trash bin is empty</td></tr>`;
        } else {
            // رسم السجلات مع استخدام قيم افتراضية (-) لو كانت الحقول فارغة تماماً
            trashContainer.innerHTML = allDeletedRecords.map(item => `
                <tr class="border-b hover:bg-slate-50 text-xs transition-colors">
                    <td class="p-3 text-slate-800 font-medium">${escapeHtml(item.date || item.created_at?.split('T')[0] || '-')}</td>
                    <td class="p-3"><span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">${escapeHtml(item.displayType || 'Record')}</span></td>
                    <td class="p-3 text-slate-700 font-semibold">${escapeHtml(item.identifier || `ID: ${item.id}`)}</td>
                    <td class="p-3 text-slate-600">${escapeHtml(item.details || '-')}</td>
                    <td class="p-3 text-slate-600">${escapeHtml(item.assigned || '-')}</td>
                    <td class="p-3 text-purple-700">${escapeHtml(item.helpers || '-')}</td>
                    <td class="p-3 text-blue-700">${escapeHtml(item.drivers || '-')}</td>
                    <td class="p-3 font-bold text-emerald-600">${escapeHtml(item.amount || '$0')}</td>
                    <td class="p-3 text-center space-x-1">
                        <button type="button" onclick="restoreRecord('${item.tableName}', '${item.id}')" class="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-700 transition cursor-pointer shadow-xs" title="Restore">
                            <i class="fa-solid fa-rotate-left mr-1"></i> Restore
                        </button>
                        <button type="button" onclick="permanentDeleteRecord('${item.tableName}', '${item.id}')" class="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs hover:bg-rose-700 transition cursor-pointer shadow-xs" title="Delete Forever">
                            <i class="fa-solid fa-trash-can mr-1"></i> Delete
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        console.log(`✅ [Trash] تم عرض ${allDeletedRecords.length} سجل في سلة المحذوفات بنجاح.`);

    } catch (e) {
        console.error("Error in renderTrashBin:", e);
    }
}
window.renderTrashBin = renderTrashBin;

async function restoreRecord(tableName, recordId) {
    if (!window.supabaseClient) return;
    const cleanId = typeof recordId === 'string' ? recordId.trim() : Number(recordId);

    const { error } = await window.supabaseClient
        .from(tableName)
        .update({ is_deleted: false })
        .eq('id', cleanId);

    if (error) {
        alert('Failed to restore record: ' + error.message);
    } else {
        alert('Record restored successfully!');
        if (typeof renderTrashBin === 'function') await renderTrashBin();
        if (tableName === 'jobs_report' && typeof initMasterJobsData === 'function') await initMasterJobsData();
        if (tableName === 'warehouse_expenses' && typeof loadWarehouseData === 'function') await loadWarehouseData();
        if (tableName === 'truck_rental' && typeof loadPrivateTruckRentals === 'function') await loadPrivateTruckRentals();
    }
}
window.restoreRecord = restoreRecord;

async function permanentDeleteRecord(tableName, recordId) {
    if (!confirm('Are you sure you want to permanently delete this record? This action cannot be undone.')) return;
    if (!window.supabaseClient) return;
    
    const cleanId = typeof recordId === 'string' ? recordId.trim() : Number(recordId);

    const { error } = await window.supabaseClient
        .from(tableName)
        .delete()
        .eq('id', cleanId);

    if (error) {
        alert('Failed to permanently delete record: ' + error.message);
    } else {
        alert('Record permanently deleted!');
        if (typeof renderTrashBin === 'function') await renderTrashBin();
    }
}
window.permanentDeleteRecord = permanentDeleteRecord;

async function emptyTrashBin() {
    if (!confirm('Are you sure you want to permanently delete ALL items in the Recycle Bin?')) return;
    if (!window.supabaseClient) return;

    try {
        const results = [
            await window.supabaseClient.from('jobs_report').delete().eq('is_deleted', true),
            await window.supabaseClient.from('warehouse_expenses').delete().eq('is_deleted', true),
            await window.supabaseClient.from('truck_rental').delete().eq('is_deleted', true)
        ];
        const failed = results.find(r => r && r.error);
        if (failed) {
            alert('Failed to empty trash bin: ' + failed.error.message);
            await renderTrashBin();
            return;
        }

        alert('Recycle Bin emptied successfully!');
        await renderTrashBin();
    } catch (e) {
        console.error("Error emptying trash:", e);
        alert('Failed to empty trash bin.');
    }
}
window.emptyTrashBin = emptyTrashBin;



// ==========================================
// 9. DASHBOARD ANALYTICS & CHARTS
// ==========================================
// Moved to Dashboard.js (updateDashboardAnalytics / renderDashboardCharts).
// It used to be defined in both files and this copy silently overrode Dashboard.js.

// ==========================================
// 10. NAVIGATION & TABS
// ==========================================
function renderTable(data) {
    const tbody = document.getElementById('masterJobsTableBody');
    if (!tbody) return;

    const activeData = (data && data.length > 0) ? data : (window.currentFilteredJobs || window.masterJobs || []);

    if (activeData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="text-center py-6 text-slate-400 font-medium">No records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = activeData.map(item => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <td class="p-3 text-center">${escapeHtml(item.date || '-')}</td>
            <td class="p-3 font-semibold text-slate-800">${escapeHtml(item.jobNo || item.job_no || '-')}</td>
            <td class="p-3 text-slate-600">${escapeHtml(item.route || '-')}</td>
            <td class="p-3 text-slate-600">${escapeHtml(item.foreman_name || item.foreman || '-')}</td>
            <td class="p-3 text-emerald-600 font-medium">${escapeHtml(item.foreman_cost || item.foreman10pct || '-')}</td>
            <td class="p-3 text-purple-600">${escapeHtml(item.helpers_cost || item.helpers || '-')}</td>
            <td class="p-3 text-blue-600">${escapeHtml(item.drivers_cost || item.drivers || '-')}</td>
            <td class="p-3 font-bold text-slate-900">${escapeHtml(item.total_amount || item.total || '-')}</td>
            <td class="p-3 text-slate-600">${escapeHtml(item.pu_payments || item.pu || '-')}</td>
            <td class="p-3 text-slate-600">${escapeHtml(item.destination_payments || item.dest || '-')}</td>
            <td class="p-3 text-slate-600">${escapeHtml(item.diesel_expense || item.diesel || '-')}</td>
            <td class="p-3 text-slate-600">${escapeHtml(item.hotel_expense || item.hotel || '-')}</td>
            <td class="p-3 text-center space-x-1">
                <button type="button" onclick="openEditJobModal('${item.id}')" class="edit-action-btn p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition cursor-pointer" title="Edit">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button type="button" onclick="deleteJob('${item.id}')" class="delete-action-btn p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    const totalMasterCount = (window.masterJobs || []).length;
    const counterEl = document.getElementById('filteredCountText') || document.getElementById('ledgerCounter');
    if (counterEl) {
        counterEl.innerText = `Showing ${activeData.length} of ${totalMasterCount} records`;
    }

    if (typeof checkPermissions === 'function') checkPermissions();
}
window.renderTable = renderTable;

// 2. دالة التنقل بين التبويبات (لإصلاح خطأ switchTab is not defined)
function switchTab(tabName) {
    try {
        // توحيد الاسم ليتوافق مع الـ ID الحقيقي في الـ HTML وهو trash
        if (tabName === 'recycle-bin' || tabName === 'trash') {
            tabName = 'trash';
        }

        const tabs = ['dashboard', 'jobs', 'users', 'reports', 'trash', 'rentals', 'warehouse', 'pdf-report'];
        
        tabs.forEach(t => {
            // إخفاء كافة محتويات التبويبات المحتملة
            [t, `tab-${t}`, `${t}-view`].forEach(id => {
                const tabEl = document.getElementById(id);
                if (tabEl) {
                    tabEl.classList.add('hidden');
                    tabEl.classList.remove('flex', 'block');
                    tabEl.style.setProperty('display', 'none', 'important');
                }
            });
            // إعادة ضبط تصميم الأزرار الجانبية
            [t, `nav-${t}`, `nav-${t}-btn`].forEach(id => {
                const navEl = document.getElementById(id);
                if (navEl && (navEl.tagName === 'BUTTON' || navEl.tagName === 'DIV')) {
                    navEl.className = 'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer';
                }
            });
        });

        // إظهار التبويب المطلوب باستخدام الـ ID الصحيح tab-trash مع استخدام flex
        let activeTab = null;
        const possibleIds = tabName === 'trash' 
            ? ['tab-trash', 'trash', 'trash-view', 'recycle-bin', 'tab-recycle-bin']
            : [tabName, `tab-${tabName}`, `${tabName}-view`];

        for (let id of possibleIds) {
            activeTab = document.getElementById(id);
            if (activeTab) break;
        }

        if (activeTab) {
            activeTab.classList.remove('hidden');
            activeTab.classList.add('flex'); // استخدام flex بدلاً من block لأن العنصر يحتوي على flex-col
            activeTab.style.setProperty('display', 'flex', 'important');
        }

        // تفعيل زر القائمة الجانبية (Recycle Bin)
        let activeNav = null;
        for (let id of [tabName, `nav-${tabName}`, `nav-${tabName}-btn`, 'recycle-bin', 'nav-recycle-bin']) {
            activeNav = document.getElementById(id);
            if (activeNav) break;
        }
        if (activeNav) {
            activeNav.className = 'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl bg-emerald-600 text-white font-medium shadow-md transition cursor-pointer';
        }

        // تشغيل الوظائف البرمجية لكل تبويب
        if (tabName === 'dashboard') {
            if (typeof updateDashboardAnalytics === 'function') updateDashboardAnalytics();
        } else if (tabName === 'jobs') {
            if (typeof filterLedgerTable === 'function') filterLedgerTable();
            else if (typeof renderTable === 'function' && window.masterJobs) renderTable(window.masterJobs);
        } else if (tabName === 'rentals' && typeof renderPrivateTruckRentalTab === 'function') {
            renderPrivateTruckRentalTab();
        } else if (tabName === 'warehouse' && typeof renderWarehouseTab === 'function') {
            renderWarehouseTab();
        } else if (tabName === 'reports') {
            if (typeof renderReportsTab === 'function') renderReportsTab();
            if (typeof window.renderSummaryPageWithDetailedTables === 'function') window.renderSummaryPageWithDetailedTables();
        } else if (tabName === 'users') {
            if (typeof renderUsers === 'function') renderUsers();
            if (typeof fetchUsersFromSupabase === 'function') fetchUsersFromSupabase();
        } else if (tabName === 'trash') {
            if (typeof renderTrashBin === 'function') renderTrashBin();
        }
    } catch (e) {
        console.error("Error switching tab:", e);
    }
}
window.switchTab = switchTab;
// ==========================================
// 11. INITIALIZATION ON DOM LOADED
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    try {
        window.currentUserRole = 'Admin';
        if (typeof checkPermissions === 'function') checkPermissions();
        if (typeof renderUsers === 'function') renderUsers();

        const promises = [];
        if (typeof initMasterJobsData === 'function') promises.push(initMasterJobsData());
        if (typeof loadPrivateTruckRentals === 'function') promises.push(loadPrivateTruckRentals());
        if (typeof loadWarehouseData === 'function') promises.push(loadWarehouseData());

        await Promise.all(promises);

        const fromInput = document.getElementById('ledgerFromDate');
        const toInput = document.getElementById('ledgerToDate');
        if ((fromInput && fromInput.value) || (toInput && toInput.value)) {
            if (typeof filterLedgerTable === 'function') filterLedgerTable();
        }

        if (typeof updateDashboardAnalytics === 'function') updateDashboardAnalytics();
        if (typeof generateSummaryReportData === 'function') generateSummaryReportData();
        if (typeof window.renderSummaryPageWithDetailedTables === 'function') window.renderSummaryPageWithDetailedTables();
        if (typeof switchTab === 'function') switchTab('dashboard');
    } catch (error) {
        console.error("Initialization error:", error);
    }
});
