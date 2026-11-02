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
                route: item.route || ((item.route_from && item.route_to) ? `${item.route_from} → ${item.route_to}` : ''),
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
    const container = document.getElementById(containerId);
    if (!container) return '-';

    const rows = container.querySelectorAll('.payment-row');
    const paymentsList = [];

    rows.forEach(row => {
        const amountInput = row.querySelector('.payment-amount');
        const methodSelect = row.querySelector('.payment-method');

        const amount = amountInput ? amountInput.value.trim() : '';
        
        // التحقق من طريقة الدفع، وإذا لم يتم اختيارها أو كانت فارغة يتم تعيينها إلى "unspecified"
        let method = methodSelect ? methodSelect.value.trim() : '';
        if (!method) {
            method = 'unspecified';
        }

        // إذا أدخل المستخدم مبلغاً، يتم دمج المبلغ مع طريقة الدفع في نص واحد (مثال: 500 Cash)
        if (amount) {
            paymentsList.push(`${amount} ${method}`);
        }
    });

    // إذا كانت القائمة مليئة بالدفعات يتم دمجها بفاصل، وإذا لم تكن هناك دفعات يُعاد "-" أو قيمة فارغة
    return paymentsList.length > 0 ? paymentsList.join(', ') : '-';
}
window.extractPaymentsFromContainer = extractPaymentsFromContainer;

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
        
        const jobIdentifier = item.jobNo || item.job_no || item.id;
        
        // أزرار الإجراءات (تعديل وحذف) تظهر مباشرة
        const actions = `
            <div class="flex items-center space-x-1 justify-center gap-1">
                <button type="button" onclick="openEditJobModal('${jobIdentifier}')" class="px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg cursor-pointer transition" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                <button type="button" onclick="deleteJob('${jobIdentifier}')" class="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer transition" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;

        const dieselVal = (item.diesel && item.diesel !== '-') ? item.diesel : (item.diesel_expense || '-');
        const hotelVal = (item.hotel && item.hotel !== '-') ? item.hotel : (item.hotel_expense || '-');
        const helpersVal = parseHelpersDisplay(item.helpers || item.helpers_cost);
        const driversVal = parseDriversDisplay(item.drivers || item.drivers_cost); 
        const totalVal = item.total || item.total_amount || '-';
        const puVal = item.pu || item.pu_payments || '-';
        const destVal = item.destination || item.dest || item.destination_payments || '-';

        let totalNum = parseFloat(String(totalVal).replace(/[^0-9.]/g, '')) || 0;
        let foreman10Val = item.foreman10pct ? ('$' + item.foreman10pct) : (item.foreman_cost ? '$' + item.foreman_cost : (totalNum > 0 ? '$' + (totalNum * 0.1).toFixed(2) : '-'));

        return `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
                <td class="p-3 text-slate-700 font-medium">${item.date || '-'}</td>
                <td class="p-3 text-slate-900 font-bold">${item.jobNo || item.job_no || '-'}</td>
                <td class="p-3 text-slate-700">${item.route || ((item.route_from || '') + ' → ' + (item.route_to || '')) || '-'}</td>
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

function openEditJobModal(jobIdOrNo) {
    console.log("Editing Job ID/No:", jobIdOrNo);

    const jobs = window.masterJobs || JSON.parse(localStorage.getItem('movePro_masterJobs')) || [];
    const targetId = String(jobIdOrNo).trim();
    
    const job = jobs.find(j => {
        const jId = String(j.id || '').trim();
        const jNo = String(j.jobNo || j.job_no || '').trim();
        return jId === targetId || jNo.toLowerCase() === targetId.toLowerCase();
    });

    if (!job) {
        alert("Job record not found!");
        console.warn("Target ID requested:", targetId, "Available jobs:", jobs);
        return;
    }

    console.log("Successfully Loaded Job Data for Edit:", job);

    openAddModal(true);

    const jobForm = document.getElementById('jobForm');
    if (jobForm) {
        jobForm.setAttribute('data-edit-id', job.id || '');
    }

    function formatDateForInput(dateStr) {
        if (!dateStr) return '';
        try {
            const cleanDate = dateStr.split(' ')[0];
            const parts = cleanDate.split('/');
            if (parts.length === 3) {
                return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
            }
            return cleanDate;
        } catch (e) {
            return dateStr;
        }
    }

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val !== undefined && val !== null ? val : '';
    };

    setVal('jobDate', formatDateForInput(job.date || job.job_date || ''));
    setVal('jobNo', job.jobNo || job.job_no || job.job_number || '');

    // --- قراءة المسار من عمود route الموحد وفكه تلقائياً ---
    let routeStr = job.route || job.route_to || '';
    let fromVal = '';
    let toVal = '';

    if (routeStr.includes('→')) {
        const parts = routeStr.split('→');
        fromVal = parts[0] ? parts[0].trim() : '';
        toVal = parts[1] ? parts[1].trim() : '';
    } else if (routeStr.includes('->')) {
        const parts = routeStr.split('->');
        fromVal = parts[0] ? parts[0].trim() : '';
        toVal = parts[1] ? parts[1].trim() : '';
    } else {
        fromVal = routeStr; 
    }

    const fromEl = document.getElementById('routeFrom') || document.querySelector('[name="routeFrom"]') || document.querySelector('[name="route_from"]');
    if (fromEl) fromEl.value = fromVal;

    const toEl = document.getElementById('routeTo') || document.querySelector('[name="routeTo"]') || document.querySelector('[name="route_to"]');
    if (toEl) toEl.value = toVal;
    // -----------------------------------------------------

    setVal('jobForeman', job.foreman || job.foreman_name || job.foremanName || '');
    setVal('jobTotal', job.total || job.total_amount || job.totalAmount || '');

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

    const dieselValStr = String(job.diesel || job.diesel_expense || job.dieselExpense || '');
    const dieselParts = dieselValStr.split(' ');
    setVal('dieselAmount', dieselParts[0] !== '-' ? dieselParts[0] : '');
    if (dieselParts.length > 1) {
        const dieselMethod = document.getElementById('dieselMethod');
        if (dieselMethod) dieselMethod.value = dieselParts[1];
    }

    const hotelValStr = String(job.hotel || job.hotel_expense || job.hotelExpense || '');
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
    
    // تفريغ الحاوية أولاً لمنع تكرار الصفوف القديمة
    container.innerHTML = '';

    if (!paymentStr || paymentStr === '-' || paymentStr === '---' || paymentStr.toUpperCase() === 'NULL') {
        return;
    }

    // دعم الدفعات المتعددة المفصولة بفاصلة (مثل: "8240 Cash, 1000 Zelle" أو "3515")
    const payments = String(paymentStr).split(',');

    payments.forEach(p => {
        let trimmed = p.trim();
        if (!trimmed) return;

        let amount = '';
        let method = 'Unspecified'; // القيمة الافتراضية إذا لم توجد طريقة دفع

        // فصل المبلغ عن طريقة الدفع (مثال: "8240 Cash" -> المبلغ: 8240، الطريقة: Cash)
        const parts = trimmed.split(' ');
        if (parts.length >= 2) {
            amount = parts[0];
            method = parts.slice(1).join(' '); // لضمان التقاط اسم الطريقة كاملاً إن وجد مسافات
        } else {
            // إذا كان المدخل رقماً فقط بدون طريقة دفع (مثل "3515")
            amount = trimmed;
            method = 'unspecified';
        }

        // استدعاء دالة إضافة صف الدفع مع تمرير المبلغ والطريقة المستخرجة
        if (typeof addPaymentRow === 'function') {
            addPaymentRow(containerId, amount, method);
        }
    });
}
window.populatePaymentContainer = populatePaymentContainer;


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

    const routeValue = `${document.getElementById('routeFrom').value.trim()} → ${document.getElementById('routeTo').value.trim()}`;

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
        // --- تحديث السجل الحالي حصرياً وعدم إنشاء سجل جديد ---
        const { error: updateError } = await window.supabaseClient
            .from('jobs_report')
            .update(supabasePayload)
            .eq('id', editRecordId);
        error = updateError;
    } else {
        // --- إضافة سجل جديد فقط في حال لم يكن هناك معرف تعديل ---
        const { error: insertError } = await window.supabaseClient
            .from('jobs_report')
            .insert([supabasePayload]);
        error = insertError;
    }

    if (error) {
        console.error('Error saving to Supabase:', error.message);
        alert('Supabase Error: ' + error.message);
    } else {
        // تفريغ معرف التعديل لضمان عدم تكراره لاحقاً
        if (jobForm) jobForm.removeAttribute('data-edit-id');

        closeModal();
        if (typeof initMasterJobsData === 'function') {
            initMasterJobsData();
        }
        alert('Record saved successfully!');
    }
}
window.saveJob = saveJob;

async function deleteJob(jobIdOrNo) {
    if (!confirm('Are you sure you want to move this record to the Recycle Bin?')) return;

    if (!window.supabaseClient) {
        alert("Supabase client not initialized!");
        return;
    }

    const target = String(jobIdOrNo).trim();
    
    // بدلاً من الحذف النهائي (.delete())، نقوم بتحديث الحالة إلى محذوف (Soft Delete)
    let query = window.supabaseClient.from('jobs_report').update({ is_deleted: true });
    
    if (target.length > 10 || target.includes('-')) {
        query = query.eq('id', target);
    } else {
        query = query.eq('job_no', target);
    }

    const { error } = await query;

    if (error) {
        console.error('Error moving to Recycle Bin:', error.message);
        alert('Failed to move record to recycle bin: ' + error.message);
    } else {
        alert('Record moved to Recycle Bin successfully!');
        if (typeof initMasterJobsData === 'function') {
            initMasterJobsData();
        }
    }
}
window.deleteJob = deleteJob;


async function restoreJob(jobId) {
    if (!window.supabaseClient) return;

    const { error } = await window.supabaseClient
        .from('jobs_report')
        .update({ is_deleted: false })
        .eq('id', jobId);

    if (error) {
        alert('Failed to restore record: ' + error.message);
    } else {
        alert('Record restored successfully!');
        if (typeof renderTrashBin === 'function') renderTrashBin();
        if (typeof initMasterJobsData === 'function') initMasterJobsData();
    }
}
window.restoreJob = restoreJob;

// الحذف النهائي من قاعدة البيانات
async function permanentDeleteJob(jobId) {
    if (!confirm('Are you sure you want to permanently delete this record? This action cannot be undone.')) return;
    if (!window.supabaseClient) return;

    const { error } = await window.supabaseClient
        .from('jobs_report')
        .delete()
        .eq('id', jobId);

    if (error) {
        alert('Failed to delete permanently: ' + error.message);
    } else {
        alert('Record permanently deleted!');
        if (typeof renderTrashBin === 'function') renderTrashBin();
    }
}
window.permanentDeleteJob = permanentDeleteJob;


// ==========================================
// 7. DASHBOARD ANALYTICS & CHARTS (مصحح لتجميع مبالغ الدفع بدقة)
// ==========================================
// دالة تحليل وتحديث إحصائيات لوحة التحكم والرسوم البيانية
function updateDashboardAnalytics() {
    try {
        if (!window.masterJobs || window.masterJobs.length === 0) {
            console.warn("No masterJobs available for dashboard analytics.");
            return;
        }

        let totalRev = 0;
        let totalDieselCost = 0;
        let validJobsCount = 0; 
        const routeRevenueMap = {};
        
        // تجميع المبالغ المالية لكل طريقة دفع بدقة
        const paymentMethodMap = { Cash: 0, Zelle: 0, Cheque: 0, PMO: 0, BC: 0, PC: 0, CC: 0, WT: 0, Others: 0, Unspecified: 0 };
        const monthlyRev = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        window.masterJobs.forEach(job => {
            if (job.jobNo && (job.jobNo.toLowerCase().includes('cancel') || job.jobNo.toLowerCase().includes('none'))) {
                return; 
            }

            validJobsCount++; 
            totalDieselCost += parseAndSumDiesel(job.diesel || job.diesel_expense);

            let amt = 0;
            const rawTotal = job.total || job.total_amount || 0;
            if (rawTotal) {
                amt = parseFloat(String(rawTotal).replace(/[^0-9.]/g, '')) || 0;
            }
            totalRev += amt;

            if (job.month && job.month >= 1 && job.month <= 12) {
                monthlyRev[job.month - 1] += amt;
            }
            
            const jobRoute = job.route || (job.route_from && job.route_to ? `${job.route_from} → ${job.route_to}` : '');
            if (jobRoute) {
                routeRevenueMap[jobRoute] = (routeRevenueMap[jobRoute] || 0) + amt;
            }

            // استخراج المبالغ وطرق الدفع من حقول PU و Dest بدقة
            let puStr = String(job.pu || job.pu_payments || '').trim();
            let destStr = String(job.dest || job.destination_payments || '').trim();

            let hasPu = puStr !== '' && puStr !== '-' && puStr !== '---';
            let hasDest = destStr !== '' && destStr !== '-' && destStr !== '---';

            if (typeof assignPaymentMethodRevenue === 'function') {
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
            } else {
                paymentMethodMap.Unspecified += amt;
            }
        });

        window.currentPaymentMethodMap = paymentMethodMap;
        const avgJobVal = validJobsCount > 0 ? (totalRev / validJobsCount) : 0;

        // تحديث عناصر الـ UI في لوحة التحكم
        const revEl = document.getElementById('dashTotalRevenue');
        if (revEl) revEl.innerText = '$' + totalRev.toLocaleString('en-US');

        const jobsTextEl = document.getElementById('dashCompletedJobsText');
        if (jobsTextEl) jobsTextEl.innerHTML = `<i class="fa-solid fa-truck-check mr-1"></i>${validJobsCount} Active Dispatches`;

        const avgEl = document.getElementById('dashAvgJobValue');
        if (avgEl) avgEl.innerText = '$' + Math.round(avgJobVal).toLocaleString('en-US');

        const dieselEl = document.getElementById('dashTotalDiesel');
        if (dieselEl) dieselEl.innerText = '$' + totalDieselCost.toLocaleString('en-US');

        // تحديث قائمة الممرات والمسارات الأكثر ربحية
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

        // استدعاء دالة رسم المخططات البيانية
        if (typeof renderDashboardCharts === 'function') {
            renderDashboardCharts(monthlyRev, paymentMethodMap);
        }
    } catch (e) {
        console.error("Error updating dashboard analytics:", e);
    }
}
window.updateDashboardAnalytics = updateDashboardAnalytics;

// دالة رسم وتحديث المخططات البيانية باستخدام Chart.js
function renderDashboardCharts(monthlyData, paymentData) {
    try {
        // 1. رسم مخطط الإيرادات الشهرية (Bar Chart)
        const ctxRevenue = document.getElementById('revenueChart');
        if (ctxRevenue && typeof Chart !== 'undefined') {
            if (window.revenueChartInstance) {
                window.revenueChartInstance.destroy();
            }
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

        // 2. رسم مخطط توزيع طرق الدفع (Doughnut Chart)
        const ctxPayment = document.getElementById('paymentMixChart');
        if (ctxPayment && typeof Chart !== 'undefined') {
            if (window.paymentMixChartInstance) {
                window.paymentMixChartInstance.destroy();
            }
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
window.addEventListener('DOMContentLoaded', async () => {
    try {
        window.currentUserRole = 'Admin';
        
        if (typeof checkPermissions === 'function') checkPermissions();
        if (typeof renderUsers === 'function') renderUsers();
        
        // 🌟 جلب البيانات لكل الأقسام عند بدء التشغيل لتجنب الشاشات الفارغة
        const promises = [];
        
        if (typeof initMasterJobsData === 'function') {
            promises.push(initMasterJobsData());
        }
        if (typeof loadPrivateTruckRentals === 'function') {
            promises.push(loadPrivateTruckRentals());
        }
        if (typeof loadWarehouseData === 'function') {
            promises.push(loadWarehouseData());
        }

        // انتظار انتهاء جلب كافة البيانات ثم فتح الداشبورد
        await Promise.all(promises);

        if (typeof switchTab === 'function') {
            switchTab('dashboard');
        }

        if (typeof updateSummaryReportView === 'function') {
            updateSummaryReportView();
        }
    } catch (error) {
        console.error("Initialization error on DOMContentLoaded:", error);
    }
});
