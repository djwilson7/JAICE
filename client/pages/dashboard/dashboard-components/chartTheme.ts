// chartTheme.ts
import type { ChartOptions, ChartType } from "chart.js";
import type { Theme } from "@/pages/settings/provider/settingsTypes";

export const c  = (name: string) => `rgb(var(${name}))`;
export const ca = (name: string, a: number) => `rgba(var(${name}), ${a})`;

export type DashboardChartTheme = {
  isLight: boolean;
  axis: string;
  axisMuted: string;
  grid: string;
  gridStrong: string;
  border: string;
  legend: string;
  emptyText: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  stageColors: {
    applied: string;
    interview: string;
    offer: string;
    accepted: string;
  };
  avgLine: string;
  avgFill: string;
  tile: {
    border: string;
    background: string;
    shadow: string;
    label: string;
    value: string;
    unit: string;
  };
  heatmap: {
    zero: string;
    border: string;
    low: [number, number, number];
    high: [number, number, number];
  };
};

export function getDashboardChartTheme(theme: Theme): DashboardChartTheme {
  const isLight = theme === "light";

  return {
    isLight,
    axis: isLight ? "rgba(30,41,59,0.88)" : "rgba(255,255,255,0.86)",
    axisMuted: isLight ? "rgba(71,85,105,0.68)" : "rgba(203,213,225,0.68)",
    grid: isLight ? "rgba(100,116,139,0.16)" : "rgba(255,255,255,0.04)",
    gridStrong: isLight ? "rgba(100,116,139,0.28)" : "rgba(255,255,255,0.12)",
    border: isLight ? "rgba(100,116,139,0.34)" : "rgba(255,255,255,0.25)",
    legend: isLight ? "rgba(30,41,59,0.72)" : "rgba(255,255,255,0.62)",
    emptyText: isLight ? "text-slate-600" : "text-slate-300",
    tooltipBg: isLight ? "rgba(248,250,252,0.92)" : "rgba(var(--primary-one-rgb), 0.82)",
    tooltipBorder: isLight ? "rgba(100,116,139,0.28)" : "rgba(var(--primary-five-rgb), 0.24)",
    tooltipText: isLight ? "#0f172a" : "var(--primary-five)",
    stageColors: isLight
      ? {
          applied: "#B45309",
          interview: "#0891B2",
          offer: "#7C3AED",
          accepted: "#059669",
        }
      : {
          applied: "#F59E0B",
          interview: "#22D3EE",
          offer: "#A78BFA",
          accepted: "#34D399",
        },
    avgLine: isLight ? "#0F766E" : "#E5E7EB",
    avgFill: isLight ? "rgba(15,118,110,0.14)" : "rgba(229,231,235,0.16)",
    tile: {
      border: isLight ? "border-slate-300/80" : "border-white/10",
      background: isLight ? "bg-white/70" : "bg-slate-900/50",
      shadow: isLight ? "shadow-[0_10px_24px_rgba(15,23,42,0.10)]" : "shadow-lg shadow-black/30",
      label: isLight ? "text-slate-600" : "text-[rgba(255,255,255,0.62)]",
      value: isLight ? "text-slate-950" : "text-white",
      unit: isLight ? "text-slate-500" : "text-slate-400",
    },
    heatmap: {
      zero: isLight ? "rgba(148,163,184,0.18)" : "rgba(255,255,255,0.05)",
      border: isLight ? "rgba(100,116,139,0.22)" : "rgba(255,255,255,0.1)",
      low: isLight ? [187, 247, 208] : [16, 50, 28],
      high: isLight ? [22, 101, 52] : [57, 211, 83],
    },
  };
}

/**
 * Dark-theme base options for any chart type.
 * Pass per-chart overrides; literals stay correctly typed.
 */
export function makeDarkOptions<TType extends ChartType>(
  overrides: ChartOptions<TType> = {} as ChartOptions<TType>
): ChartOptions<TType> {
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest" as const, intersect: false },
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { color: "rgba(255,255,255,.9)", usePointStyle: true, boxWidth: 10 },
      },
      tooltip: {
        backgroundColor: "rgba(15,20,30,.95)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "rgba(255,255,255,.2)",
        borderWidth: 1,
      },
    },
  } as unknown as ChartOptions<TType>;

  return { ...base, ...overrides };
}
