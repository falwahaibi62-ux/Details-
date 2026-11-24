/*
 * Small shared helper for the separate date filters on the Rentals and Warehouse pages.
 * - Each page keeps its own From / To dates, so one page's filter never changes the other pages.
 * - The filter only changes what is shown on that page; the saved data and the reports are not touched.
 */
(function () {
    function parse(text) {
        const raw = String(text === null || text === undefined ? '' : text).trim().split(' ')[0];
        let m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
        m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return null;
    }

    // from / to are 'YYYY-MM-DD' strings from the date inputs ('' = not set). Both ends are included.
    function inRange(dateText, from, to) {
        if (!from && !to) return true;
        const d = parse(dateText);
        if (!d) return false;
        if (from && d < parse(from)) return false;
        if (to && d > parse(to)) return false;
        return true;
    }

    function esc(v) {
        return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    // id: element id prefix; applyFn / clearFn: names of global functions; range: { from, to }
    function barHTML(id, applyFn, clearFn, range) {
        const r = range || { from: '', to: '' };
        const field = 'p-2.5 border rounded-xl text-xs bg-white focus:outline-none focus:border-primary-500';
        return `
        <div class="flex flex-wrap items-end gap-3 bg-white p-4 rounded-2xl border border-surface-200/80 shadow-sm w-full">
            <div class="flex flex-col gap-1">
                <label for="${id}From" class="text-[10px] uppercase font-bold text-surface-500">From date</label>
                <input type="date" id="${id}From" value="${esc(r.from)}" onchange="${applyFn}()" class="${field}">
            </div>
            <div class="flex flex-col gap-1">
                <label for="${id}To" class="text-[10px] uppercase font-bold text-surface-500">To date</label>
                <input type="date" id="${id}To" value="${esc(r.to)}" onchange="${applyFn}()" class="${field}">
            </div>
            <button type="button" onclick="${clearFn}()" class="px-4 py-2.5 border border-surface-200 rounded-xl text-xs font-semibold text-surface-700 hover:bg-surface-100 transition cursor-pointer">Clear</button>
            <span id="${id}Count" class="text-[11px] text-surface-500 sm:ml-auto"></span>
        </div>`;
    }

    window.WathekDateRange = { parse: parse, inRange: inRange, barHTML: barHTML };
})();
