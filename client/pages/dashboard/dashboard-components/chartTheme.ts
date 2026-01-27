// chartTheme.ts
import type { ChartOptions, ChartType } from "chart.js";

export const c  = (name: string) => `rgb(var(${name}))`;
export const ca = (name: string, a: number) => `rgba(var(${name}), ${a})`;

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
