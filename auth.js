/**
 * Wathek - Sign-in gate (Supabase Auth, invite-only)
 * - Shows a full-screen sign-in card until a valid session exists.
 * - Reads the user's role from public.user_role (matched by e-mail); a missing or disabled user is signed out.
 * - Forgot / reset password flow.
 * - Exposes: window.WathekAuth.require() -> Promise (resolves when signed in and role loaded), window.logoutSession().
 * Load order in index.html: supabase.js -> auth.js -> ... -> app.js
 */
(function () {
    'use strict';

    var sb = window.supabaseClient;
    var CACHE_KEYS = ['movePro_masterJobs', 'movepro_trash_bin', 'movepro_private_truck_rentals', 'movepro_warehouse_records'];
    var ROLES = ['Admin', 'Member', 'Viewer'];

    var T = {
        en: {
            title: 'Wathek System', sub: 'Sign in to continue',
            email: 'E-mail', password: 'Password', signin: 'Sign in', forgot: 'Forgot password?',
            back: 'Back to sign in', sendLink: 'Send reset link',
            forgotTitle: 'Reset your password', forgotHelp: 'Enter your e-mail and we will send you a reset link.',
            forgotDone: 'If this e-mail is registered, a reset link has been sent. Check your inbox.',
            newTitle: 'Choose a new password', newPass: 'New password', newPass2: 'Confirm new password', save: 'Save password',
            errCreds: 'Incorrect e-mail or password.', errEmpty: 'Please enter your e-mail and password.',
            errNoAccess: 'This account has no access to the system. Contact the administrator.',
            errShort: 'Password must be at least 8 characters.', errMatch: 'Passwords do not match.',
            errGeneric: 'Something went wrong. Please try again.', errEmail: 'Please enter your e-mail.',
            errRole: 'Could not verify your permissions. Please try again.',
            loading: 'Please wait...', private: 'Private system - authorised users only'
        },
    };

    var lang = 'en';

    var mode = 'login'; // login | forgot | recovery
    var signedIn = false;
    var recoveryFromUrl = /type=recovery/.test(window.location.hash || '');
    var resolveReady;
    var ready = new Promise(function (r) { resolveReady = r; });
    var startedFlow = false;

    function t(k) { return T[lang][k]; }

    // ---------- UI ----------
    var css = '' +
        '#wa-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;' +
        'background:radial-gradient(900px 600px at 15% 10%,#c9d8e6 0,transparent 60%),radial-gradient(800px 600px at 90% 90%,#d9cfe6 0,transparent 60%),#e8edf3;' +
        'font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;color:#1e293b}' +
        '#wa-card{width:100%;max-width:400px;background:rgba(255,255,255,.62);backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);' +
        'border:1px solid rgba(255,255,255,.8);border-radius:20px;padding:28px 26px;box-shadow:0 20px 50px rgba(30,41,59,.15)}' +
        '#wa-card h1{font-size:22px;font-weight:700;margin:0 0 4px}' +
        '#wa-card p.wa-sub{margin:0 0 18px;color:#64748b;font-size:14px}' +
        '#wa-card label{display:block;font-size:12px;font-weight:600;color:#475569;margin:12px 0 6px}' +
        '#wa-card input{width:100%;box-sizing:border-box;padding:11px 13px;border-radius:12px;border:1px solid #cbd5e1;background:rgba(255,255,255,.85);font-size:15px;outline:none}' +
        '#wa-card input:focus{border-color:#0f766e;box-shadow:0 0 0 3px rgba(15,118,110,.18)}' +
        '#wa-card button.wa-primary{width:100%;margin-top:18px;padding:12px;border:0;border-radius:12px;background:#0f766e;color:#fff;font-size:15px;font-weight:600;cursor:pointer}' +
        '#wa-card button.wa-primary:disabled{opacity:.6;cursor:wait}' +
        '#wa-card button.wa-link{background:none;border:0;color:#0f766e;font-size:13px;cursor:pointer;padding:0;margin-top:14px;display:block}' +
        '#wa-msg{min-height:20px;margin-top:12px;font-size:13px;border-radius:10px;padding:0}' +
        '#wa-msg.wa-err{color:#b91c1c;background:rgba(254,226,226,.8);padding:8px 10px}' +
        '#wa-msg.wa-ok{color:#065f46;background:rgba(209,250,229,.85);padding:8px 10px}' +
        '#wa-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;font-size:12px;color:#64748b}' +
        '';

    function build() {
        var style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        var ov = document.createElement('div');
        ov.id = 'wa-overlay';
        ov.innerHTML =
            '<div id="wa-card" role="dialog" aria-modal="true">' +
            '<div id="wa-top"><span id="wa-private"></span></div>' +
            '<h1 id="wa-title"></h1><p class="wa-sub" id="wa-sub"></p>' +
            '<form id="wa-form" novalidate>' +
            '<div id="wa-f-email"><label for="wa-email" id="wa-l-email"></label><input id="wa-email" type="email" autocomplete="username" dir="ltr"></div>' +
            '<div id="wa-f-pass"><label for="wa-pass" id="wa-l-pass"></label><input id="wa-pass" type="password" autocomplete="current-password" dir="ltr"></div>' +
            '<div id="wa-f-pass2" style="display:none"><label for="wa-pass2" id="wa-l-pass2"></label><input id="wa-pass2" type="password" autocomplete="new-password" dir="ltr"></div>' +
            '<div id="wa-msg" role="alert"></div>' +
            '<button type="submit" class="wa-primary" id="wa-submit"></button>' +
            '<button type="button" class="wa-link" id="wa-forgot"></button>' +
            '<button type="button" class="wa-link" id="wa-back" style="display:none"></button>' +
            '</form></div>';
        document.body.appendChild(ov);

        document.getElementById('wa-forgot').addEventListener('click', function () { setMode('forgot'); });
        document.getElementById('wa-back').addEventListener('click', function () { setMode('login'); });
        document.getElementById('wa-form').addEventListener('submit', onSubmit);
        render();
    }

    function $(id) { return document.getElementById(id); }

    function render() {
        var ov = $('wa-overlay');
        if (!ov) return;
        ov.setAttribute('dir', 'ltr');
        $('wa-private').textContent = t('private');
        $('wa-l-email').textContent = t('email');
        $('wa-forgot').textContent = t('forgot');
        $('wa-back').textContent = t('back');

        var isLogin = mode === 'login', isForgot = mode === 'forgot', isRec = mode === 'recovery';
        $('wa-title').textContent = isLogin ? t('title') : (isForgot ? t('forgotTitle') : t('newTitle'));
        $('wa-sub').textContent = isLogin ? t('sub') : (isForgot ? t('forgotHelp') : '');
        $('wa-f-email').style.display = isRec ? 'none' : '';
        $('wa-f-pass').style.display = isForgot ? 'none' : '';
        $('wa-f-pass2').style.display = isRec ? '' : 'none';
        $('wa-l-pass').textContent = isRec ? t('newPass') : t('password');
        $('wa-l-pass2').textContent = t('newPass2');
        $('wa-pass').setAttribute('autocomplete', isRec ? 'new-password' : 'current-password');
        $('wa-submit').textContent = isLogin ? t('signin') : (isForgot ? t('sendLink') : t('save'));
        $('wa-forgot').style.display = isLogin ? 'block' : 'none';
        $('wa-back').style.display = isForgot ? 'block' : 'none';
    }

    function setMode(m) { mode = m; showMsg('', ''); render(); }

    function showMsg(text, kind) {
        var el = $('wa-msg');
        if (!el) return;
        el.textContent = text || '';
        el.className = text ? (kind === 'ok' ? 'wa-ok' : 'wa-err') : '';
    }

    function busy(on) {
        var b = $('wa-submit');
        if (!b) return;
        b.disabled = !!on;
        if (on) b.textContent = t('loading'); else render();
    }

    function hideOverlay() {
        var ov = $('wa-overlay');
        if (ov) ov.remove();
    }

    // ---------- Auth logic ----------
    function normalizeRole(r) {
        var s = String(r || '').trim().toLowerCase();
        var cap = s.charAt(0).toUpperCase() + s.slice(1);
        return ROLES.indexOf(cap) >= 0 ? cap : null;
    }

    function escapeLike(s) { return String(s).replace(/[\\%_]/g, function (m) { return '\\' + m; }); }

    async function loadRoleAndEnter(session) {
        var email = session && session.user && session.user.email;
        if (!email) { await denyAccess('errNoAccess'); return; }

        var res = await sb.from('user_role').select('name,email,role,status').ilike('email', escapeLike(email)).limit(1);
        if (res.error) { await denyAccess('errRole', true); return; }

        var row = res.data && res.data[0];
        var status = row && row.status ? String(row.status).trim().toLowerCase() : 'enable'; // empty status = enabled (same rule as the database)
        var role = row ? normalizeRole(row.role) : null;
        if (!row || !role || status !== 'enable') { await denyAccess('errNoAccess'); return; }

        window.currentUserRole = role;
        window.currentLoggedInUser = { email: email, name: row.name || email, role: role, authId: session.user.id };
        paintSidebar(window.currentLoggedInUser);
        signedIn = true;
        hideOverlay();
        resolveReady(window.currentLoggedInUser);
    }

    async function denyAccess(key, keepSession) {
        if (!keepSession) { try { await sb.auth.signOut(); } catch (e) {} }
        window.currentUserRole = 'Viewer';
        window.currentLoggedInUser = null;
        if (!$('wa-overlay')) build();
        mode = 'login';
        render();
        busy(false);
        showMsg(t(key), 'err');
    }

    function paintSidebar(u) {
        var n = $('currentUserNameDisplay'), r = $('currentUserRoleBadge'), a = $('userAvatarInitials');
        if (n) n.textContent = u.name;
        if (r) r.textContent = u.role;
        if (a) {
            var parts = String(u.name || u.email).trim().split(/[\s@._-]+/).filter(Boolean);
            a.textContent = ((parts[0] || '?').charAt(0) + (parts[1] ? parts[1].charAt(0) : '')).toUpperCase();
        }
    }

    async function onSubmit(ev) {
        ev.preventDefault();
        showMsg('', '');
        var email = $('wa-email').value.trim();
        var pass = $('wa-pass').value;

        try {
            if (mode === 'login') {
                if (!email || !pass) { showMsg(t('errEmpty'), 'err'); return; }
                busy(true);
                var r = await sb.auth.signInWithPassword({ email: email, password: pass });
                if (r.error || !r.data || !r.data.session) { busy(false); showMsg(t('errCreds'), 'err'); return; }
                await loadRoleAndEnter(r.data.session);
                if (!signedIn) busy(false);
            } else if (mode === 'forgot') {
                if (!email) { showMsg(t('errEmail'), 'err'); return; }
                busy(true);
                var redirect = window.location.origin + window.location.pathname;
                await sb.auth.resetPasswordForEmail(email, { redirectTo: redirect });
                busy(false);
                showMsg(t('forgotDone'), 'ok'); // same message whether or not the e-mail exists
            } else if (mode === 'recovery') {
                var p2 = $('wa-pass2').value;
                if (pass.length < 8) { showMsg(t('errShort'), 'err'); return; }
                if (pass !== p2) { showMsg(t('errMatch'), 'err'); return; }
                busy(true);
                var u = await sb.auth.updateUser({ password: pass });
                if (u.error) { busy(false); showMsg(t('errGeneric'), 'err'); return; }
                try { window.history.replaceState(null, '', window.location.pathname); } catch (e) {}
                var s = await sb.auth.getSession();
                if (s.data && s.data.session) { await loadRoleAndEnter(s.data.session); if (!signedIn) busy(false); }
                else { busy(false); setMode('login'); }
            }
        } catch (e) {
            console.error('Auth error:', e);
            busy(false);
            showMsg(t('errGeneric'), 'err');
        }
    }

    async function start() {
        if (startedFlow) return;
        startedFlow = true;
        if (!sb) { console.error('Supabase client missing'); return; }

        sb.auth.onAuthStateChange(function (event) {
            if (event === 'PASSWORD_RECOVERY') {
                recoveryFromUrl = true;
                if (!$('wa-overlay')) build();
                mode = 'recovery';
                render();
            } else if (event === 'SIGNED_OUT' && signedIn) {
                window.location.reload();
            }
        });

        build();
        if (recoveryFromUrl) { mode = 'recovery'; render(); return; }

        try {
            var s = await sb.auth.getSession();
            if (s.data && s.data.session) { await loadRoleAndEnter(s.data.session); return; }
        } catch (e) { console.error('Session check failed:', e); }
        render();
    }

    window.logoutSession = async function () {
        try { CACHE_KEYS.forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
        try { await sb.auth.signOut(); } catch (e) {}
        window.location.href = window.location.pathname;
    };

    window.WathekAuth = {
        require: function () { start(); return ready; },
        isSignedIn: function () { return signedIn; }
    };

    // Start as soon as the page body exists so the data never flashes before sign-in.
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
