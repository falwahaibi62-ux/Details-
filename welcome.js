/*
 * welcome.js - friendly 3-second welcome screen, shown to the Admin only,
 * once per browser session, right after sign-in.
 * - Name comes from the signed-in user's profile (user_role.name), nothing is hardcoded.
 * - Tap / Esc skips it. Data keeps loading in the background.
 * - Respects "reduce motion".
 */
(function () {
    'use strict';

    var SHOW_MS = 3000;
    var KEY = 'wathekWelcomeShown';

    function seen() { try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
    function mark() { try { sessionStorage.setItem(KEY, '1'); } catch (e) {} }

    function greeting() {
        var h = new Date().getHours();
        if (h < 5) return 'Good evening';
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    }

    function firstName(u) {
        var n = String((u && (u.name || u.email)) || '').trim();
        if (!n) return '';
        if (n.indexOf('@') > 0) n = n.split('@')[0].replace(/[._-]+/g, ' ');
        return n.split(/\s+/)[0];
    }

    function injectStyle() {
        if (document.getElementById('wl-style')) return;
        var s = document.createElement('style');
        s.id = 'wl-style';
        s.textContent =
            '#wl-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;' +
            'padding:24px;font-family:Inter,system-ui,sans-serif;cursor:pointer;opacity:0;transition:opacity .5s ease;' +
            'background:radial-gradient(55% 50% at 20% 18%,rgba(74,111,208,.28) 0%,transparent 70%),' +
            'radial-gradient(50% 50% at 85% 80%,rgba(99,102,241,.24) 0%,transparent 70%),#141A26}' +
            '#wl-overlay.wl-in{opacity:1}#wl-overlay.wl-out{opacity:0}' +
            '#wl-card{display:flex;flex-direction:column;align-items:center;text-align:center;max-width:340px;width:100%;' +
            'padding:30px 24px 24px;border-radius:32px;background:rgba(24,32,49,.82);border:1px solid #2F3B52;' +
            'box-shadow:0 24px 70px rgba(0,0,0,.45);' +
            'transform:translateY(14px) scale(.98);transition:transform .7s cubic-bezier(.2,.8,.2,1)}' +
            '#wl-overlay.wl-in #wl-card{transform:none}' +
            '#wl-photo{width:156px;height:208px;border-radius:26px;overflow:hidden;position:relative;border:1px solid rgba(147,161,188,.25);' +
            'background:radial-gradient(70% 55% at 50% 38%,#dbe6ff 0%,#a9bdf2 45%,#7f8fe0 100%);' +
            'box-shadow:0 0 0 6px rgba(74,111,208,.12),0 14px 40px rgba(74,111,208,.35)}' +
            '#wl-photo img{width:100%;height:100%;object-fit:cover;object-position:center bottom;display:block}' +
            '#wl-hi{margin:24px 0 6px;font-size:12px;font-weight:600;color:#93A1BC;letter-spacing:.14em;text-transform:uppercase}' +
            '#wl-name{margin:0;font-size:32px;line-height:1.15;font-weight:800;letter-spacing:-.02em;color:#F7F9FC}' +
            '#wl-name span{background:linear-gradient(90deg,#6f9bff,#7c7bf0);-webkit-background-clip:text;background-clip:text;color:transparent}' +
            '#wl-wish{margin:10px 0 0;font-size:15px;color:#A9B5CC}' +
            '#wl-bar{margin-top:26px;width:120px;height:4px;border-radius:99px;background:#2F3B52;overflow:hidden}' +
            '#wl-bar i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#4a6fd0,#7c7bf0)}' +
            '#wl-overlay.wl-in #wl-bar i{width:100%;transition:width ' + SHOW_MS + 'ms linear}' +
            '#wl-skip{margin-top:14px;font-size:11px;color:#7F8DAA}' +
            '@media (prefers-reduced-motion:reduce){#wl-overlay,#wl-card,#wl-overlay.wl-in #wl-bar i{transition-duration:.01ms}}';
        document.head.appendChild(s);
    }

    function show(user) {
        injectStyle();
        var name = firstName(user);
        var ov = document.createElement('div');
        ov.id = 'wl-overlay';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-label', 'Welcome');
        ov.innerHTML =
            '<div id="wl-card">' +
              '<div id="wl-photo"><img src="welcome-avatar.png" alt="" onerror="this.parentNode.style.display=\'none\'"></div>' +
              '<p id="wl-hi"></p>' +
              '<h1 id="wl-name"><span></span></h1>' +
              '<p id="wl-wish">Wishing you a wonderful day</p>' +
              '<div id="wl-bar"><i></i></div>' +
              '<div id="wl-skip">Tap anywhere to continue</div>' +
            '</div>';
        ov.querySelector('#wl-hi').textContent = greeting();
        ov.querySelector('#wl-name span').textContent = name || 'Welcome back';
        document.body.appendChild(ov);

        var done = false, timer;
        function close() {
            if (done) return;
            done = true;
            clearTimeout(timer);
            document.removeEventListener('keydown', onKey);
            ov.classList.remove('wl-in');
            ov.classList.add('wl-out');
            setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 550);
        }
        function onKey(e) { if (e.key === 'Escape' || e.key === 'Enter') close(); }
        ov.addEventListener('click', close);
        document.addEventListener('keydown', onKey);

        requestAnimationFrame(function () { requestAnimationFrame(function () { ov.classList.add('wl-in'); }); });
        timer = setTimeout(close, SHOW_MS + 500);
    }

    function init() {
        if (!window.WathekAuth || seen()) return;
        window.WathekAuth.require().then(function (user) {
            if (!user || user.role !== 'Admin' || seen()) return;
            mark();
            show(user);
        }).catch(function () {});
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
