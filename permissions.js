/*
 * permissions.js - Viewer is read-only.
 * The database already refuses Viewer writes (RLS); this file makes the screen match:
 *  1. Hides every add / edit / delete / save control for a Viewer (also the ones drawn later by the lists).
 *  2. Blocks the same actions in code, so they cannot be opened from the console either.
 * Admin and Member are not affected.
 */
(function () {
    'use strict';

    // Actions a Viewer may not use (add, edit, delete, save a report)
    var BLOCKED = [
        'openAddModal', 'openEditJobModal', 'saveJob', 'deleteJob',
        'openWarehouseModal', 'editWarehouseRecord', 'deleteWarehouseRecord',
        'openPrivateTruckModal', 'savePrivateTruckRental', 'editPrivateTruckRental', 'deletePrivateTruckRental',
        'deleteTruckRental', 'exportOfficialPDF'
    ];

    function isViewer() { return window.currentUserRole === 'Viewer'; }

    function injectStyle() {
        if (document.getElementById('perm-style')) return;
        var sel = BLOCKED.map(function (n) { return 'body.role-viewer [onclick*="' + n + '("]'; }).join(',');
        var s = document.createElement('style');
        s.id = 'perm-style';
        s.textContent = sel + '{display:none!important}';
        document.head.appendChild(s);
    }

    function notice() {
        var msg = 'Your account is view only. This action is available to the Admin and Members.';
        if (window.WDialog) WDialog.alert(msg, { title: 'View only', type: 'info' });
    }

    function guard() {
        BLOCKED.forEach(function (name) {
            var fn = window[name];
            if (typeof fn !== 'function' || fn.__guarded) return;
            var wrapped = function () {
                if (isViewer()) { notice(); return; }
                return fn.apply(this, arguments);
            };
            wrapped.__guarded = true;
            window[name] = wrapped;
        });
    }

    function init() {
        injectStyle();
        guard();
        if (window.WathekAuth) {
            window.WathekAuth.require().then(function (user) {
                document.body.classList.toggle('role-viewer', !!user && user.role === 'Viewer');
            }).catch(function () {});
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
