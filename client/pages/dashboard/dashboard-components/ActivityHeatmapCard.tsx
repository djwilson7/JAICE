/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Chart } from "react-chartjs-2";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";
import { Chart as ChartJS } from "chart.js";
import type { ChartOptions } from "chart.js";
import { Card, ChartError, ChartHost, ChartSkeleton } from "./Card";
import { applyChartDefaults } from "./chartSetup";
import { api } from "@/global-services/api";
import { chartDescText } from "./chartDescText";

// Register the matrix controller
ChartJS.register(MatrixController, MatrixElement);

type HeatmapData = {
  x: string; // date/week label
  y: string; // day of week (Sun-Sat)
  v: number; // value (application count)
  date?: string;
};

interface MatrixContext {
  chart: {
    chartArea?: {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    };
  };
  raw?: HeatmapData;
}

function formatHeatmapTooltipTitle(raw: HeatmapData) {
  const weekLabel = raw.x || "";
  if (!raw.date) return weekLabel;

  const parts = raw.date.split("-");
  if (parts.length !== 3) return weekLabel;

  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const date = new Date(year, month, day);

  if (Number.isNaN(date.getTime())) return weekLabel;

  const monthName = date.toLocaleDateString("en-US", { month: "short" });
  const weekNumber = weekLabel.replace(/\D/g, "") || weekLabel;

  return {
    dateLabel: `${monthName} ${date.getDate()}`,
    weekLabel: `(WK ${weekNumber})`,
  };
}

const heatmapTooltipHandler = (context: any) => {
  // Tooltip Element
  let tooltipEl = document.getElementById("chartjs-heatmap-tooltip");

  // Create element on first render
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "chartjs-heatmap-tooltip";
    tooltipEl.style.position = "absolute";
    tooltipEl.style.zIndex = "10000";
    tooltipEl.style.pointerEvents = "none";
    tooltipEl.style.transition = "opacity 0.15s ease, transform 0.15s ease";
    document.body.appendChild(tooltipEl);
  }

  // Hide if no tooltip
  const tooltipModel = context.tooltip;
  if (tooltipModel.opacity === 0) {
    tooltipEl.style.opacity = "0";
    return;
  }

  // Set Text
  if (tooltipModel.body) {
    const bodyLines = tooltipModel.body || [];
    const raw = tooltipModel.dataPoints?.[0]?.raw as HeatmapData | undefined;
    const title = raw ? formatHeatmapTooltipTitle(raw) : "";

    let innerHtml = "<div style='font-family: Poppins, sans-serif; font-size: 12px;'>";

    if (typeof title === "string") {
      innerHtml += `<div style='font-weight: bold; margin-bottom: 8px; font-size: 13px; letter-spacing: 0.5px;'>${title}</div>`;
    } else {
      innerHtml += `<div style='font-weight: bold; margin-bottom: 8px; font-size: 13px; letter-spacing: 0.5px;'><span>${title.dateLabel}</span> <span style='font-size: 11px; font-weight: 500; opacity: 0.62;'>${title.weekLabel}</span></div>`;
    }

    bodyLines.forEach((bodyItem: any) => {
      const labelText = bodyItem.lines[0];
      innerHtml += `<div style='font-weight: 500; opacity: 0.95;'>${labelText}</div>`;
    });

    innerHtml += "</div>";
    tooltipEl.innerHTML = innerHtml;
  }

  const position = context.chart.canvas.getBoundingClientRect();

  // Display, position, and set styles for appearance
  tooltipEl.style.opacity = "1";
  
  // Offset positioning to avoid obscuring the hovered block
  const chartWidth = position.width;
  const isRightHalf = tooltipModel.caretX > chartWidth / 2;

  if (isRightHalf) {
    tooltipEl.style.left = position.left + window.scrollX + tooltipModel.caretX - 16 + "px";
    tooltipEl.style.transform = "translate(-100%, -50%)";
  } else {
    tooltipEl.style.left = position.left + window.scrollX + tooltipModel.caretX + 16 + "px";
    tooltipEl.style.transform = "translate(0, -50%)";
  }
  tooltipEl.style.top = position.top + window.scrollY + tooltipModel.caretY + "px";
  
  // Custom glassmorphic styles matching title info popover perfectly
  tooltipEl.style.minWidth = "150px";
  tooltipEl.style.width = "max-content";
  tooltipEl.style.maxWidth = "calc(100vw - 24px)";
  tooltipEl.style.whiteSpace = "nowrap";
  tooltipEl.style.border = "1px solid rgba(var(--primary-five-rgb), 0.24)";
  tooltipEl.style.borderRadius = "12px";
  tooltipEl.style.background = "rgba(var(--primary-one-rgb), 0.82)";
  tooltipEl.style.backdropFilter = "blur(16px) saturate(1.25)";
  tooltipEl.style.setProperty("-webkit-backdrop-filter", "blur(16px) saturate(1.25)");
  tooltipEl.style.boxShadow = "0 18px 40px rgba(0,0,0,0.32), inset 0 0 0 1px rgba(var(--primary-five-rgb), 0.06)";
  tooltipEl.style.color = "var(--primary-five)";
  tooltipEl.style.padding = "12px 14px";
};

export function ActivityHeatmapCard({
  className = "",
  height,
}: {
  className?: string;
  height?: number | string;
}) {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    applyChartDefaults();
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await api("/api/dashboard/activity-heatmap", {
          method: "GET",
        });

        if (!alive) return;

        const data = (res?.data ?? []) as HeatmapData[];
        setHeatmapData(data);
      } catch (err) {
        if (!alive) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load activity heatmap data."
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
      const el = document.getElementById("chartjs-heatmap-tooltip");
      if (el) el.remove();
    };
  }, []);

  const maxValue = heatmapData.length
    ? Math.max(...heatmapData.map((d) => d.v))
    : 0;

  const chartData: any = {
    datasets: [
      {
        label: "Applications",
        data: heatmapData,
        backgroundColor(context: MatrixContext) {
          const value = context.raw?.v || 0;
          if (value === 0) return "rgba(255,255,255,0.05)";
          
          // Vibrant green intensity scale.
          // Brighter/more vibrant green for more activity, darker/deeper green for less activity.
          const intensity = Math.min(value / Math.max(maxValue, 1), 1);
          const r = Math.floor(16 + 41 * intensity);
          const g = Math.floor(50 + 161 * intensity);
          const b = Math.floor(28 + 55 * intensity);
          
          return `rgba(${r}, ${g}, ${b}, ${0.4 + intensity * 0.6})`;
        },
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        width(context: MatrixContext) {
          const a = context.chart.chartArea || { left: 0, right: 0 };
          return ((a.right || 0) - (a.left || 0)) / 13 - 2; // ~12 weeks + padding
        },
        height(context: MatrixContext) {
          const a = context.chart.chartArea || { top: 0, bottom: 0 };
          return ((a.bottom || 0) - (a.top || 0)) / 7 - 2; // 7 days
        },
      },
    ],
  };

  const options: ChartOptions<"matrix"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false,
        external: heatmapTooltipHandler,
        callbacks: {
          title: (items) => {
            const item = items[0];
            const raw = item.raw as HeatmapData;
            const title = formatHeatmapTooltipTitle(raw);
            return typeof title === "string"
              ? title
              : `${title.dateLabel} ${title.weekLabel}`;
          },
          label: (item) => {
            const raw = item.raw as HeatmapData;
            const count = raw.v || 0;
            return `${count} application${count !== 1 ? "s" : ""}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "category",
        position: "bottom",
        offset: true,
        ticks: {
          color: "rgba(255,255,255,0.85)",
          font: { size: 11 },
          maxRotation: 0,
          minRotation: 0,
          autoSkip: false,
          callback: function(this: any, _val: any, index: number): string {
            const label = this.getLabelForValue(_val);
            if (!label) return "";
            // Display X axis labels every 3 weeks (sparse & horizontal)
            if (index % 3 === 0) {
              return label;
            }
            return "";
          }
        },
        grid: {
          display: true,
          offset: true,
          color: "rgba(255,255,255,0.04)",
          lineWidth: 1,
          drawTicks: false            
        },
        border: { display: false },
      },
      y: {
        type: "category",
        offset: true,
        labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        ticks: {
          color: "rgba(255,255,255,0.85)",
          font: { size: 11 },
        },
        grid: { 
          display: true,
          offset: true,
          color: "rgba(255,255,255,0.08)",
          lineWidth: 1,
          drawTicks: false,
        },
        border: { display: false },
      },
    },
  };

  const content = () => {
    if (loading) {
      return <ChartSkeleton variant="heatmap" />;
    }

    if (error) {
      return <ChartError message={error} />;
    }

    if (!heatmapData.length) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-slate-300">
          No activity data available yet.
        </div>
      );
    }

    return <Chart type="matrix" data={chartData} options={options} />;
  };

  return (
    <Card
      title="Activity Heatmap"
      subtitle="12-week application pattern"
      infoDescription={chartDescText.activityHeatmap}
      className={className}
      height={height ?? "18rem"}
    >
      <ChartHost>{content()}</ChartHost>
    </Card>
  );
}

export default ActivityHeatmapCard;
