/**
 * IntHub Design System
 *
 * Single source-of-truth for all visual tokens used across the platform.
 * Import { ds } and use ds.colors.primary, ds.tw.primaryBtn etc. in components.
 *
 * Note: This project uses plain JS; the .js extension is intentional.
 */

export const ds = {
    // ── Color palette ──────────────────────────────────────────────────────
    colors: {
        primary: "#f97316",   // IntHub orange
        primaryHover: "#ea580c",
        primaryDeep: "#c2410c",
        card: "#ffffff",
        background: "#f8fafc",
        border: "#e2e8f0",
        textPrimary: "#0f172a",
        textSecondary: "#64748b",
        accent: "#f97316",

        // Compat badge colours (used in InternshipCard)
        compatHigh: { bg: "#dcfce7", text: "#15803d" },
        compatMed: { bg: "#fef3c7", text: "#92400e" },
        compatLow: { bg: "#f1f5f9", text: "#64748b" },
    },

    // ── Border radius ──────────────────────────────────────────────────────
    radius: {
        card: "12px",
        button: "10px",
        badge: "8px",
        input: "8px",
    },

    // ── Shadows ────────────────────────────────────────────────────────────
    shadow: {
        card: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)",
        hover: "0 8px 30px rgba(0,0,0,0.08)",
        orange: "0 4px 14px rgba(249,115,22,0.25)",
    },

    // ── Typography ─────────────────────────────────────────────────────────
    font: {
        family: "'Inter', 'Manrope', sans-serif",
        weightSemibold: "600",
        weightBold: "700",
    },

    // ── Tailwind utility shorthands (pre-built class strings) ─────────────
    //  Use these in JSX instead of hardcoded Tailwind to keep changes central.
    tw: {
        // Buttons
        primaryBtn: "bg-orange-500 hover:bg-orange-600 text-white font-medium transition-all duration-200",
        outlineBtn: "border border-border text-foreground hover:border-orange-400 hover:text-orange-600 transition-all duration-200",
        ghostBtn: "hover:bg-orange-50 hover:text-orange-600 transition-all duration-200",
        dangerBtn: "text-destructive hover:text-destructive hover:bg-red-50 transition-all duration-200",

        // Cards
        card: "bg-white rounded-[12px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
        cardHover: "hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-shadow duration-200",

        // Badges
        tagBadge: "text-[10px] rounded-[8px] font-normal border border-border",
        sourceBadge: "text-[10px] rounded-[8px] capitalize opacity-60",
        remoteBadge: "text-xs rounded-[8px] bg-orange-50 text-orange-700 border-orange-200",

        // Loading spinner
        spinner: "w-8 h-8 animate-spin text-orange-500",

        // Section icon accent
        sectionIcon: "text-orange-500",

        // Focus ring
        focusRing: "focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500",
    },
};

export default ds;
