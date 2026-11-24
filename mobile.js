/* Phone layout helpers: bottom tab bar highlight + tables shown as cards.
   Everything here only changes how things look on screens under 768px; no data or logic is touched. */
(function () {
    'use strict';

    // ---- Bottom tab bar: keep the active tab highlighted ----
    var current = 'dashboard';
    function paintBar() {
        var bar = document.getElementById('mobileTabBar'); if (!bar) return;
        Array.prototype.forEach.call(bar.querySelectorAll('[data-mtab]'), function (b) {
            b.classList.toggle('active', b.getAttribute('data-mtab') === current);
        });
    }
    function wrapSwitchTab() {
        if (typeof window.switchTab !== 'function' || window.switchTab.__mobileWrapped) return;
        var orig = window.switchTab;
        var wrapped = function (name) {
            var r = orig.apply(this, arguments);
            current = (name === 'recycle-bin') ? 'trash' : name;
            if (['dashboard', 'jobs', 'rentals', 'reports'].indexOf(current) < 0) current = 'more';
            paintBar();
            // after choosing a page from the drawer, close the drawer
            if (typeof window.toggleSidebar === 'function' && document.body.classList.contains('sidebar-open')) window.toggleSidebar(false);
            return r;
        };
        wrapped.__mobileWrapped = true;
        window.switchTab = wrapped;
    }

    // ---- Tables as cards: give each cell its column title (CSS shows it on phones) ----
    function labelTables() {
        Array.prototype.forEach.call(document.querySelectorAll('main table'), function (t) {
            var head = t.tHead; if (!head || head.rows.length !== 1) return; // multi-row headers keep the scroll view
            var labels = [];
            Array.prototype.forEach.call(head.rows[0].cells, function (th) {
                var txt = (th.textContent || '').replace(/\s+/g, ' ').trim();
                for (var i = 0; i < (th.colSpan || 1); i++) labels.push(txt);
            });
            if (!labels.length) return;
            t.classList.add('m-cards');
            Array.prototype.forEach.call(t.tBodies, function (tb) {
                Array.prototype.forEach.call(tb.rows, function (tr) {
                    if (tr.cells.length !== labels.length) { tr.classList.add('m-wide'); return; }
                    tr.classList.remove('m-wide');
                    Array.prototype.forEach.call(tr.cells, function (td, i) {
                        if (td.getAttribute('data-label') !== labels[i]) td.setAttribute('data-label', labels[i]);
                    });
                });
            });
        });
    }

    var queued = false;
    function schedule() {
        if (queued) return; queued = true;
        window.requestAnimationFrame(function () { queued = false; labelTables(); });
    }

    // Compact lists on phones: tap a row to show / hide its full details (buttons and links keep working)
    document.addEventListener('click', function (e) {
        var tr = e.target.closest ? e.target.closest('#masterJobsTableBody tr, #truckRentalTableBody tr, #warehouseTableBody tr, #trashTableBody tr, #noDocBody tr, tbody[data-compact] tr') : null;
        if (!tr || tr.classList.contains('m-wide')) return;
        if (e.target.closest('button, a, input, select, label')) return;
        tr.classList.toggle('open');
    });

    // ---- Refresh: reload the data from the server and redraw, staying on the current page ----
    var refreshing = false;
    function hint(text, ms) {
        var el = document.getElementById('pullHint'); if (!el) return;
        el.textContent = text; el.classList.remove('hidden');
        if (ms) setTimeout(function () { el.classList.add('hidden'); }, ms);
    }
    window.WathekRefresh = async function () {
        if (refreshing) return; refreshing = true;
        var icons = document.querySelectorAll('#mobileRefreshBtn i, #desktopRefreshBtn i'); Array.prototype.forEach.call(icons, function (i) { i.classList.add('fa-spin'); });
        hint('Refreshing...');
        try {
            var jobs = [];
            if (typeof window.initMasterJobsData === 'function') jobs.push(window.initMasterJobsData());
            if (typeof window.loadPrivateTruckRentals === 'function') jobs.push(window.loadPrivateTruckRentals());
            if (typeof window.loadWarehouseData === 'function') jobs.push(window.loadWarehouseData());
            if (window.WathekDocs) jobs.push(window.WathekDocs.loadIndex());
            if (typeof window.fetchUsersFromSupabase === 'function' && window.currentUserRole === 'Admin') jobs.push(window.fetchUsersFromSupabase());
            await Promise.all(jobs);
            if (current === 'trash' && typeof window.renderTrashBin === 'function') { try { await window.renderTrashBin(); } catch (e) {} }
            if (typeof window.filterLedgerTable === 'function') { try { window.filterLedgerTable(); } catch (e) {} }
            if (typeof window.updateDashboardAnalytics === 'function') window.updateDashboardAnalytics();
            if (typeof window.generateSummaryReportData === 'function') window.generateSummaryReportData();
            if (typeof window.renderSummaryPageWithDetailedTables === 'function') window.renderSummaryPageWithDetailedTables();
            if (window.WathekReview && window.currentUserRole === 'Admin' && current === 'review') window.WathekReview.render();
            hint('Updated', 1200);
        } catch (e) {
            hint('Could not refresh', 2500);
        } finally {
            refreshing = false; Array.prototype.forEach.call(icons, function (i) { i.classList.remove('fa-spin'); });
        }
    };

    // Pull down from the top of the page to refresh (phones)
    (function () {
        var startY = null, dist = 0;
        document.addEventListener('touchstart', function (e) {
            var main = document.querySelector('main');
            startY = (main && main.scrollTop <= 0 && e.touches.length === 1 && !document.querySelector('#wd-viewer, #wd-bulk') && !document.body.classList.contains('sidebar-open')) ? e.touches[0].clientY : null;
            dist = 0;
        }, { passive: true });
        document.addEventListener('touchmove', function (e) {
            if (startY === null) return;
            dist = e.touches[0].clientY - startY;
            if (dist > 20 && !refreshing) hint(dist > 90 ? 'Release to refresh' : 'Pull to refresh');
        }, { passive: true });
        document.addEventListener('touchend', function () {
            if (startY === null) return;
            var go = dist > 90; startY = null; dist = 0;
            if (go) window.WathekRefresh(); else if (!refreshing) { var el = document.getElementById('pullHint'); if (el) el.classList.add('hidden'); }
        }, { passive: true });
    })();

    function init() {
        wrapSwitchTab(); paintBar(); labelTables();
        new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
