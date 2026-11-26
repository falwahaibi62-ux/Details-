/* Wathek - system dialogs (replaces the browser's alert / confirm / prompt boxes).
   WDialog.alert(message, { title, type, okText, mandatory })                      -> Promise<void>
   WDialog.confirm(message, { title, confirmText, cancelText, danger }) -> Promise<boolean>
   WDialog.share({ title, intro, text })                         -> Promise<void>  (message box with Copy and WhatsApp buttons)
   WDialog.form({ title, intro, submitText, fields: [...] })     -> Promise<object | null>
     field = { name, label, type: 'text' | 'email' | 'password' | 'select' | 'date' | 'number', required, placeholder, value, maxLength, options: [{value,label}], validate(value, values) -> error text }
   Dialogs are queued (never lost), keyboard friendly (Tab stays inside, Esc cancels, Enter submits) and give focus back when closed. */
(function () {
    'use strict';
    if (window.WDialog) return;

    var queue = [], active = false, uid = 0;

    function injectStyles() {
        if (document.getElementById('wdlg-style')) return;
        var st = document.createElement('style'); st.id = 'wdlg-style';
        st.textContent =
            '#wdlg-overlay{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(7,10,18,.62);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);animation:wdlgFade .15s ease-out}' +
            '.wdlg{width:100%;max-width:440px;max-height:calc(100vh - 32px);overflow:auto;border-radius:20px;background:linear-gradient(180deg,#1d2638,#161d2c);border:1px solid rgba(255,255,255,.10);box-shadow:0 24px 60px rgba(0,0,0,.55);color:#EEF2F9;font-family:inherit;animation:wdlgPop .18s ease-out}' +
            '.wdlg-head{display:flex;align-items:center;gap:12px;padding:20px 22px 6px}' +
            '.wdlg-ico{flex:none;width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;background:rgba(111,155,255,.16);color:#8fb0ff}' +
            '.wdlg-ico.warn{background:rgba(245,158,11,.16);color:#fbbf24}.wdlg-ico.error,.wdlg-ico.danger{background:rgba(239,68,68,.16);color:#f87171}.wdlg-ico.success{background:rgba(34,197,94,.16);color:#4ade80}' +
            '.wdlg-title{margin:0;font-size:16px;font-weight:700;line-height:1.3}' +
            '.wdlg-body{padding:6px 22px 4px;font-size:13px;line-height:1.55;color:#c3cde0;white-space:pre-line;word-break:break-word}' +
            '.wdlg-form{padding:10px 22px 0;display:grid;gap:14px}' +
            '.wdlg-field label{display:block;margin-bottom:6px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#9aa7bd}' +
            '.wdlg-field input,.wdlg-field select{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#EEF2F9;font-size:13px;outline:none;font-family:inherit}' +
            '.wdlg-field select option{background:#182031;color:#EEF2F9}' +
            '.wdlg-field input:focus,.wdlg-field select:focus{border-color:#6f9bff;box-shadow:0 0 0 3px rgba(111,155,255,.22)}' +
            '.wdlg-field.bad input,.wdlg-field.bad select{border-color:#f87171}' +
            '.wdlg-err{margin-top:5px;font-size:11px;color:#f87171;min-height:0}' +
            '.wdlg-share{padding:10px 22px 0}.wdlg-share textarea{width:100%;box-sizing:border-box;min-height:230px;resize:vertical;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#EEF2F9;font-size:12.5px;line-height:1.6;font-family:inherit;outline:none}' +
            '.wdlg-foot{display:flex;justify-content:flex-end;gap:10px;padding:18px 22px 20px}' +
            '.wdlg-btn{min-width:84px;padding:10px 18px;border-radius:12px;border:1px solid transparent;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:filter .15s,background .15s}' +
            '.wdlg-btn:focus-visible{outline:2px solid #8fb0ff;outline-offset:2px}' +
            '.wdlg-btn.primary{background:#4a78c8;color:#fff}.wdlg-btn.primary:hover{filter:brightness(1.12)}' +
            '.wdlg-btn.danger{background:#d1435b;color:#fff}.wdlg-btn.danger:hover{filter:brightness(1.1)}' +
            '.wdlg-btn.ghost{background:rgba(255,255,255,.08);color:#dbe3f2;border-color:rgba(255,255,255,.12)}.wdlg-btn.ghost:hover{background:rgba(255,255,255,.14)}' +
            '.wdlg-btn[disabled]{opacity:.55;cursor:default}' +
            '@keyframes wdlgFade{from{opacity:0}to{opacity:1}}@keyframes wdlgPop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}' +
            '@media (prefers-reduced-motion:reduce){#wdlg-overlay,.wdlg{animation:none}}';
        document.head.appendChild(st);
    }

    function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

    function run(job) {
        injectStyles();
        var id = ++uid, prevFocus = document.activeElement;
        var overlay = el('div'); overlay.id = 'wdlg-overlay';
        var box = el('div', 'wdlg'); box.setAttribute('role', job.kind === 'alert' ? 'alertdialog' : 'dialog'); box.setAttribute('aria-modal', 'true');
        box.setAttribute('aria-labelledby', 'wdlg-t' + id);

        var head = el('div', 'wdlg-head');
        var iconKind = job.type || (job.kind === 'confirm' ? (job.danger ? 'danger' : 'warn') : 'info');
        var ico = el('div', 'wdlg-ico ' + iconKind, { error: '!', danger: '!', warn: '?', success: '✓', info: 'i' }[iconKind] || 'i');
        ico.setAttribute('aria-hidden', 'true');
        var title = el('h2', 'wdlg-title', job.title); title.id = 'wdlg-t' + id;
        head.appendChild(ico); head.appendChild(title); box.appendChild(head);

        var body = null, form = null, inputs = {};
        if (job.message) { body = el('div', 'wdlg-body', job.message); body.id = 'wdlg-b' + id; box.appendChild(body); box.setAttribute('aria-describedby', body.id); }

        var shareBox = null;
        if (job.kind === 'share') {
            shareBox = el('div', 'wdlg-share'); var ta = el('textarea'); ta.readOnly = true; ta.value = job.text; ta.setAttribute('aria-label', 'Message'); shareBox.appendChild(ta); box.appendChild(shareBox);
        }

        var foot = el('div', 'wdlg-foot');
        var cancelBtn = null, okBtn = el('button', 'wdlg-btn ' + (job.danger ? 'danger' : 'primary'), job.okText); okBtn.type = 'button';

        if (job.kind === 'form') {
            form = el('form', 'wdlg-form'); form.noValidate = true;
            if (job.intro) { var intro = el('div', 'wdlg-body', job.intro); intro.style.padding = '0'; form.appendChild(intro); }
            job.fields.forEach(function (f, i) {
                var wrap = el('div', 'wdlg-field'), fid = 'wdlg-f' + id + '-' + i;
                var lab = el('label', null, f.label + (f.required ? ' *' : '')); lab.htmlFor = fid;
                var inp;
                if (f.type === 'select') {
                    inp = el('select');
                    (f.options || []).forEach(function (o) { var op = el('option', null, o.label); op.value = o.value; if (String(o.value) === String(f.value)) op.selected = true; inp.appendChild(op); });
                } else {
                    inp = el('input'); inp.type = f.type === 'email' ? 'email' : (f.type === 'password' ? 'password' : (f.type === 'date' ? 'date' : 'text')); inp.value = f.value || '';
                    if (f.placeholder) inp.placeholder = f.placeholder;
                    if (f.maxLength) inp.maxLength = f.maxLength;
                    inp.autocomplete = f.type === 'password' ? 'new-password' : 'off'; inp.spellcheck = false;
                    if (f.type === 'email') inp.setAttribute('inputmode', 'email');
                    if (f.type === 'number') inp.setAttribute('inputmode', 'decimal');
                }
                inp.id = fid; inp.name = f.name;
                var err = el('div', 'wdlg-err'); err.id = fid + '-e'; err.setAttribute('role', 'alert');
                inp.setAttribute('aria-describedby', err.id);
                inp.addEventListener('input', function () { wrap.classList.remove('bad'); err.textContent = ''; inp.removeAttribute('aria-invalid'); });
                wrap.appendChild(lab); wrap.appendChild(inp);
                if (f.type === 'password') {
                    var show = el('label', null, ''); show.style.cssText = 'display:flex;align-items:center;gap:6px;margin:7px 0 0;font-size:11px;font-weight:600;letter-spacing:0;text-transform:none;color:#9aa7bd;cursor:pointer';
                    var cb = el('input'); cb.type = 'checkbox'; cb.style.cssText = 'width:auto;margin:0';
                    cb.addEventListener('change', function () { inp.type = cb.checked ? 'text' : 'password'; });
                    show.appendChild(cb); show.appendChild(document.createTextNode('Show password')); wrap.appendChild(show);
                }
                wrap.appendChild(err); form.appendChild(wrap);
                inputs[f.name] = { field: f, input: inp, wrap: wrap, err: err };
            });
            box.appendChild(form);
            okBtn.type = 'submit';
        }

        if (job.kind === 'share') {
            cancelBtn = el('button', 'wdlg-btn ghost', 'Close'); cancelBtn.type = 'button'; foot.appendChild(cancelBtn);
            var wa = el('button', 'wdlg-btn ghost', 'WhatsApp'); wa.type = 'button'; foot.appendChild(wa);
            wa.addEventListener('click', function () { window.open('https://wa.me/?text=' + encodeURIComponent(job.text), '_blank', 'noopener'); });
            okBtn.textContent = 'Copy message';
            okBtn.addEventListener('click', function () {
                var area = shareBox.querySelector('textarea'), done = function () { okBtn.textContent = 'Copied \u2713'; };
                var fallback = function () { area.focus(); area.select(); try { document.execCommand('copy'); done(); } catch (e) {} };
                if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(job.text).then(done, fallback); else fallback();
            });
        } else if (job.kind !== 'alert') { cancelBtn = el('button', 'wdlg-btn ghost', job.cancelText); cancelBtn.type = 'button'; foot.appendChild(cancelBtn); }
        foot.appendChild(okBtn);
        if (form) { foot.style.padding = '4px 0 20px'; form.appendChild(foot); } else box.appendChild(foot);
        overlay.appendChild(box); document.body.appendChild(overlay);

        function close(result) {
            document.removeEventListener('keydown', onKey, true);
            overlay.remove();
            try { if (prevFocus && prevFocus.focus) prevFocus.focus(); } catch (e) {}
            job.resolve(result);
            active = false; next();
        }
        function cancelValue() { return job.kind === 'confirm' ? false : (job.kind === 'form' ? null : undefined); }

        function collect() {
            var values = {}, firstBad = null;
            job.fields.forEach(function (f) {
                var h = inputs[f.name], v = h.input.value;
                if (f.type !== 'select' && f.type !== 'password') v = v.trim();
                values[f.name] = v;
            });
            job.fields.forEach(function (f) {
                var h = inputs[f.name], v = values[f.name], msg = '';
                if (f.required && !v) msg = f.label + ' is required.';
                else if (v && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = 'Enter a valid email address.';
                else if (v && f.validate) msg = f.validate(v, values) || '';
                if (msg) { h.wrap.classList.add('bad'); h.err.textContent = msg; h.input.setAttribute('aria-invalid', 'true'); if (!firstBad) firstBad = h.input; }
            });
            if (firstBad) { firstBad.focus(); return null; }
            return values;
        }

        if (form) form.addEventListener('submit', function (e) { e.preventDefault(); var v = collect(); if (v) close(v); });
        else if (job.kind !== 'share') okBtn.addEventListener('click', function () { close(job.kind === 'confirm' ? true : undefined); });
        if (cancelBtn) cancelBtn.addEventListener('click', function () { close(cancelValue()); });

        function onKey(e) {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (!job.mandatory) close(cancelValue()); return; }
            if (e.key === 'Tab') {
                var f = box.querySelectorAll('input,select,button:not([disabled])'); if (!f.length) return;
                var first = f[0], last = f[f.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
                else if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
            }
        }
        document.addEventListener('keydown', onKey, true);

        // focus: first field in a form, otherwise the safe button (Cancel for destructive questions)
        setTimeout(function () {
            var target = form ? form.querySelector('input,select') : (job.kind === 'confirm' && job.danger && cancelBtn ? cancelBtn : okBtn);
            if (target) target.focus();
        }, 30);
    }

    function next() { if (active || !queue.length) return; active = true; run(queue.shift()); }
    function enqueue(job) { return new Promise(function (resolve) { job.resolve = resolve; queue.push(job); next(); }); }

    function looksLikeError(m) { return /^(could not|failed|error|unable|cannot|can't)/i.test(String(m || '').trim()); }

    window.WDialog = {
        alert: function (message, opts) {
            opts = opts || {}; var msg = String(message == null ? '' : message);
            var type = opts.type || (looksLikeError(msg) ? 'error' : 'info');
            return enqueue({ kind: 'alert', message: msg, type: type, title: opts.title || (type === 'error' ? 'Something went wrong' : 'Notice'), okText: opts.okText || 'OK', mandatory: !!opts.mandatory });
        },
        confirm: function (message, opts) {
            opts = opts || {};
            return enqueue({ kind: 'confirm', message: String(message == null ? '' : message), title: opts.title || 'Please confirm', okText: opts.confirmText || 'Confirm', cancelText: opts.cancelText || 'Cancel', danger: !!opts.danger });
        },
        share: function (cfg) {
            cfg = cfg || {};
            return enqueue({ kind: 'share', title: cfg.title || 'Message', message: cfg.intro || '', text: String(cfg.text || ''), type: cfg.type || 'success', okText: 'Copy message', cancelText: 'Close' });
        },
        form: function (cfg) {
            cfg = cfg || {};
            return enqueue({ kind: 'form', title: cfg.title || 'Details', intro: cfg.intro || '', fields: cfg.fields || [], okText: cfg.submitText || 'Save', cancelText: cfg.cancelText || 'Cancel' });
        }
    };
})();
