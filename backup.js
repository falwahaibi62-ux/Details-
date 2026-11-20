/**
 * Wathek - Data backup (Admin only)
 * Downloads every table to your own computer, straight from the browser using your signed-in session.
 * Includes rows in the Recycle Bin. The files are never uploaded anywhere.
 *  - Full backup: one .json file with all tables (use this to restore).
 *  - Excel files: one .csv file per table.
 * Uploaded PDF documents (Supabase Storage) are not part of this file.
 */
(function () {
    'use strict';

    var TABLES = ['jobs_report', 'truck_rental', 'warehouse_expenses', 'user_role', 'job_documents'];
    var PAGE = 1000;
    var LS_KEY = 'wathek_last_backup';

    function sb() { return window.supabaseClient; }
    function isAdmin() { return window.currentUserRole === 'Admin'; }

    function stamp() {
        var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
        return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes());
    }

    async function fetchAll(table) {
        var all = [], from = 0;
        for (;;) {
            var r = await sb().from(table).select('*').order('id', { ascending: true }).range(from, from + PAGE - 1);
            if (r.error) throw new Error(table + ': ' + r.error.message);
            all = all.concat(r.data || []);
            if (!r.data || r.data.length < PAGE) break;
            from += PAGE;
        }
        return all;
    }

    function save(filename, text, mime) {
        var blob = new Blob([text], { type: mime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    }

    function csvCell(v) {
        if (v === null || v === undefined) return '';
        var s = String(v);
        // Stop spreadsheet formulas from running if a cell starts with = + - @
        if (/^[=+\-@]/.test(s) && isNaN(Number(s))) s = "'" + s;
        return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }

    function toCsv(rows) {
        if (!rows.length) return '';
        var cols = Object.keys(rows[0]);
        return [cols.join(',')].concat(rows.map(function (r) { return cols.map(function (c) { return csvCell(r[c]); }).join(','); })).join('\r\n');
    }

    function setStatus(text, isError) {
        var el = document.getElementById('backupStatus');
        if (!el) return;
        el.textContent = text || '';
        el.style.color = isError ? '#b91c1c' : '#64748b';
    }

    function paintLast() {
        var el = document.getElementById('backupLast');
        if (!el) return;
        var t = null;
        try { t = localStorage.getItem(LS_KEY); } catch (e) {}
        if (!t) { el.textContent = 'No backup has been downloaded from this browser yet.'; return; }
        var days = Math.floor((Date.now() - Number(t)) / 864e5);
        el.textContent = 'Last backup from this browser: ' + new Date(Number(t)).toLocaleString('en-US') + (days >= 7 ? ' (' + days + ' days ago - time for a new one)' : '');
    }

    async function collect() {
        var data = {};
        for (var i = 0; i < TABLES.length; i++) {
            setStatus('Reading ' + TABLES[i] + '...');
            data[TABLES[i]] = await fetchAll(TABLES[i]);
        }
        return data;
    }

    async function run(kind) {
        if (!isAdmin()) { alert('Only the Admin can download backups.'); return; }
        var btns = document.querySelectorAll('.backup-btn');
        btns.forEach(function (b) { b.disabled = true; });
        try {
            var data = await collect();
            var counts = {};
            TABLES.forEach(function (t) { counts[t] = data[t].length; });
            var name = 'wathek-backup-' + stamp();

            if (kind === 'json') {
                var pkg = {
                    app: 'Wathek', exported_at: new Date().toISOString(),
                    exported_by: window.currentLoggedInUser ? window.currentLoggedInUser.email : null,
                    counts: counts, tables: data
                };
                save(name + '.json', JSON.stringify(pkg, null, 1), 'application/json');
            } else {
                var i = 0;
                for (var t of TABLES) {
                    if (!data[t].length) continue;
                    var csv = '﻿' + toCsv(data[t]);
                    (function (tt, content, delay) { setTimeout(function () { save(name + '_' + tt + '.csv', content, 'text/csv;charset=utf-8'); }, delay); })(t, csv, i * 400);
                    i++;
                }
            }
            try { localStorage.setItem(LS_KEY, String(Date.now())); } catch (e) {}
            setStatus('Done: ' + TABLES.map(function (t) { return t.replace('_', ' ') + ' ' + counts[t]; }).join(' | '));
            paintLast();
        } catch (e) {
            console.error('Backup failed:', e);
            setStatus('Backup failed: ' + e.message, true);
        } finally {
            btns.forEach(function (b) { b.disabled = false; });
        }
    }

    window.WathekBackup = { run: run, paintLast: paintLast };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paintLast);
    else paintLast();
})();
