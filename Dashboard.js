/**
 * MovePro - Dashboard & Analytics Module
 */

// Global Chart Instances
if (typeof window.revenueChartInstance === 'undefined') {
    window.revenueChartInstance = null;
}

if (typeof window.paymentMixChartInstance === 'undefined') {
    window.paymentMixChartInstance = null;
}

function updateDashboardAnalytics() {
    if (!window.masterJobs || !Array.isArray(window.masterJobs) || window.masterJobs.length === 0) {
        const revEl = document.getElementById('dashTotalRevenue');
        if (revEl) revEl.innerText = '$0';
        const jobsTextEl = document.getElementById('dashCompletedJobsText');
        if (jobsTextEl) jobsTextEl.innerHTML = `<i class="fa-solid fa-truck-check mr-1"></i>0 Active Dispatches`;
        const avgEl = document.getElementById('dashAvgJobValue');
        if (avgEl) avgEl.innerText = '$0';
        const dieselEl = document.getElementById('dashTotalDiesel');
        if (dieselEl) dieselEl.innerText = '$0';
        return;
    }

    let totalRev = 0;
    let totalDieselCost = 0; 
    let validJobsCount = 0;  
    const routeRevenueMap = {};
    
    const paymentMethodMap = {  
        Cash: 0,  
        Zelle: 0,  
        Cheque: 0,  
        PMO: 0,  
        BC: 0,  
        PC: 0,  
        CC: 0,  
        WT: 0,  
        Others: 0  
    };
    
    const monthlyRev = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    masterJobs.forEach(job => {
        if (job.jobNo && (job.jobNo.toLowerCase().includes('cancel') || job.jobNo.toLowerCase().includes('none'))) {
            return; 
        }

        validJobsCount++; 

        if (typeof parseAndSumDiesel === 'function') {
            totalDieselCost += parseAndSumDiesel(job.diesel);
        } else {
            let dAmt = parseFloat(String(job.diesel || '').replace(/[^0-9.]/g, '')) || 0;
            totalDieselCost += dAmt;
        }

        let amt = 0;
        if (job.total) {
            amt = parseFloat(String(job.total).replace(/[^0-9.]/g, '')) || 0;
        }
        totalRev += amt;

        if (job.month && job.month >= 1 && job.month <= 12) {
            monthlyRev[job.month - 1] += amt;
        }

        if (job.route && job.route !== '-') {
            routeRevenueMap[job.route] = (routeRevenueMap[job.route] || 0) + amt;
        }

        const extractMethods = (text) => {
            if (!text || text === '-') return;
            const lower = String(text).toLowerCase();
            
            if (lower.includes('cash')) paymentMethodMap.Cash++;
            else if (lower.includes('zelle')) paymentMethodMap.Zelle++;
            else if (lower.includes('cheque')) paymentMethodMap.Cheque++;
            else if (lower.includes('pmo')) paymentMethodMap.PMO++;
            else if (lower.includes('bc')) paymentMethodMap.BC++;
            else if (lower.includes('pc')) paymentMethodMap.PC++;
            else if (lower.includes('cc')) paymentMethodMap.CC++;
            else if (lower.includes('wt')) paymentMethodMap.WT++;
            else paymentMethodMap.Others++;
        };

        extractMethods(job.pu);
        extractMethods(job.dest);
    });

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
        const sortedRoutes = Object.entries(routeRevenueMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);

        if (sortedRoutes.length === 0) {
            topCorridorsContainer.innerHTML = `<p class="text-slate-400 text-xs">No route data available</p>`;
        } else {
            topCorridorsContainer.innerHTML = sortedRoutes.map(([route, rev], idx) => `
                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div class="flex items-center space-x-2">
                        <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center">${idx + 1}</span>
                        <span class="font-bold text-emerald-800">${route}</span>
                    </div>
                    <span class="font-extrabold text-slate-900">$${rev.toLocaleString('en-US')}</span>
                </div>
            `).join('');
        }
    }

    if (typeof renderDashboardCharts === 'function') {
        renderDashboardCharts(monthlyRev, paymentMethodMap);
    }
}
window.updateDashboardAnalytics = updateDashboardAnalytics;

function renderDashboardCharts(monthlyData, paymentData) {
    // 1. مخطط الإيرادات الشهرية (Bar Chart)
    const ctxRevenue = document.getElementById('revenueChart');
    if (ctxRevenue) {
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

    const ctxPayment = document.getElementById('paymentMixChart');
    if (ctxPayment) {
        if (window.paymentMixChartInstance) {
            window.paymentMixChartInstance.destroy();
        }
        
        const paymentColors = [
            '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', 
            '#06b6d4', '#ec4899', '#6366f1', '#84cc16', '#64748b'
        ];

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
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
                },
                cutout: '65%'
            }
        });
    }
}
window.renderDashboardCharts = renderDashboardCharts;
