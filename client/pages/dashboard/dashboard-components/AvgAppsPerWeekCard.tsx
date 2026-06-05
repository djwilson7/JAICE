import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import type { Chart, ChartData, ChartOptions, TooltipModel } from "chart.js";
import { Card, ChartError, ChartHost, ChartSkeleton } from "./Card";
import { applyChartDefaults } from "./chartSetup";
import { api } from "@/global-services/api";
import { chartDescText } from "./chartDescText";
import { useSettings } from "@/pages/settings/provider/settingsContext";
import { getDashboardChartTheme } from "./chartTheme";

function normalizeWeekLabel(label: string) {
  return label.replace(/^\((WK\s+\d+)\)$/i, "$1");
}

function formatWeekTooltipTitle(weekLabel: string, weekStartDate?: string) {
  const normalizedWeek = normalizeWeekLabel(weekLabel);
  if (!weekStartDate) return normalizedWeek;

  const parts = weekStartDate.split("-");
  if (parts.length !== 3) return normalizedWeek;

  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const date = new Date(year, month, day);

  if (Number.isNaN(date.getTime())) return normalizedWeek;

  const monthName = date.toLocaleDateString("en-US", { month: "short" });
  const weekNumber = normalizedWeek.replace(/\D/g, "") || normalizedWeek;

  return `${monthName} ${date.getDate()} (WK ${weekNumber})`;
}

const createAvgAppsTooltipHandler =
  (weekStartDates: string[]) => (context: {
    chart: Chart<"line">;
    tooltip: TooltipModel<"line">;
  }) => {
  let tooltipEl = document.getElementById("chartjs-avg-apps-tooltip");

  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "chartjs-avg-apps-tooltip";
    tooltipEl.style.position = "absolute";
    tooltipEl.style.zIndex = "10000";
    tooltipEl.style.pointerEvents = "none";
    tooltipEl.style.transition = "opacity 0.15s ease, transform 0.15s ease";
    document.body.appendChild(tooltipEl);
  }

  const tooltipModel = context.tooltip;
  if (tooltipModel.opacity === 0) {
    tooltipEl.style.opacity = "0";
    return;
  }

  const point = tooltipModel.dataPoints?.[0];
  if (point) {
    const weekStartDate = weekStartDates[point.dataIndex];
    const weekLabel = formatWeekTooltipTitle(point.label || "", weekStartDate);
    const value = Number(point.parsed?.y ?? 0);
    const appLabel = value === 1 ? "application" : "applications";

    tooltipEl.innerHTML = `
      <div style="font-family: Poppins, sans-serif; font-size: 12px;">
        <div style="font-weight: bold; margin-bottom: 8px; font-size: 13px; letter-spacing: 0.5px;">${weekLabel}</div>
        <div style="font-weight: 500; opacity: 0.95;">${value} ${appLabel} / week</div>
      </div>
    `;
  }

  const position = context.chart.canvas.getBoundingClientRect();
  const chartWidth = position.width;
  const isRightHalf = tooltipModel.caretX > chartWidth / 2;

  tooltipEl.style.opacity = "1";
  tooltipEl.style.top = position.top + window.scrollY + tooltipModel.caretY + "px";

  if (isRightHalf) {
    tooltipEl.style.left = position.left + window.scrollX + tooltipModel.caretX - 16 + "px";
    tooltipEl.style.transform = "translate(-100%, -50%)";
  } else {
    tooltipEl.style.left = position.left + window.scrollX + tooltipModel.caretX + 16 + "px";
    tooltipEl.style.transform = "translate(0, -50%)";
  }

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

export function AvgAppsPerWeekCard({
  className = "",
  height,
}: {
  className?: string;
  height?: number | string;
}) {
  const { theme } = useSettings();
  const chartTheme = getDashboardChartTheme(theme);
  const [labels, setLabels] = useState<string[]>([]);
  const [values, setValues] = useState<number[]>([]);
  const [weekStartDates, setWeekStartDates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applyChartDefaults();

    async function fetchData() {
      try {
        setError(null);
        const res = await api("/api/dashboard/avg-apps-per-week");
        const data = res.data ?? res;

        setLabels((data.labels ?? []).map(normalizeWeekLabel));
        setValues(data.values ?? []);
        setWeekStartDates(data.week_start_dates ?? []);
      } catch (err) {
        console.error("Error fetching avg apps per week", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load average applications per week.",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    return () => {
      const el = document.getElementById("chartjs-avg-apps-tooltip");
      if (el) el.remove();
    };
  }, []);

  if (loading) {
    return (
      <Card
        title="Avg Applications per Week"
        subtitle="12-week trend"
        infoDescription={chartDescText.avgAppsPerWeek}
        className={className}
        height={height ?? "18rem"}
      >
        <ChartHost>
          <ChartSkeleton variant="line" />
        </ChartHost>
      </Card>
    );
  }

  const maxValue = Math.max(...values, 5);
  const xTickInterval = 3;

  const data: ChartData<"line"> = {
    labels,
    datasets: [
      {
        label: "Applications / Week",
        data: values,
        borderColor: chartTheme.avgLine,
        backgroundColor: chartTheme.avgFill,
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 6,
        tension: 0.4,
        fill: false,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false,
        mode: "index",
        intersect: false,
        external: createAvgAppsTooltipHandler(weekStartDates),
      },
    },
    scales: {
      x: {
        grid: { color: chartTheme.grid },
        border: { color: chartTheme.border },
        ticks: {
          color: chartTheme.axis,
          autoSkip: false,
          maxRotation: 0,
          minRotation: 0,
          callback: function(_value, index) {
            if (index % xTickInterval === 0) {
              return normalizeWeekLabel(labels[index]);
            }

            return "";
          },
        },
      },
      y: {
        beginAtZero: true,
        suggestedMax: maxValue + 1,
        grid: { color: chartTheme.grid },
        border: { color: chartTheme.border },
        ticks: { color: chartTheme.axis },
      },
    },
  };

  return (
    <Card
      title="Avg Applications per Week"
      subtitle="12-week trend"
      infoDescription={chartDescText.avgAppsPerWeek}
      className={className}
      height={height ?? "18rem"}
    >
      <ChartHost>
        {error ? <ChartError message={error} /> : <Line data={data} options={options} />}
      </ChartHost>
    </Card>
  );
}

export default AvgAppsPerWeekCard;
