/*
 * guide.js - help for Members and Viewers (the Admin has the Alerts panel instead).
 * 1. "What would you like to do?" card on the dashboard: one-click shortcuts, different for Member and Viewer.
 * 2. A small "?" button on every screen: two or three lines on what the screen is for.
 * Display only: it never changes any data.
 */
(function () {
    'use strict';

    var ACTIONS = {
        Member: [
            { icon: 'fa-plus', title: 'Add a job', text: 'Record a new move or delivery.', run: function () { go('jobs'); call('openAddModal'); } },
            { icon: 'fa-truck-ramp-box', title: 'Operations Ledger', text: 'See every job and its payments.', run: function () { go('jobs'); } },
            { icon: 'fa-truck', title: 'Add a truck rental', text: 'Record a private truck rental.', run: function () { go('rentals'); call('openPrivateTruckModal'); } },
            { icon: 'fa-warehouse', title: 'Add a warehouse expense', text: 'Record a warehouse or other cost.', run: function () { go('warehouse'); call('openWarehouseModal', false); } },
            { icon: 'fa-file-pdf', title: 'Reports', text: 'Pick the dates, then save the report.', run: function () { go('reports'); } }
        ],
        Viewer: [
            { icon: 'fa-truck-ramp-box', title: 'View jobs', text: 'See every job and its status.', run: function () { go('jobs'); } },
            { icon: 'fa-truck', title: 'View truck rentals', text: 'See the private truck rentals.', run: function () { go('rentals'); } },
            { icon: 'fa-warehouse', title: 'View warehouse costs', text: 'See warehouse and other expenses.', run: function () { go('warehouse'); } },
            { icon: 'fa-chart-pie', title: 'View reports', text: 'Pick the dates and read the report.', run: function () { go('reports'); } }
        ]
    };

    var HELP = {
        dashboard: {
            title: 'Dashboard',
            text: 'A summary of the jobs and their payments, with charts.\n\nUse the menu on the left to open any other screen, or the shortcuts above.'
        },
        jobs: {
            title: 'Operations Ledger',
            text: 'Every job with its date, route, status and payments.\n\nUse the search and filters at the top to find a job. To change or delete a job, please ask the Admin.',
            member: '\n\nMembers: press Add Job to record a new job.'
        },
        rentals: {
            title: 'Private Truck Rental',
            text: 'The private trucks rented for jobs, with their cost and payment method.',
            member: '\n\nMembers: press the add button to record a new rental. To change or delete one, please ask the Admin.'
        },
        warehouse: {
            title: 'Warehouse and others',
            text: 'Warehouse costs and other expenses, with date, type and payment method.',
            member: '\n\nMembers: press Add Expense to record a new one. To change or delete one, please ask the Admin.'
        },
        reports: {
            title: 'Official PDF Report',
            text: 'Choose the dates and the job type, then switch between Summary and Detailed.',
            member: '\n\nPress Save PDF to keep a copy of the report.'
        }
    };

    function role() { return window.currentUserRole; }
    function go(tab) { if (typeof window.switchTab === 'function') window.switchTab(tab); }
    function call(name) {
        var fn = window[name];
        if (typeof fn === 'function') fn.apply(null, Array.prototype.slice.call(arguments, 1));
    }
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

    function currentTab() {
        var el = document.querySelectorAll('.view-section'), i, id;
        for (i = 0; i < el.length; i++) {
            if (getComputedStyle(el[i]).display !== 'none' && el[i].id) { id = el[i].id.replace(/^tab-/, ''); return id; }
        }
        return 'dashboard';
    }

    function drawCard(r) {
        var panel = document.getElementById('smartAlertsPanel');
        if (!panel || document.getElementById('quickStart')) return;
        var list = ACTIONS[r] || [];
        var card = document.createElement('section');
        card.id = 'quickStart';
        card.className = 'glass-panel p-6 rounded-2xl bg-white shadow-xs border border-surface-200 space-y-4';
        card.innerHTML =
            '<h3 class="font-bold text-surface-900 text-sm flex items-center"><i class="fa-solid fa-compass text-primary-500 mr-2"></i>What would you like to do?</h3>' +
            '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-' + Math.min(list.length, 3) + ' gap-3">' +
            list.map(function (a, i) {
                return '<button type="button" data-qs="' + i + '" class="text-left p-4 rounded-xl bg-surface-50 border border-surface-100 hover:border-primary-500 transition cursor-pointer">' +
                    '<div class="font-bold text-surface-800 text-xs mb-1"><i class="fa-solid ' + a.icon + ' text-primary-500 mr-2"></i>' + esc(a.title) + '</div>' +
                    '<div class="text-[11px] text-surface-600 leading-relaxed">' + esc(a.text) + '</div></button>';
            }).join('') + '</div>';
        card.addEventListener('click', function (e) {
            var b = e.target.closest('[data-qs]');
            if (b) list[Number(b.getAttribute('data-qs'))].run();
        });
        panel.parentNode.insertBefore(card, panel);
    }

    function drawHelpButton() {
        if (document.getElementById('helpBtn')) return;
        var b = document.createElement('button');
        b.id = 'helpBtn';
        b.type = 'button';
        b.setAttribute('aria-label', 'Help for this screen');
        b.textContent = '?';
        b.style.cssText = 'position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:max(16px,env(safe-area-inset-bottom,0px));z-index:40;' +
            'width:44px;height:44px;border-radius:99px;border:1px solid #2F3B52;background:#4a6fd0;color:#fff;font-size:18px;font-weight:700;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.35)';
        b.addEventListener('click', function () {
            var h = HELP[currentTab()] || HELP.dashboard;
            var text = h.text + (role() === 'Member' && h.member ? h.member : '');
            if (window.WDialog) WDialog.alert(text, { title: h.title, type: 'info', okText: 'Got it' });
        });
        document.body.appendChild(b);
    }

    function init() {
        if (!window.WathekAuth) return;
        window.WathekAuth.require().then(function (user) {
            if (!user || (user.role !== 'Member' && user.role !== 'Viewer')) return;
            drawCard(user.role);
            drawHelpButton();
        }).catch(function () {});
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
