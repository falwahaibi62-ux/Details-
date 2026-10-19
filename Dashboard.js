function updateDashboardAnalytics() {
    let totalRevenue = 0;
    let totalJobs = masterJobs.length;

    masterJobs.forEach(job => {
        if (job.total && job.total !== '-') {
            const num = parseFloat(job.total.replace(/[^0-9.]/g, ''));
            if (!isNaN(num)) totalRevenue += num;
        }
    });

    const revEl = document.getElementById('totalRevenueCard');
    if (revEl) revEl.innerText = '$' + totalRevenue.toLocaleString('en-US');

    const jobsCountEl = document.getElementById('activeJobsCount');
    if (jobsCountEl) jobsCountEl.innerText = totalJobs + ' Active Dispatches';

    if (typeof renderDashboardCharts === 'function') {
        renderDashboardCharts([], {});
    }
}
