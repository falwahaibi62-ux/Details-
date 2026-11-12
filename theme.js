/* ==========================================================
   Wathek - THEME COLORS (the only file you need to edit)
   ==========================================================

   HOW TO CHANGE A COLOR
   ---------------------
   1. Find the role below in THEME (for example "primary").
   2. Replace its value with any palette name from PALETTES
      (for example 'blue', 'indigo', 'teal', 'rose', 'violet' ...).
   3. Save the file and refresh the page.

   Example: make the main color blue instead of green:
       primary: 'blue',

   You can also use your own exact colors by giving a full set of shades:
       primary: { 50:'#...', 100:'#...', 200:'#...', 300:'#...', 400:'#...',
                  500:'#...', 600:'#...', 700:'#...', 800:'#...', 900:'#...', 950:'#...' },

   Shade guide: 50-100 = very light backgrounds, 500-600 = main color,
                700-900 = dark text / hover states.
   ========================================================== */

const THEME = {
    primary:   'brown',   // Main brand color: buttons, active tab, amounts, totals
    surface:   'mocha',   // Page background, sidebar, text, borders, tables
    info:      'olive',      // Information cards, "other payments", hotel
    warning:   'amber',      // Truck rentals, grand total cards
    accent:    'terracotta', // Warehouse section, helpers column
    danger:    'red',        // Delete buttons and errors
    alert:     'rose',       // Total expenses, permanent delete buttons
    highlight: 'orange',     // Diesel card on the dashboard
    secondary: 'plum',       // Warehouse save button, truck rental menu icon
    extra1:    'sand',       // Reports: BC payment column
    extra2:    'sage',       // Reports: PC payment column
    extra3:    'copper'      // Reports: CC payment column
};

// Modern glass look (frosted, see-through cards over a soft blurred colorful background).
// Set enabled: false to go back to the classic solid look.
const GLASS = {
    enabled: true,
    blur: 18,             // How blurry the glass is, in pixels (8 = light, 24 = strong)
    cardOpacity: 0.55,    // Card whiteness: 0 = fully see-through, 1 = solid white
    sidebarOpacity: 0.72, // Sidebar darkness: 0 = see-through, 1 = solid
    background: 'surface.100',                             // Base page color behind the glass
    blobs: ['primary.400', 'primary.700', 'warning.300'],  // The 3 soft color glows in the background
    blobStrength: 0.5,    // How visible the color glows are (0 - 1)
    animate: true,        // Slowly moving background glows (false = still background)
    animationSpeed: 22    // Seconds for one full movement (bigger = slower and calmer)
};

// Colors of the payment-method pie chart on the dashboard, in order.
// Each entry is "role.shade", "palette.shade" or a hex color like '#10b981'.
const CHART_COLORS = [
    'primary.500', 'info.500', 'accent.500', 'warning.500', 'extra1.500',
    'extra3.500', 'secondary.500', 'extra2.500', 'surface.500', 'surface.300'
];

// Very light tints used only in the PDF report background and table rows.
const PDF_TINTS = {
    backgroundStart: '#faf6f1',
    backgroundMiddle: '#f7f1ea',
    backgroundEnd: '#f4ede6',
    rowLine: '#efe7df',
    rowStripe: '#fcfaf7'
};

/* ==========================================================
   Palettes (standard Tailwind CSS colors). No need to edit below.
   ========================================================== */
const PALETTES = (() => {
    const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
    const raw = {
        slate:   ['#f8fafc','#f1f5f9','#e2e8f0','#cbd5e1','#94a3b8','#64748b','#475569','#334155','#1e293b','#0f172a','#020617'],
        gray:    ['#f9fafb','#f3f4f6','#e5e7eb','#d1d5db','#9ca3af','#6b7280','#4b5563','#374151','#1f2937','#111827','#030712'],
        zinc:    ['#fafafa','#f4f4f5','#e4e4e7','#d4d4d8','#a1a1aa','#71717a','#52525b','#3f3f46','#27272a','#18181b','#09090b'],
        neutral: ['#fafafa','#f5f5f5','#e5e5e5','#d4d4d4','#a3a3a3','#737373','#525252','#404040','#262626','#171717','#0a0a0a'],
        stone:   ['#fafaf9','#f5f5f4','#e7e5e4','#d6d3d1','#a8a29e','#78716c','#57534e','#44403c','#292524','#1c1917','#0c0a09'],
        red:     ['#fef2f2','#fee2e2','#fecaca','#fca5a5','#f87171','#ef4444','#dc2626','#b91c1c','#991b1b','#7f1d1d','#450a0a'],
        orange:  ['#fff7ed','#ffedd5','#fed7aa','#fdba74','#fb923c','#f97316','#ea580c','#c2410c','#9a3412','#7c2d12','#431407'],
        amber:   ['#fffbeb','#fef3c7','#fde68a','#fcd34d','#fbbf24','#f59e0b','#d97706','#b45309','#92400e','#78350f','#451a03'],
        yellow:  ['#fefce8','#fef9c3','#fef08a','#fde047','#facc15','#eab308','#ca8a04','#a16207','#854d0e','#713f12','#422006'],
        lime:    ['#f7fee7','#ecfccb','#d9f99d','#bef264','#a3e635','#84cc16','#65a30d','#4d7c0f','#3f6212','#365314','#1a2e05'],
        green:   ['#f0fdf4','#dcfce7','#bbf7d0','#86efac','#4ade80','#22c55e','#16a34a','#15803d','#166534','#14532d','#052e16'],
        emerald: ['#ecfdf5','#d1fae5','#a7f3d0','#6ee7b7','#34d399','#10b981','#059669','#047857','#065f46','#064e3b','#022c22'],
        teal:    ['#f0fdfa','#ccfbf1','#99f6e4','#5eead4','#2dd4bf','#14b8a6','#0d9488','#0f766e','#115e59','#134e4a','#042f2e'],
        cyan:    ['#ecfeff','#cffafe','#a5f3fc','#67e8f9','#22d3ee','#06b6d4','#0891b2','#0e7490','#155e75','#164e63','#083344'],
        sky:     ['#f0f9ff','#e0f2fe','#bae6fd','#7dd3fc','#38bdf8','#0ea5e9','#0284c7','#0369a1','#075985','#0c4a6e','#082f49'],
        blue:    ['#eff6ff','#dbeafe','#bfdbfe','#93c5fd','#60a5fa','#3b82f6','#2563eb','#1d4ed8','#1e40af','#1e3a8a','#172554'],
        indigo:  ['#eef2ff','#e0e7ff','#c7d2fe','#a5b4fc','#818cf8','#6366f1','#4f46e5','#4338ca','#3730a3','#312e81','#1e1b4b'],
        violet:  ['#f5f3ff','#ede9fe','#ddd6fe','#c4b5fd','#a78bfa','#8b5cf6','#7c3aed','#6d28d9','#5b21b6','#4c1d95','#2e1065'],
        purple:  ['#faf5ff','#f3e8ff','#e9d5ff','#d8b4fe','#c084fc','#a855f7','#9333ea','#7e22ce','#6b21a8','#581c87','#3b0764'],
        fuchsia: ['#fdf4ff','#fae8ff','#f5d0fe','#f0abfc','#e879f9','#d946ef','#c026d3','#a21caf','#86198f','#701a75','#4a044e'],
        pink:    ['#fdf2f8','#fce7f3','#fbcfe8','#f9a8d4','#f472b6','#ec4899','#db2777','#be185d','#9d174d','#831843','#500724'],
        rose:    ['#fff1f2','#ffe4e6','#fecdd3','#fda4af','#fb7185','#f43f5e','#e11d48','#be123c','#9f1239','#881337','#4c0519'],

        // Custom warm palettes (not part of Tailwind)
        brown:   ['#fbf6f1','#f4e9de','#e8d2bc','#d6b393','#bf8f66','#a3734b','#87603d','#6e4d33','#583e2b','#463224','#271a12'], // Medium-to-dark brown
        mocha:   ['#faf7f4','#f3ede7','#e7ddd3','#d4c4b5','#b09c8a','#8c7764','#6f5c4c','#57473b','#3f332b','#2b221c','#1a1410'], // Warm brown-grey for backgrounds and text
        olive:   ['#f8f8f0','#eff0dc','#dfe1b9','#c9cc8e','#adb062','#8f9345','#727636','#595c2c','#474a26','#3b3e22','#1f2110'], // Warm olive green
        terracotta: ['#fdf5f2','#fae6de','#f4ccbd','#eaa98f','#dd8263','#cc6443','#b04f32','#8f3f2b','#743528','#5f2e24','#331610'], // Clay red-orange
        plum:    ['#fbf4f6','#f6e6ec','#ecccd8','#dca6b9','#c67893','#ad5674','#924160','#78344f','#643044','#552b3b','#30141f'], // Warm wine
        sand:    ['#fbf9f3','#f5f0e1','#ebe0c2','#dcca9a','#c9ae6e','#b6954f','#9a7a40','#7b6036','#634e2f','#524229','#2d2314'], // Golden sand
        sage:    ['#f6f7f3','#eaede3','#d5dbc8','#b7c2a3','#97a57d','#7b8a60','#62704c','#4e593e','#404834','#363c2d','#1c2017'], // Muted warm green
        copper:  ['#fcf6f0','#f7e8d8','#eecfb0','#e1ae80','#d28a52','#c26f36','#a5582b','#854526','#6b3a24','#573120','#2f180e']  // Copper
    };
    const out = {};
    Object.keys(raw).forEach((name) => {
        out[name] = {};
        shades.forEach((s, i) => { out[name][s] = raw[name][i]; });
    });
    return out;
})();

/* ==========================================================
   Theme engine - connects the colors above to the whole system.
   ========================================================== */
(function applyTheme() {
    // Resolve each role to a full set of shades
    const resolved = {};
    Object.keys(THEME).forEach((role) => {
        const value = THEME[role];
        resolved[role] = typeof value === 'string' ? PALETTES[value] : value;
        if (!resolved[role]) {
            console.error(`Theme: unknown palette "${value}" for role "${role}". Falling back to slate.`);
            resolved[role] = PALETTES.slate;
        }
    });

    const hexToRgb = (hex) => {
        let h = String(hex).replace('#', '');
        if (h.length === 3) h = h.split('').map((c) => c + c).join('');
        const n = parseInt(h, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };

    // themeColor('primary', 600)        -> '#059669'
    // themeColor('primary', 600, 0.85)  -> 'rgba(5, 150, 105, 0.85)'
    // themeColor('primary.600')         -> '#059669'
    // Works with role names (primary, surface ...) and palette names (lime, violet ...).
    function themeColor(name, shade, alpha) {
        if (typeof name === 'string' && name.startsWith('#')) {
            return alpha === undefined ? name : `rgba(${hexToRgb(name).join(', ')}, ${alpha})`;
        }
        if (typeof name === 'string' && name.includes('.') && shade === undefined) {
            [name, shade] = name.split('.');
        }
        const set = resolved[name] || PALETTES[name] || PALETTES.slate;
        const hex = set[shade] || set[500];
        return alpha === undefined ? hex : `rgba(${hexToRgb(hex).join(', ')}, ${alpha})`;
    }

    window.THEME = THEME;
    window.PALETTES = PALETTES;
    window.PDF_TINTS = PDF_TINTS;
    window.themeColor = themeColor;
    window.CHART_COLORS = CHART_COLORS.map((c) => themeColor(c));

    // 1. Tailwind classes such as bg-primary-600, text-surface-800, border-info-200
    if (window.tailwind) {
        window.tailwind.config = { theme: { extend: { colors: resolved } } };
    } else {
        console.error('Theme: Tailwind CDN must be loaded before theme.js');
    }

    // 2. CSS variables for style.css: var(--primary-600) and rgb(var(--primary-600-rgb) / 0.5)
    const root = document.documentElement;

    // 3. Glass look settings (used by the "html.glass" rules in style.css)
    if (GLASS.enabled) {
        root.classList.add('glass');
        root.style.setProperty('--glass-blur', `${GLASS.blur}px`);
        root.style.setProperty('--glass-card', GLASS.cardOpacity);
        root.style.setProperty('--glass-sidebar', GLASS.sidebarOpacity);
        root.style.setProperty('--glass-bg', themeColor(GLASS.background));
        GLASS.blobs.forEach((c, i) => {
            root.style.setProperty(`--glass-blob-${i + 1}`, themeColor(c, undefined, GLASS.blobStrength));
        });
        if (GLASS.animate) {
            root.classList.add('glass-animate');
            root.style.setProperty('--glass-speed', `${GLASS.animationSpeed}s`);
        }
    }
    Object.keys(resolved).forEach((role) => {
        Object.keys(resolved[role]).forEach((shade) => {
            const hex = resolved[role][shade];
            root.style.setProperty(`--${role}-${shade}`, hex);
            root.style.setProperty(`--${role}-${shade}-rgb`, hexToRgb(hex).join(' '));
        });
    });
})();
