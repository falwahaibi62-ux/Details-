if (typeof window.currentUserRole === 'undefined') window.currentUserRole = 'Admin';
if (typeof window.currentLoggedInUser === 'undefined') window.currentLoggedInUser = null;
if (typeof window.revenueChartInstance === 'undefined') window.revenueChartInstance = null;
if (typeof window.paymentMixChartInstance === 'undefined') window.paymentMixChartInstance = null;

// ==========================================
// 1. DATA INITIALIZATION & SUPABASE CLOUD SYNC
// ==========================================
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

function formatJobDateToSlash(dateStr) {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, mon, day] = dateStr.split('-');
        return `${parseInt(mon, 10)}/${parseInt(day, 10)}/${year}`;
    }
    return dateStr;
}

// 🌟 جلب البيانات سحابياً من جدول jobs_report مع استخراج الشهر والسنة بدقة تامة
async function initMasterJobsData() {
    try {
        if (!window.supabaseClient) {
            console.error("Supabase client is not initialized!");
            return;
        }

        const { data, error } = await window.supabaseClient
            .from('jobs_report')
            .select('*');

        if (error) {
            console.error("Error fetching jobs from Supabase:", error);
            window.masterJobs = [];
            return;
        }

        window.masterJobs = (data || []).map(item => {
            let dVal = item.date || '';
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

            return {
                date: dVal,
                month: mVal,
                year: yVal,
                jobNo: item.job_no || '',
                route: (item.route_from && item.route_to) ? `${item.route_from} → ${item.route_to}` : (item.route || ''),
                foreman: item.foreman_name || '',
                foreman10pct: item.foreman_cost || '0',
                total: item.total_amount || '$0',
                helpers: item.helpers_cost || '-',
                drivers: item.drivers_cost || '-',
                pu: item.pu_payments || '-',
                dest: item.destination_payments || '-',
                diesel: item.diesel_expense || '-',
                hotel: item.hotel_expense || '-',
                storage: item.storage || '-'
            };
        });

        // ترتيب السجلات تلقائياً من الأحدث للأقدم
        window.masterJobs.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
        });

        populateYearFilter();
        filterJobsTable();
        updateDashboardAnalytics();

    } catch (e) {
        console.error("Error initializing master jobs from Supabase:", e);
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

    if (!window.masterJobs) return;
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
    const monthEl = document.getElementById('filterMonth');
    const yearEl = document.getElementById('filterYear');
    
    const monthVal = monthEl ? monthEl.value : 'ALL';
    const yearVal = yearEl ? yearEl.value : 'ALL';

    let filtered = window.masterJobs || [];

    if (monthVal && monthVal !== 'ALL' && monthVal !== 'All Months') {
        filtered = filtered.filter(job => job.month && job.month.toString() === monthVal);
    }
    
    if (yearVal && yearVal !== 'ALL' && yearVal !== 'All Years') {
        filtered = filtered.filter(job => job.year && job.year.toString() === yearVal);
    }

    const countText = document.getElementById('filteredCountText');
    if (countText) {
        countText.innerText = `Showing ${filtered.length} of ${(window.masterJobs || []).length} records`;
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
function addPaymentRow(containerId, amount = '', method = 'Cash') {
    let container = document.getElementById(containerId);
    if (!container && containerId === 'destContextContainer') {
        container = document.getElementById('destContainer');
    }
    if (!container && containerId === 'destContainer') {
        container = document.getElementById('destContextContainer');
    }
    
    if (!container) return;

    const rowId = 'payment_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const rowDiv = document.createElement('div');
    rowDiv.className = 'flex items-center gap-2 payment-row mt-2';
    rowDiv.id = rowId;

    rowDiv.innerHTML = `
        <input type="text" placeholder="Amount (e.g. 500)" value="${amount}" class="flex-1 p-2.5 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 payment-amount">
        <select class="w-32 p-2.5 border rounded-xl text-xs font-semibold bg-white focus:outline-none focus:border-emerald-500 payment-method">
            <option value="Cash" ${method.toLowerCase() === 'cash' ? 'selected' : ''}>Cash</option>
            <option value="Zelle" ${method.toLowerCase() === 'zelle' ? 'selected' : ''}>Zelle</option>
            <option value="Cheque" ${['cheque', 'ck', 'check'].includes(method.toLowerCase()) ? 'selected' : ''}>Cheque</option>
            <option value="PMO" ${method.toUpperCase() === 'PMO' ? 'selected' : ''}>PMO</option>
            <option value="BC" ${method.toUpperCase() === 'BC' ? 'selected' : ''}>BC</option>
            <option value="PC" ${method.toUpperCase() === 'PC' ? 'selected' : ''}>PC</option>
            <option value="CC" ${method.toUpperCase() === 'CC' ? 'selected' : ''}>CC</option>
            <option value="WT" ${method.toUpperCase() === 'WT' ? 'selected' : ''}>WT</option>
            <option value="Others" ${['others', 'other'].includes(method.toLowerCase()) ? 'selected' : ''}>Others</option>
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
// 4. HELPERS & DRIVERS MAPPERS
// ==========================================
function parseHelpersDisplay(val) {
    if (!val || val === '-' || val === '0' || val === 0) return '-';
    let strVal = String(val).trim();
    
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

    let num = 0;
    let match = strVal.match(/\(([\d.]+)\)/);
    if (match) {
        num = parseFloat(match[1]);
    } else {
        num = parseFloat(strVal.replace(/[^0-9.]/g, ''));
    }

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
        112.5: "1/2 (112.5)",
        225: "1 (225)",
        250: "1-1 1/2 (250)",
        337: "1-1 1/2 (337)",
        400: "2 (400)",
        450: "2 (450)",
        500: "2-1 1/2 (500)",
        675: "2-1 1/2 (675)"
    };

    return driversMap[num] || strVal;
}

window.parseHelpersDisplay = parseHelpersDisplay;
window.parseDriversDisplay = parseDriversDisplay;

// ==========================================
// 5. RENDERING CRUD TABLE
// ==========================================
function renderJobsCRUD(dataToRender) {
    const tbody = document.getElementById('jobsTableBody');
    if (!tbody) return;
    
    const records = dataToRender || window.masterJobs || [];

    if (!records || records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="text-center p-6 text-slate-400 text-xs">No dispatch records found</td></tr>`;
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
                    <button type="button" onclick="deleteJob('${item.jobNo}')" class="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;
        }

        const dieselVal = (item.diesel && item.diesel !== '-') ? item.diesel : '-';
        const hotelVal = (item.hotel && item.hotel !== '-') ? item.hotel : '-';
        const helpersVal = parseHelpersDisplay(item.helpers);
        const driversVal = parseDriversDisplay(item.drivers); 
        const puVal = (item.pu && item.pu !== '-') ? item.pu : '-';
        const rawDest = item.destination || item.dest;
        const destVal = (rawDest && rawDest !== '-') ? rawDest : '-';
        const totalVal = (item.total && item.total !== '-') ? item.total : '-';

        let totalNum = parseFloat(String(totalVal).replace(/[^0-9.]/g, '')) || 0;
        let foreman10Val = item.foreman10pct ? ('$' + item.foreman10pct) : (totalNum > 0 ? '$' + (totalNum * 0.1).toFixed(2) : '-');

        return `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
                <td class="p-3 text-slate-700 font-medium">${item.date || '-'}</td>
                <td class="p-3 text-slate-900 font-bold">${item.jobNo || '-'}</td>
                <td class="p-3 text-slate-700">${item.route || '-'}</td>
                <td class="p-3">${foremanDisplay}</td>
                <td class="p-3 text-emerald-800 font-bold">${foreman10Val}</td>
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
// 6. MODAL & SUPABASE CRUD ACTIONS
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
        const puContainer = document.getElementById('puContainer');
        const destContainer = document.getElementById('destContainer') || document.getElementById('destContextContainer');
        if (puContainer) puContainer.innerHTML = '';
        if (destContainer) destContainer.innerHTML = '';
    }
}
window.openAddModal = openAddModal;

function parseAndSumDiesel(val) {
    if (!val || val === '-' || val === '0' || val === 0) return 0;
    if (typeof val === 'number') return val;

    let strVal = String(val).trim();
    if (strVal.includes('+')) {
        let parts = strVal.split('+');
        let sum = 0;
        parts.forEach(part => {
            let cleanNum = parseFloat(part.replace(/[^0-9.]/g, '')) || 0;
            sum += cleanNum;
        });
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
    const dateRaw = dateInput ? dateInput.value : '';
    let dateVal = dateRaw ? formatJobDateToSlash(dateRaw) : '';

    let totalRaw = document.getElementById('jobTotal') ? document.getElementById('jobTotal').value.trim() : '-';
    let totalFormatted = totalRaw && totalRaw !== '-' && !totalRaw.startsWith('$') ? '$' + totalRaw : totalRaw;

    let totalNum = parseFloat(String(totalFormatted).replace(/[^0-9.]/g, '')) || 0;
    let foreman10Val = totalNum > 0 ? (totalNum * 0.1).toFixed(0) : '0';

    const fromVal = document.getElementById('routeFrom') ? document.getElementById('routeFrom').value.trim().toUpperCase() : '';
    const toVal = document.getElementById('routeTo') ? document.getElementById('routeTo').value.trim().toUpperCase() : '';

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

    const supabasePayload = {
        date: dateVal,
        job_no: jobNoVal,
        route_from: fromVal,
        route_to: toVal,
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

    const { error } = await window.supabaseClient
        .from('jobs_report')
        .insert([supabasePayload]);

    if (error) {
        console.error('Error saving to Supabase:', error.message);
        alert('Supabase Error: ' + error.message);
    } else {
        closeModal();
        initMasterJobsData();
        alert('تم حفظ السجل بنجاح في السحابة!');
    }
}
window.saveJob = saveJob;

async function deleteJob(jobNo) {
    if (!confirm('Are you sure you want to delete this dispatch record from cloud?')) return;

    if (!window.supabaseClient) {
        alert("Supabase client not initialized!");
        return;
    }

    const { error } = await window.supabaseClient
        .from('jobs_report')
        .delete()
        .eq('job_no', jobNo);

    if (error) {
        console.error('Error deleting from Supabase:', error);
        alert('Failed to delete record from cloud database.');
    } else {
        initMasterJobsData();
    }
}
window.deleteJob = deleteJob;

// ==========================================
// 7. DASHBOARD ANALYTICS & CHARTS (مصحح لتجميع مبالغ الدفع بدقة)
// ==========================================
function updateDashboardAnalytics() {
    try {
        if (!window.masterJobs || window.masterJobs.length === 0) return;

        let totalRev = 0;
        let totalDieselCost = 0;
        let validJobsCount = 0; 
        const routeRevenueMap = {};
        
        // تجميع المبالغ المالية لكل طريقة دفع وليس العدّ
        const paymentMethodMap = { Cash: 0, Zelle: 0, Cheque: 0, PMO: 0, BC: 0, PC: 0, CC: 0, WT: 0, Others: 0, Unspecified: 0 };
        const monthlyRev = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        window.masterJobs.forEach(job => {
            if (job.jobNo && (job.jobNo.toLowerCase().includes('cancel') || job.jobNo.toLowerCase().includes('none'))) {
                return; 
            }

            validJobsCount++; 
            totalDieselCost += parseAndSumDiesel(job.diesel);

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

            // استخراج المبالغ وطرق الدفع من حقول PU و Dest بدقة
            let puStr = String(job.pu || '').trim();
            let destStr = String(job.dest || '').trim();

            let hasPu = puStr !== '' && puStr !== '-' && puStr !== '---';
            let hasDest = destStr !== '' && destStr !== '-' && destStr !== '---';

            if (hasPu && !hasDest) {
                assignPaymentMethodRevenue(puStr, amt, paymentMethodMap);
            } else if (!hasPu && hasDest) {
                assignPaymentMethodRevenue(destStr, amt, paymentMethodMap);
            } else if (hasPu && hasDest) {
                assignPaymentMethodRevenue(puStr, amt / 2, paymentMethodMap);
                assignPaymentMethodRevenue(destStr, amt / 2, paymentMethodMap);
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

        renderDashboardCharts(monthlyRev, paymentMethodMap);
    } catch (e) {
        console.error("Error updating dashboard analytics:", e);
    }
}
window.updateDashboardAnalytics = updateDashboardAnalytics;

function assignPaymentMethodRevenue(methodStr, amount, map) {
    // 🌟 إذا كانت سلسلة طريقة الدفع فارغة أو غير متوفرة، تُصنف فوراً تحت Unspecified
    if (!methodStr || methodStr === '-' || methodStr === '---' || String(methodStr).trim() === '') {
        map.Unspecified = (map.Unspecified || 0) + amount;
        return;
    }

    const upperPay = String(methodStr).toUpperCase();
    let matched = false;

    if (upperPay.includes('CASH')) { map.Cash += amount; matched = true; }
    else if (upperPay.includes('ZELLE')) { map.Zelle += amount; matched = true; }
    else if (upperPay.includes('CHEQUE') || upperPay.includes('CK') || upperPay.includes('CHECK')) { map.Cheque += amount; matched = true; }
    else if (upperPay.includes('PMO')) { map.PMO += amount; matched = true; }
    else if (upperPay.includes('BC')) { map.BC += amount; matched = true; }
    else if (upperPay.includes('PC')) { map.PC += amount; matched = true; }
    else if (upperPay.includes('CC')) { map.CC += amount; matched = true; }
    else if (upperPay.includes('WT')) { map.WT += amount; matched = true; }
    else if (upperPay.includes('OTHER') || upperPay.includes('OTHERS')) { map.Others += amount; matched = true; }

    // إذا كانت تحتوي على نص غير معروف ضمن القائمة، تذهب إلى Others
    if (!matched) {
        map.Others += amount;
    }
}

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
            const paymentColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#6366f1', '#84cc16', '#64748b', '#cbd5e1'];

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
        const tabs = ['dashboard', 'jobs', 'users', 'reports', 'trash', 'rentals', 'warehouse', 'pdf-report', 'recycle-bin'];
        
        // إخفاء جميع التبويبات وإعادة تعيين الأزرار
        tabs.forEach(t => {
            const possibleElIds = [`tab-${t}`, `${t}-view`, t];
            possibleElIds.forEach(id => {
                const tabEl = document.getElementById(id);
                if (tabEl) {
                    tabEl.classList.add('hidden');
                    tabEl.classList.remove('flex', 'block');
                    tabEl.style.setProperty('display', 'none', 'important');
                }
            });

            const possibleNavIds = [`nav-${t}`, `nav-${t}-btn`, t];
            possibleNavIds.forEach(id => {
                const navEl = document.getElementById(id);
                if (navEl) {
                    navEl.className = 'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer';
                }
            });
        });

        // إظهار التبويب المطلوب
        const targetIds = [`tab-${tabName}`, `${tabName}-view`, tabName];
        let activeTab = null;
        for (let id of targetIds) {
            activeTab = document.getElementById(id);
            if (activeTab) break;
        }

        if (activeTab) {
            activeTab.classList.remove('hidden');
            activeTab.classList.add('flex');
            activeTab.style.setProperty('display', 'flex', 'important');
        }

        // تنشيط زر القائمة الجانبية
        const navTargetIds = [`nav-${tabName}`, `nav-${tabName}-btn`, tabName];
        let activeNav = null;
        for (let id of navTargetIds) {
            activeNav = document.getElementById(id);
            if (activeNav) break;
        }

        if (activeNav) {
            activeNav.className = 'w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl bg-emerald-600 text-white font-medium shadow-md transition cursor-pointer';
        }

        // 🌟 استدعاء دالة البيانات الخاصة بكل شاشة عند فتحها
        if (tabName === 'dashboard') {
            setTimeout(updateDashboardAnalytics, 50);
        } else if (tabName === 'jobs') {
            if (typeof filterJobsTable === 'function') filterJobsTable();
        } else if (tabName === 'rentals') {
            if (typeof renderPrivateTruckRentalTab === 'function') {
                renderPrivateTruckRentalTab();
            } else {
                console.warn("renderPrivateTruckRentalTab function is not loaded yet.");
            }
        } else if (tabName === 'warehouse') {
            if (typeof renderWarehouseTab === 'function') {
                renderWarehouseTab();
            } else {
                console.warn("renderWarehouseTab function is not loaded yet.");
            }
        } else if (tabName === 'reports') {
            if (typeof renderReportsTab === 'function') renderReportsTab();
        } else if (tabName === 'users') {
            if (typeof renderUsers === 'function') renderUsers();
        } else if (tabName === 'trash') {
            if (typeof renderTrashBin === 'function') renderTrashBin();
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
        window.currentUserRole = 'Admin';
        checkPermissions();
        renderUsers();
        
        // جلب البيانات مرة واحدة فقط عند بدء التشغيل
        initMasterJobsData().then(() => {
            switchTab('dashboard');
        });

        if (typeof updateSummaryReportView === 'function') {
            updateSummaryReportView();
        }
    } catch (error) {
        console.error("Initialization error on DOMContentLoaded:", error);
    }
});
