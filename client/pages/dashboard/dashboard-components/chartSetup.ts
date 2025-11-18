import {
    Chart as ChartJS,
    ArcElement,
    BarElement,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    Filler,
} from "chart.js"

/* Regist once (import this file anywhere before rendering charts) */
ChartJS.register(
    ArcElement, BarElement, LineElement,
    PointElement, CategoryScale, LinearScale,
    Tooltip, Legend, Filler
);

/* Read a CSS var from :root and return it as a string */
export function cssVar(name: string, fallback = ""): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/* Convert an "r,g,b" string or a hex to rgba(...) with alpha */
export function rgba(color: string, alpha = 1): string {
    if (!color) return `rgba(255,255,255,${alpha})`;
    if (color.includes(",")) return `rgba(${color},${alpha})`; // Already RGB format
    // Naive hex -> rgb
    const hex = color.replace("#", "");
    const bigint = parseInt(hex.length === 3 ? hex.split("").map(c => c + c).join("") : hex, 16);
    const r = (bigint >> 16) & 255,
        g = (bigint >> 8) & 255,
        b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* Theme defaults from the CSS variables */
export function applyChartDefaults() {
    const axis = rgba(cssVar("--color-blue-5-rgb"), 0.9);
    const grid = rgba(cssVar("--color-blue-5-rgb"), 0.12);
    ChartJS.defaults.color = axis;
    ChartJS.defaults.font.family = "Poppins, sans-serif";
    ChartJS.defaults.borderColor = grid;
    ChartJS.defaults.plugins.legend.labels.color = axis;
    ChartJS.defaults.plugins.tooltip.titleColor = cssVar("--color-blue-5");
    ChartJS.defaults.plugins.tooltip.bodyColor = cssVar("--color-blue-5");
}