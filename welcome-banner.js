/*
 * welcome-banner.js - friendly welcome banner at the top of the screen for Member and Viewer users
 * (the Admin keeps the full-screen welcome in welcome.js).
 * - Shown once per browser session, right after sign-in. The X button closes it.
 * - The glowing orbs share ONE rhythm (same 8s cycle, staggered start) so they drift together like a wave;
 *   the figure's wave repeats 4 times per cycle, so everything stays in step.
 * - Respects "reduce motion".
 */
(function () {
    'use strict';

    var KEY = 'wathekBannerShown';
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
        if (n.indexOf('@') > 0) n = n.split('@')[0].replace(/[._-]+/g, ' ');
        return n.split(/\s+/)[0];
    }

    var CSS =
        '#wb{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:12px;' +
        'min-height:132px;margin-bottom:16px;padding:20px 24px;border-radius:28px;border:1px solid #2F3B52;flex-shrink:0;' +
        'font-family:Inter,system-ui,sans-serif;color:#F7F9FC;' +
        'background:radial-gradient(60% 120% at 88% 40%,rgba(124,123,240,.30) 0%,transparent 70%),' +
        'radial-gradient(50% 100% at 0% 0%,rgba(74,111,208,.28) 0%,transparent 70%),#182031;' +
        'box-shadow:0 10px 30px rgba(10,14,24,.25);opacity:0;transform:translateY(-8px);transition:opacity .6s ease,transform .6s ease,max-height .45s ease,margin .45s ease,padding .45s ease}' +
        '#wb.wb-in{opacity:1;transform:none}' +
        '#wb.wb-out{opacity:0;max-height:0;min-height:0;margin-bottom:0;padding-top:0;padding-bottom:0;border-width:0}' +
        '#wb-text{position:relative;z-index:2;min-width:0}' +
        '#wb-hi{margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#93A1BC}' +
        '#wb-name{margin:0;font-size:28px;line-height:1.15;font-weight:800;letter-spacing:-.02em}' +
        '#wb-name span{background:linear-gradient(90deg,#6f9bff,#a78bfa);-webkit-background-clip:text;background-clip:text;color:transparent}' +
        '#wb-sub{margin:8px 0 0;font-size:14px;color:#A9B5CC;max-width:380px}' +
        '#wb-role{display:inline-block;margin-top:12px;padding:3px 12px;border-radius:99px;font-size:11px;font-weight:600;color:#c9d6ff;background:rgba(111,155,255,.14);border:1px solid rgba(111,155,255,.3)}' +
        '#wb-art{position:relative;flex:0 0 auto;width:230px;height:110px}' +
        '#wb-art svg{width:100%;height:100%;display:block;overflow:visible}' +
        '#wb-x{position:absolute;top:10px;right:12px;z-index:3;width:30px;height:30px;border-radius:99px;border:0;cursor:pointer;' +
        'background:rgba(255,255,255,.08);color:#c4cee3;font-size:14px;line-height:1}' +
        '#wb-x:hover{background:rgba(255,255,255,.18)}' +
        '#wb-x:focus-visible{outline:2px solid #6f9bff;outline-offset:2px}' +
        /* one shared 8s rhythm: every orb drifts the same path, each starts a little later = a gentle wave */
        '@keyframes wb-drift{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(4px,-8px) scale(1.04)}50%{transform:translate(0,-14px) scale(1.08)}75%{transform:translate(-4px,-6px) scale(1.03)}}' +
        '@keyframes wb-glow{0%,100%{opacity:.75}50%{opacity:1}}' +
        '@keyframes wb-wave{0%,60%,100%{transform:rotate(0)}15%{transform:rotate(-28deg)}30%{transform:rotate(8deg)}45%{transform:rotate(-24deg)}}' +
        '@keyframes wb-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}' +
        '.wb-orb{animation:wb-drift 8s ease-in-out infinite,wb-glow 8s ease-in-out infinite;transform-box:fill-box;transform-origin:center}' +
        '.wb-o1{animation-delay:0s}.wb-o2{animation-delay:-.8s}.wb-o3{animation-delay:-1.6s}.wb-o4{animation-delay:-2.4s}.wb-o5{animation-delay:-3.2s}' +
        '#wb-bot{animation:wb-bob 4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}' +
        '#wb-arm{animation:wb-wave 2s ease-in-out infinite;transform-origin:139px 56px}' +
        '@media (max-width:640px){#wb{padding:16px 16px;min-height:112px;border-radius:24px}#wb-name{font-size:22px}#wb-sub{font-size:13px;max-width:none}#wb-art{width:76px;height:100px;overflow:hidden;margin-top:14px}#wb-art svg{width:230px;height:110px;margin-left:-74px}#wb-sub{padding-right:4px}}' +
        '@media (prefers-reduced-motion:reduce){#wb,.wb-orb,#wb-bot,#wb-arm{animation:none!important;transition-duration:.01ms!important}}';

    var ART =
        '<svg viewBox="0 0 230 110" aria-hidden="true">' +
        '<defs>' +
          '<radialGradient id="wbg1" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#bcd2ff"/><stop offset=".45" stop-color="#5b87f0"/><stop offset="1" stop-color="#2a3f94" stop-opacity=".9"/></radialGradient>' +
          '<radialGradient id="wbg2" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#e0d4ff"/><stop offset=".45" stop-color="#8f6df0"/><stop offset="1" stop-color="#43299a" stop-opacity=".9"/></radialGradient>' +
          '<linearGradient id="wbbody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f7ff"/><stop offset="1" stop-color="#b9c7ee"/></linearGradient>' +
          '<filter id="wbblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>' +
        '</defs>' +
        '<g filter="url(#wbblur)" opacity=".5"><circle cx="40" cy="60" r="26" fill="#5b87f0"/><circle cx="190" cy="40" r="22" fill="#8f6df0"/></g>' +
        '<circle class="wb-orb wb-o1" cx="38" cy="62" r="22" fill="url(#wbg1)"/>' +
        '<circle class="wb-orb wb-o2" cx="84" cy="26" r="12" fill="url(#wbg2)"/>' +
        '<circle class="wb-orb wb-o3" cx="206" cy="36" r="17" fill="url(#wbg2)"/>' +
        '<circle class="wb-orb wb-o4" cx="196" cy="88" r="9" fill="url(#wbg1)"/>' +
        '<circle class="wb-orb wb-o5" cx="66" cy="92" r="8" fill="url(#wbg2)"/>' +
        '<g id="wb-bot">' +
          '<line x1="118" y1="20" x2="118" y2="30" stroke="#b9c7ee" stroke-width="3" stroke-linecap="round"/><circle cx="118" cy="17" r="4" fill="#a78bfa"/>' +
          '<rect x="98" y="30" width="40" height="32" rx="14" fill="url(#wbbody)"/>' +
          '<rect x="104" y="37" width="28" height="17" rx="8" fill="#1b2540"/>' +
          '<circle cx="112" cy="45" r="3.2" fill="#7fb0ff"/><circle cx="124" cy="45" r="3.2" fill="#7fb0ff"/>' +
          '<rect x="101" y="66" width="34" height="32" rx="14" fill="url(#wbbody)"/>' +
          '<circle cx="118" cy="82" r="4" fill="#6f9bff" opacity=".85"/>' +
          '<rect x="92" y="70" width="9" height="20" rx="4.5" fill="#cdd8f5"/>' +
          '<g id="wb-arm"><rect x="135" y="54" width="9" height="22" rx="4.5" fill="#cdd8f5"/></g>' +
        '</g>' +
        '</svg>';

    function show(user) {
        if (!document.getElementById('wb-style')) {
            var s = document.createElement('style'); s.id = 'wb-style'; s.textContent = CSS; document.head.appendChild(s);
        }
        var main = document.querySelector('main');
        if (!main || document.getElementById('wb')) return;
        var b = document.createElement('section');
        b.id = 'wb';
        b.setAttribute('aria-label', 'Welcome');
        b.innerHTML =
            '<div id="wb-text"><p id="wb-hi"></p><h2 id="wb-name">Welcome, <span></span></h2>' +
            '<p id="wb-sub"></p><span id="wb-role"></span></div>' +
            '<div id="wb-art">' + ART + '</div>' +
            '<button type="button" id="wb-x" aria-label="Close welcome message">✕</button>';
        b.querySelector('#wb-hi').textContent = greeting();
        b.querySelector('#wb-name span').textContent = firstName(user) || 'there';
        b.querySelector('#wb-sub').textContent = user.role === 'Viewer'
            ? 'Glad to have you here. Everything you can view is in the menu.'
            : 'Glad to have you on the team. Everything you need is in the menu.';
        b.querySelector('#wb-role').textContent = user.role;
        main.insertBefore(b, main.firstChild);
        b.querySelector('#wb-x').addEventListener('click', function () {
            b.classList.remove('wb-in'); b.classList.add('wb-out');
            setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 500);
        });
        requestAnimationFrame(function () { requestAnimationFrame(function () { b.classList.add('wb-in'); }); });
    }

    function init() {
        if (!window.WathekAuth || seen()) return;
        window.WathekAuth.require().then(function (user) {
            if (!user || user.role === 'Admin' || seen()) return;
            mark();
            show(user);
        }).catch(function () {});
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
