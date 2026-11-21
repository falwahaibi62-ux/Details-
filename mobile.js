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

    // Jobs list on phones: tap a row to show / hide its full details (buttons and links keep working)
    document.addEventListener('click', function (e) {
        var tr = e.target.closest ? e.target.closest('#masterJobsTableBody tr') : null;
        if (!tr || tr.classList.contains('m-wide')) return;
        if (e.target.closest('button, a, input, select, label')) return;
        tr.classList.toggle('open');
    });

    function init() {
        wrapSwitchTab(); paintBar(); labelTables();
        new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
