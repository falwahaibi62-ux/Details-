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

if (typeof window.systemUsers === 'undefined') {
    window.systemUsers = [
        { name: "Enterprise Admin", email: "admin@movepro.com", role: "Admin" },
        { name: "Operations Supervisor", email: "ops@movepro.com", role: "Member" },
        { name: "Guest Viewer", email: "viewer@movepro.com", role: "Viewer" }
    ];
}

async function loadDataFromSupabase() {
    const { data, error } = await supabase.from('jobs_report').select('*');
    
    if (!error && data) {
        // تخزين البيانات في المتغير العام
        window.masterJobs = data; 
        window.currentFilteredJobs = data; 
        
        // 🌟 ضع الكود هنا بالتحديد فور وصول البيانات:
        if (typeof populateSummaryTables === 'function') {
            populateSummaryTables(data);
        }
        
        // (اختياري) إذا أردت تحديث البطاقات والملخصات معها مباشرة:
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

        // 1. إذا كان التاريخ بصيغة YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
            const parts = cleanStr.split('-').map(Number);
            y = parts[0]; m = parts[1]; d = parts[2];
        } 
        // 2. إذا كان التاريخ بصيغة DD-MM-YYYY أو DD/MM/YYYY أو MM/DD/YYYY
        else if (cleanStr.includes('-') || cleanStr.includes('/')) {
            const separator = cleanStr.includes('-') ? '-' : '/';
            const parts = cleanStr.split(separator).map(Number);
            if (parts.length === 3) {
                // إذا كانت السنة في البداية (مثل 2026-10-01)
                if (parts[0] > 1000) {
                    y = parts[0]; m = parts[1]; d = parts[2];
                } 
                // إذا كانت السنة في النهاية (مثل 01-10-2026 أو 10-01-2026)
                else {
                    y = parts[2];
                    // افتراض أن القيمة الأولى هي الشهر والثانية اليوم (أو العكس حسب المدخل)
                    // بما أن المدخل من حقل التاريخ، نحدد بدقة بناءً على القيمة الأكبر
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

    // تطبيق الفلترة الصارمة واستبعاد تواريخ سبتمبر فوراً
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


// 🌟 ربط حقول الإدخال تلقائياً بحدث التغيير لضمان الفلترة الفورية عند اختيار التاريخ
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
        if (typeof renderTable === 'function') renderTable(window.masterJobs);

        const counterEl = document.getElementById('filteredCountText');
        if (counterEl) {
            counterEl.innerText = `Showing ${window.masterJobs.length} of ${window.masterJobs.length} records`;
        }

        const summaryContainer = document.getElementById('paymentSummaryContainer');
        if (summaryContainer && typeof generatePaymentMethodSummaryTableHTML === 'function') {
            summaryContainer.innerHTML = generatePaymentMethodSummaryTableHTML();
        }

        if (typeof updateDashboardAnalytics === 'function') updateDashboardAnalytics();

    } catch (e) {
        window.masterJobs = [];
    }
}
window.initMasterJobsData = initMasterJobsData;

async function saveMasterJobsData(jobs) {
    window.masterJobs = jobs;
    filterJobsTable();
    updateDashboardAnalytics();
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
    const startDateVal = document.getElementById('filterStartDate') ? document.getElementById('filterStartDate').value : '';
    const endDateVal = document.getElementById('filterEndDate') ? document.getElementById('filterEndDate').value : '';

    const rawData = window.masterJobs || window.allJobsData || [];

    const filtered = rawData.filter(item => {
        const itemDateStr = item.date || item.created_at;
        if (!itemDateStr) return false;

        const itemDate = new Date(itemDateStr);
        if (isNaN(itemDate)) return false;

        const itemTime = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate()).getTime();

        if (startDateVal) {
            const startParts = startDateVal.split('-');
            const startTime = new Date(startParts[0], startParts[1] - 1, startParts[2]).getTime();
            if (itemTime < startTime) return false;
        }

        if (endDateVal) {
            const endParts = endDateVal.split('-');
            const endTime = new Date(endParts[0], endParts[1] - 1, endParts[2]).getTime();
            if (itemTime > endTime) return false;
        }

        return true;
    });

    if (typeof renderTable === 'function') {
        renderTable(filtered);
    }
    
    const countEl = document.getElementById('filteredCountText');
    if (countEl) {
        countEl.innerText = `Showing ${filtered.length} of ${window.masterJobs.length} records`;
    }
}
window.filterJobsTable = filterJobsTable;

function renderTable(data) {
    let tbody = document.getElementById('masterJobsTableBody');
    if (!tbody) {
        const tbodies = document.querySelectorAll('tbody');
        tbody = tbodies[2] || tbodies[3] || document.querySelector('table tbody');
    }

    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="text-center py-6 text-slate-400 font-medium">No records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <td class="p-3 text-center">${formatDateOnly(item.date)}</td>
            <td class="p-3 font-semibold text-slate-800">${item.jobNo || item.job_no || '-'}</td>
            <td class="p-3 text-slate-600">${item.route || '-'}</td>
            <td class="p-3 text-slate-600">${item.foreman || item.foreman_name || '-'}</td>
            <td class="p-3 text-emerald-600 font-medium">${item.foreman10pct || item.foreman_cost || '-'}</td>
            <td class="p-3 text-purple-600">${item.helpers || item.helpers_cost || '-'}</td>
            <td class="p-3 text-blue-600">${item.drivers || item.drivers_cost || '-'}</td>
            <td class="p-3 font-bold text-slate-900">${item.total || item.total_amount || '-'}</td>
            <td class="p-3 text-slate-600">${item.pu || item.pu_payments || '-'}</td>
            <td class="p-3 text-slate-600">${item.dest || item.destination || '-'}</td>
            <td class="p-3 text-slate-600">${item.diesel || item.diesel_expense || '-'}</td>
            <td class="p-3 text-slate-600">${item.hotel || item.hotel_expense || '-'}</td>
            <td class="p-3 text-center space-x-1">
                <button type="button" onclick="openEditJobModal('${item.id}')" class="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition cursor-pointer" title="Edit">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button type="button" onclick="deleteJob('${item.id}')" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}
window.renderTable = renderTable;

function resetDateFilter() {
    // 🌟 البحث الشامل عن حقول التاريخ لتفريغها بغض النظر عن الـ ID المستخدم في الصفحة
    const startInput = document.getElementById('ledgerFromDate') || document.getElementById('reportStartDate') || document.getElementById('filterStartDate') || document.getElementById('fromDate');
    const endInput = document.getElementById('ledgerToDate') || document.getElementById('reportEndDate') || document.getElementById('filterEndDate') || document.getElementById('toDate');
    
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';
    
    // 1. إعادة ضبط كل المصفوفات العامة لتعود لحالتها الأصلية الكاملة من الذاكرة
    window.currentFilteredJobs = window.masterJobs || [];
    
    if (window.masterTruckRentals) {
        window.currentTruckRentals = window.masterTruckRentals;
    }
    if (window.masterWarehouseRecords) {
        window.currentWarehouseRecords = window.masterWarehouseRecords;
    }
    
    // 2. تحديث جدول الأستاذ أو الفلتر العام إن وجد
    if (typeof filterLedgerTable === 'function') {
        filterLedgerTable();
    }
    
    // 3. 🌟 إعادة رسم وتحديث كل الجداول الإجمالية والتفصيلية فوراً
    if (typeof renderTable === 'function') {
        renderTable(window.currentFilteredJobs);
    }
    if (typeof generateDetailedReportData === 'function') {
        generateDetailedReportData();
    }
    if (typeof updateDashboardAnalytics === 'function') {
        updateDashboardAnalytics();
    }
    if (typeof populateSummaryTables === 'function') {
        populateSummaryTables(window.currentFilteredJobs);
    }
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

        if (error) return;

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
                            <h4 class="font-bold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">${u.name}</h4>
                            <p class="text-xs text-slate-400 font-medium">${u.email}</p>
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

    const userRole = prompt("Enter user role (Admin, Member, Viewer):", "Member");
    if (!userRole) return;

    if (typeof supabaseClient === 'undefined') return;

    try {
        const { error } = await supabaseClient
            .from('user_role')
            .insert([{ name: userName, email: userEmail, role: userRole, status: 'enable' }]);

        if (!error) fetchUsersFromSupabase();
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

        if (!error) fetchUsersFromSupabase();
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
        editButtons.forEach(btn => { btn.style.display = 'flex'; btn.disabled = false; });
        deleteButtons.forEach(btn => { btn.style.display = 'flex'; btn.disabled = false; });
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
        <input type="text" placeholder="Amount" class="flex-1 p-2.5 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 diesel-amount" value="${amount}">
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
        <input type="text" placeholder="Amount (e.g. 500)" value="${safeAmount}" class="flex-1 p-2.5 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 payment-amount">
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
    if (!isEdit) {
        if (jobForm) jobForm.reset();
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

    String(paymentStr).split(',').forEach(p => {
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
    if (!jobNoInput || !jobNoInput.value.trim()) {
        alert('Please enter the Job Number.');
        if (jobNoInput) jobNoInput.focus();
        return;
    }

    const jobNoVal = jobNoInput.value.trim();
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
        if (typeof initMasterJobsData === 'function') initMasterJobsData();
        alert('Record saved successfully!');
    }
}
window.saveJob = saveJob;

// ==========================================
// 8. RECYCLE BIN & TRASH MANAGEMENT
// ==========================================
async function renderTrashBin() {
    try {
        if (!window.supabaseClient) return;
        let allDeletedRecords = [];

        const { data: jobsData } = await window.supabaseClient.from('jobs_report').select('*').eq('is_deleted', true).order('id', { ascending: false });
        if (jobsData) allDeletedRecords.push(...jobsData.map(item => ({ ...item, tableName: 'jobs_report', displayType: 'Job' })));

        const { data: truckData } = await window.supabaseClient.from('truck_rental').select('*').eq('is_deleted', true).order('id', { ascending: false });
        if (truckData) allDeletedRecords.push(...truckData.map(item => ({ ...item, tableName: 'truck_rental', displayType: 'Truck Rental' })));

        const { data: warehouseData } = await window.supabaseClient.from('warehouse_expenses').select('*').eq('is_deleted', true).order('id', { ascending: false });
        if (warehouseData) allDeletedRecords.push(...warehouseData.map(item => ({ ...item, tableName: 'warehouse_expenses', displayType: 'Warehouse' })));

        const trashContainer = document.getElementById('trashTableBody') || document.getElementById('trashContainer');
        if (!trashContainer) return;

        if (allDeletedRecords.length === 0) {
            trashContainer.innerHTML = `<tr><td colspan="9" class="text-center py-6 text-slate-400">Trash bin is empty</td></tr>`;
            return;
        }

        trashContainer.innerHTML = allDeletedRecords.map(item => {
            const identifier = item.job_no || item.services || item.truck_name || item.id || '-';
            const details = item.route || item.details || item.notes || '-';
            const assigned = item.foreman_name || item.paymentType || item.assigned_to || '-';
            const helpers = item.helpers || '-';
            const drivers = item.drivers || '-';
            const amount = item.total_amount || item.amount || item.total || '$0';

            return `
                <tr class="border-b hover:bg-slate-50">
                    <td class="p-3 text-slate-800 font-medium">${item.date || '-'}</td>
                    <td class="p-3"><span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">${item.displayType}</span></td>
                    <td class="p-3 text-slate-700 font-semibold">${identifier}</td>
                    <td class="p-3 text-slate-600 truncate max-w-xs">${details}</td>
                    <td class="p-3 text-slate-600">${assigned}</td>
                    <td class="p-3 text-purple-700">${helpers}</td>
                    <td class="p-3 text-blue-700">${drivers}</td>
                    <td class="p-3 font-bold text-emerald-600">${amount}</td>
                    <td class="p-3 text-center space-x-1">
                        <button onclick="restoreRecord('${item.tableName}', '${item.id}')" class="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-700 transition cursor-pointer" title="Restore">
                            <i class="fa-solid fa-rotate-left mr-1"></i> Restore
                        </button>
                        <button onclick="permanentDeleteRecord('${item.tableName}', '${item.id}')" class="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs hover:bg-rose-700 transition cursor-pointer" title="Delete Forever">
                            <i class="fa-solid fa-trash-can mr-1"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error("Error in renderTrashBin:", e);
    }
}
window.renderTrashBin = renderTrashBin;

async function softDeleteRecord(tableName, recordId, recordDate) {
    if (!confirm('Are you sure you want to move this record to the Recycle Bin?')) return false;
    if (!window.supabaseClient) return false;

    // تحويل الـ ID إلى رقم أو نص حسب نوعه في قاعدة البيانات
    const cleanId = !isNaN(recordId) ? Number(recordId) : recordId;

    // بناء الاستعلام مع دعم المفتاح المركب (id + date) لتجنب رفض قاعدة البيانات
    let query = window.supabaseClient
        .from(tableName)
        .update({ is_deleted: true })
        .eq('id', cleanId);

    if (recordDate) {
        query = query.eq('date', recordDate);
    }

    const { error } = await query;

    if (error) {
        alert('Failed to move record to recycle bin: ' + error.message);
        return false;
    } else {
        alert('Record moved to Recycle Bin successfully!');
        
        // تحديث البيانات المحلية وإعادة الرسم فوراً
        if (typeof initMasterJobsData === 'function') await initMasterJobsData();
        if (typeof loadWarehouseRecords === 'function') await loadWarehouseRecords();
        if (typeof loadTruckRentals === 'function') await loadTruckRentals();
        if (typeof renderTrashBin === 'function') await renderTrashBin();
        if (typeof generateSummaryReportData === 'function') generateSummaryReportData();
        
        return true;
    }
}
window.softDeleteRecord = softDeleteRecord;

async function restoreRecord(tableName, recordId) {
    if (!window.supabaseClient) return;
    const { error } = await window.supabaseClient.from(tableName).update({ is_deleted: false }).eq('id', recordId);
    if (!error) {
        alert('Record restored successfully!');
        if (typeof renderTrashBin === 'function') renderTrashBin();
        if (typeof initMasterJobsData === 'function') initMasterJobsData();
        if (typeof loadWarehouseRecords === 'function') loadWarehouseRecords();
        if (typeof loadTruckRentals === 'function') loadTruckRentals();
    }
}
window.restoreRecord = restoreRecord;

async function permanentDeleteRecord(tableName, recordId) {
    if (!confirm('Are you sure you want to permanently delete this record?')) return;
    if (!window.supabaseClient) return;
    const { error } = await window.supabaseClient.from(tableName).delete().eq('id', recordId);
    if (!error) {
        alert('Record permanently deleted!');
        if (typeof renderTrashBin === 'function') renderTrashBin();
    }
}
window.permanentDeleteRecord = permanentDeleteRecord;

async function deleteWarehouseRecord(id) {
    const success = await softDeleteRecord('warehouse_expenses', id);
    if (success) {
        if (typeof loadWarehouseRecords === 'function') await loadWarehouseRecords();
        if (typeof renderWarehouseTable === 'function') renderWarehouseTable();
        if (typeof renderTrashBin === 'function') renderTrashBin();
    }
}
window.deleteWarehouseRecord = deleteWarehouseRecord;

async function deleteJob(jobIdOrNo) { await softDeleteRecord('jobs_report', jobIdOrNo); }
window.deleteJob = deleteJob;
async function restoreJob(jobId) { await restoreRecord('jobs_report', jobId); }
window.restoreJob = restoreJob;
async function permanentDeleteJob(jobId) { await permanentDeleteRecord('jobs_report', jobId); }
window.permanentDeleteJob = permanentDeleteJob;

// ==========================================
// 9. DASHBOARD ANALYTICS & CHARTS
// ==========================================
function updateDashboardAnalytics() {
    try {
        if (!window.masterJobs || window.masterJobs.length === 0) {
            const revEl = document.getElementById('dashTotalRevenue');
            if (revEl) revEl.innerText = '$0';
            const jobsTextEl = document.getElementById('dashCompletedJobsText');
            if (jobsTextEl) jobsTextEl.innerHTML = `<i class="fa-solid fa-truck-fast mr-1"></i>0 Active Dispatches`;
            const avgEl = document.getElementById('dashAvgJobValue');
            if (avgEl) avgEl.innerText = '$0';
            const dieselEl = document.getElementById('dashTotalDiesel');
            if (dieselEl) dieselEl.innerText = '$0';
            return;
        }

        let totalRev = 0, totalDieselCost = 0, validJobsCount = 0;
        const routeRevenueMap = {};
        const paymentMethodMap = { Cash: 0, Zelle: 0, Cheque: 0, PMO: 0, BC: 0, PC: 0, CC: 0, WT: 0, Others: 0, Unspecified: 0 };
        const monthlyRev = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        window.masterJobs.forEach(job => {
            if (job.jobNo && (job.jobNo.toLowerCase().includes('cancel') || job.jobNo.toLowerCase().includes('none'))) return;
            validJobsCount++;
            totalDieselCost += typeof parseAndSumDiesel === 'function' ? parseAndSumDiesel(job.diesel || job.diesel_expense) : 0;

            let amt = parseFloat(String(job.total || job.total_amount || 0).replace(/[^0-9.]/g, '')) || 0;
            totalRev += amt;

            if (job.month && job.month >= 1 && job.month <= 12) monthlyRev[job.month - 1] += amt;
            
            const jobRoute = job.route || (job.route_from && job.route_to ? `${job.route_from} → ${job.route_to}` : '');
            if (jobRoute) routeRevenueMap[jobRoute] = (routeRevenueMap[jobRoute] || 0) + amt;

            let puStr = String(job.pu || job.pu_payments || '').trim();
            let destStr = String(job.dest || job.destination_payments || '').trim();
            let hasPu = puStr !== '' && puStr !== '-' && puStr !== '---';
            let hasDest = destStr !== '' && destStr !== '-' && destStr !== '---';

            if (typeof assignPaymentMethodRevenue === 'function') {
                if (hasPu && !hasDest) assignPaymentMethodRevenue(puStr, amt, paymentMethodMap);
                else if (!hasPu && hasDest) assignPaymentMethodRevenue(destStr, amt, paymentMethodMap);
                else if (hasPu && hasDest) {
                    assignPaymentMethodRevenue(puStr, amt / 2, paymentMethodMap);
                    assignPaymentMethodRevenue(destStr, amt / 2, paymentMethodMap);
                } else {
                    paymentMethodMap.Unspecified += amt;
                }
            } else {
                paymentMethodMap.Unspecified += amt;
            }
        });

        window.currentPaymentMethodMap = paymentMethodMap;
        const avgJobVal = validJobsCount > 0 ? (totalRev / validJobsCount) : 0;

        const revEl = document.getElementById('dashTotalRevenue');
        if (revEl) revEl.innerText = '$' + totalRev.toLocaleString('en-US');

        const jobsTextEl = document.getElementById('dashCompletedJobsText');
        if (jobsTextEl) jobsTextEl.innerHTML = `<i class="fa-solid fa-truck-check mr-1"></i>${validJobsCount} Active Dispatches`;

        const avgEl = document.getElementById('dashAvgJobValue');
        if (avgEl) avgEl.innerText = '$' + Math.round(avgJobVal).toLocaleString('en-US');

        const dieselEl = document.getElementById('dashTotalDiesel');
        if (dieselEl) dieselEl.innerText = '$' + totalDieselCost.toLocaleString('en-US');

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

        if (typeof renderDashboardCharts === 'function') renderDashboardCharts(monthlyRev, paymentMethodMap);
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
                    datasets: [{ label: 'Monthly Revenue ($)', data: monthlyData, backgroundColor: 'rgba(5, 150, 105, 0.85)', borderRadius: 8 }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }

        const ctxPayment = document.getElementById('paymentMixChart');
        if (ctxPayment && typeof Chart !== 'undefined') {
            if (window.paymentMixChartInstance) window.paymentMixChartInstance.destroy();
            const paymentColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#6366f1', '#84cc16', '#64748b', '#cbd5e1'];
            window.paymentMixChartInstance = new Chart(ctxPayment, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(paymentData),
                    datasets: [{ data: Object.values(paymentData), backgroundColor: paymentColors, borderWidth: 2, borderColor: '#ffffff' }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } }, cutout: '65%' }
            });
        }
    } catch (e) {
        console.error("Error rendering charts:", e);
    }
}
window.renderDashboardCharts = renderDashboardCharts;

// ==========================================
// 10. NAVIGATION & TABS
// ==========================================
function switchTab(tabName) {
    try {
        const tabs = ['dashboard', 'jobs', 'users', 'reports', 'trash', 'rentals', 'warehouse', 'pdf-report', 'recycle-bin'];
        tabs.forEach(t => {
            [`tab-${t}`, `${t}-view`, t].forEach(id => {
                const tabEl = document.getElementById(id);
                if (tabEl) {
                    tabEl.classList.add('hidden');
                    tabEl.classList.remove('flex', 'block');
                    tabEl.style.setProperty('display', 'none', 'important');
                }
            });
            [`nav-${t}`, `nav-${t}-btn`, t].forEach(id => {
                const navEl = document.getElementById(id);
                if (navEl) navEl.className = 'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer';
            });
        });

        let activeTab = null;
        for (let id of [`tab-${tabName}`, `${tabName}-view`, tabName]) {
            activeTab = document.getElementById(id);
            if (activeTab) break;
        }
        if (activeTab) {
            activeTab.classList.remove('hidden');
            activeTab.classList.add('flex');
            activeTab.style.setProperty('display', 'flex', 'important');
        }

        let activeNav = null;
        for (let id of [`nav-${tabName}`, `nav-${tabName}-btn`, tabName]) {
            activeNav = document.getElementById(id);
            if (activeNav) break;
        }
        if (activeNav) {
            activeNav.className = 'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl bg-emerald-600 text-white font-medium shadow-md transition cursor-pointer';
        }

        if (tabName === 'dashboard') {
            setTimeout(updateDashboardAnalytics, 50);
        } else if (tabName === 'jobs') {
            if (typeof filterLedgerTable === 'function') filterLedgerTable();
        } else if (tabName === 'rentals' && typeof renderPrivateTruckRentalTab === 'function') {
            renderPrivateTruckRentalTab();
        } else if (tabName === 'warehouse' && typeof renderWarehouseTab === 'function') {
            renderWarehouseTab();
        } else if (tabName === 'reports') {
            if (typeof renderReportsTab === 'function') renderReportsTab();
            if (typeof window.renderSummaryPageWithDetailedTables === 'function') window.renderSummaryPageWithDetailedTables();
        } else if (tabName === 'users' && typeof renderUsers === 'function') {
            renderUsers();
        } else if (tabName === 'trash' && typeof renderTrashBin === 'function') {
            renderTrashBin();
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
