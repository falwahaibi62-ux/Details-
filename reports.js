function switchReportMode(mode) {
    const summaryView = document.getElementById('summaryReportView');
    const detailedView = document.getElementById('detailedReportView');
    const btnSummary = document.getElementById('btnSummaryMode');
    const btnDetailed = document.getElementById('btnDetailedMode');

    if (!summaryView || !detailedView) return;

    if (mode === 'summary') {
        summaryView.classList.remove('hidden');
        detailedView.classList.add('hidden');
        if (btnSummary) btnSummary.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white transition';
        if (btnDetailed) btnDetailed.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
        generateSummaryReportData();
    } else {
        summaryView.classList.add('hidden');
        detailedView.classList.remove('hidden');
        if (btnDetailed) btnDetailed.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white transition';
        if (btnSummary) btnSummary.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
        generateDetailedReportData();
    }
}

function parseCurrency(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

function generateSummaryReportData() {
    const jobs = JSON.parse(localStorage.getItem('movePro_masterJobs')) || [];
    const rentals = JSON.parse(localStorage.getItem('movepro_private_truck_rentals')) || [];
    const warehouse = JSON.parse(localStorage.getItem('movepro_warehouse_records')) || [];

    const totalJobsCount = jobs.length;
    const totalDeliveriesCount = jobs.filter(j => j.jobNo && String(j.jobNo).toLowerCase().includes('delivery')).length;

    let totalRevenue = 0;
    jobs.forEach(j => {
        totalRevenue += parseCurrency(j.total);
    });

    let totalRentalExp = 0;
    rentals.forEach(r => {
        totalRentalExp += parseCurrency(r.amount);
    });

    let totalWarehouseExp = 0;
    warehouse.forEach(w => {
        totalWarehouseExp += parseCurrency(w.amount);
    });

    const sumJobsEl = document.getElementById('sumTotalJobs');
    const sumDelivEl = document.getElementById('sumTotalDeliveries');
    const sumRevEl = document.getElementById('sumTotalRevenue');
    const sumExpEl = document.getElementById('sumTotalExpenses');

    if (sumJobsEl) sumJobsEl.innerText = totalJobsCount;
    if (sumDelivEl) sumDelivEl.innerText = totalDeliveriesCount;
    if (sumRevEl) sumRevEl.innerText = '$' + totalRevenue.toLocaleString();
    if (sumExpEl) sumExpEl.innerText = '$' + (totalRentalExp + totalWarehouseExp).toLocaleString();

    // مصفوفة لتجميع الإيرادات حسب الأشهر (من الشهر 0 إلى 11)
    const monthlyRevenue = Array(12).fill(0);
    jobs.forEach(j => {
        if (j.date) {
            const dateObj = new Date(j.date);
            const month = dateObj.getMonth(); // 0 = January, 7 = August, etc.
            if (!isNaN(month)) {
                monthlyRevenue[month] += parseCurrency(j.total);
            }
        }
    });

    const matrixBody = document.getElementById('summaryMatrixBody');
    if (matrixBody) {
        matrixBody.innerHTML = `
            <tr class="text-slate-700 font-medium border-b">
                <td class="p-3 border">$${monthlyRevenue[0].toLocaleString()}</td>
                <td class="p-3 border">$${monthlyRevenue[1].toLocaleString()}</td>
                <td class="p-3 border">$${monthlyRevenue[2].toLocaleString()}</td>
                <td class="p-3 border">$${monthlyRevenue[3].toLocaleString()}</td>
                <td class="p-3 border">$${monthlyRevenue[4].toLocaleString()}</td>
                <td class="p-3 border">$${monthlyRevenue[5].toLocaleString()}</td>
                <td class="p-3 border">$${monthlyRevenue[6].toLocaleString()}</td>
                <td class="p-3 border">$${monthlyRevenue[7].toLocaleString()}</td>
                <td class="p-3 border">$${monthlyRevenue[8].toLocaleString()}</td>
                <td class="p-3 border">$${monthlyRevenue[9].toLocaleString()}</td>
                <td class="p-3 border">$${monthlyRevenue[10].toLocaleString()}</td>
                <td class="p-3 border">$${monthlyRevenue[11].toLocaleString()}</td>
                <td class="p-3 border font-bold text-emerald-600">$${totalRevenue.toLocaleString()}</td>
            </tr>
        `;
    }
}
function generateDetailedReportData() {
    const jobs = JSON.parse(localStorage.getItem('movePro_masterJobs')) || [];
    const tbody = document.getElementById('detailedReportBody');
    if (!tbody) return;

    if (jobs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-400">No records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = jobs.map(item => `
        <tr class="border-b hover:bg-slate-50 transition">
            <td class="p-3 border">${item.date || '-'}</td>
            <td class="p-3 border font-semibold text-slate-800">${item.jobNo || '-'}</td>
            <td class="p-3 border">${item.from || '-'} → ${item.to || '-'}</td>
            <td class="p-3 border">${item.foreman || '-'}</td>
            <td class="p-3 border">${item.helpers || '-'}</td>
            <td class="p-3 border">${item.drivers || '-'}</td>
            <td class="p-3 border font-bold text-emerald-600">${item.total || '-'}</td>
            <td class="p-3 border">${item.puPayment || '-'}</td>
        </tr>
    `).join('');
}

function renderReportsTab() {
    switchReportMode('summary');
}
