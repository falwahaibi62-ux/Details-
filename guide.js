/*
 * guide.js - help for every role.
 * 1. Member and Viewer: "What would you like to do?" card on the dashboard (the Admin has the Alerts panel instead).
 * 2. All roles: a small "?" button on every screen: a few lines on what the screen is for, written for the role.
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

    // text = shown to everyone; member / viewer / admin = added for that role only.
    // "base" replaces text for a role when the shared text would be wrong for it.
    var HELP = {
        dashboard: {
            title: 'Dashboard',
            text: 'A summary of the jobs and their payments, with charts.\n\nUse the menu on the left to open any other screen.',
            admin: '\n\nThe Alerts panel lists what needs your attention. Each alert has a button that opens the right screen.'
        },
        jobs: {
            title: 'Operations Ledger',
            text: 'Every job with its date, route, status and payments.\n\nUse the search and filters at the top to find a job.',
            member: '\n\nPress Add Job to record a new job. To change or delete a job, please ask the Admin.',
            viewer: '\n\nYour account is view only. To change or delete a job, please ask the Admin.',
            admin: '\n\nYou can add, edit and delete jobs. A deleted job goes to the Recycle Bin first, where you can restore it.'
        },
        rentals: {
            title: 'Private Truck Rental',
            text: 'The private trucks rented for jobs, with their cost and payment method.',
            member: '\n\nPress the add button to record a new rental. To change or delete one, please ask the Admin.',
            viewer: '\n\nYour account is view only.',
            admin: '\n\nYou can add, edit and delete rentals. A deleted rental goes to the Recycle Bin first.'
        },
        warehouse: {
            title: 'Warehouse and others',
            text: 'Warehouse costs and other expenses, with date, type and payment method.',
            member: '\n\nPress Add Expense to record a new one. To change or delete one, please ask the Admin.',
            viewer: '\n\nYour account is view only.',
            admin: '\n\nYou can add, edit and delete expenses. A deleted expense goes to the Recycle Bin first.'
        },
        reports: {
            title: 'Official PDF Report',
            text: 'Choose the dates and the job type, then switch between Summary and Detailed.',
            member: '\n\nPress Save PDF to keep a copy of the report.',
            viewer: '\n\nYour account is view only, so you can read the report here but not save it.',
            admin: '\n\nPress Save PDF to keep a copy of the report.'
        },
        users: {
            title: 'Users & Roles',
            text: 'The people who can sign in, with their role, status and last login.',
            admin: '\n\nAdd User creates the account and gives you a welcome message to send. Admin can do everything, Member can add records, and Viewer can only look. Set the status to Disable to stop someone from signing in. Under Data backup you can download all the data.'
        },
        review: {
            title: 'Document Review',
            text: 'Checks the job documents against the job records.',
            admin: '\n\nThe guide on the left explains each step. It lists jobs without a document, and the documents that were read with any differences found. It never changes the job records.'
        },
        trash: {
            title: 'Recycle Bin',
            text: 'Deleted jobs, rentals and expenses are kept here first.',
            admin: '\n\nRestore brings a record back. Deleting from the Recycle Bin is permanent and cannot be undone.'
        }
    };
    HELP.cash = {
        title: 'Cash Box',
        text: 'The cash with you: cash received from customers, minus the cash spent, plus what you took from the company.',
        admin: '\n\nReceived = payments written as Cash in PU and Destination. Spent = Helpers, Drivers and every Cash amount in Diesel, Hotels, Truck rentals and Warehouse. Use Add entry for the Opening balance, each Top-up from the company, and cash Returned. Payments with no method are not counted as cash.'
    };
    HELP.history = {
        title: 'History Log',
        text: 'Who added, changed, deleted or saved something, and when.',
        admin: '\n\nUse the period, area and person filters, or search a job number. Press Show changes to see the value before and after. The log is recorded automatically and cannot be edited.'
    };
    HELP['pdf-report'] = HELP.reports;

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
            'width:48px;height:48px;border-radius:99px;border:1px solid #2F3B52;background:#4a6fd0;color:#fff;font-size:18px;font-weight:700;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.35)';
        b.addEventListener('click', function () {
            var h = HELP[currentTab()] || HELP.dashboard;
            var r = String(role() || '').toLowerCase();
            var text = h.text + (h[r] || '');
            if (window.WDialog) WDialog.alert(text, { title: h.title, type: 'info', okText: 'Got it' });
        });
        // On desktop the round Resync button sits at the bottom right: stack the help button above it
        if (!document.getElementById('help-style')) {
            var st = document.createElement('style');
            st.id = 'help-style';
            st.textContent = '@media (min-width:768px){#helpBtn{bottom:92px!important;right:24px!important}main{padding-bottom:160px!important}}';
            document.head.appendChild(st);
        }
        document.body.appendChild(b);
    }

    function init() {
        if (!window.WathekAuth) return;
        window.WathekAuth.require().then(function (user) {
            if (!user) return;
            if (user.role === 'Member' || user.role === 'Viewer') drawCard(user.role);
            drawHelpButton();
        }).catch(function () {});
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
