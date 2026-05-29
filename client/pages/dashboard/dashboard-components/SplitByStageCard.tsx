import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { Card, ChartError, ChartHost, ChartLegend, ChartSkeleton } from "./Card";
import { getDashboardChartTheme } from "./chartTheme";
import { applyChartDefaults } from "./chartSetup";
import { api } from "@/global-services/api";
import { chartDescText } from "./chartDescText";
import { useSettings } from "@/pages/settings/provider/SettingsProvider";

const splitByStageTooltipHandler = (context: any) => {
  let tooltipEl = document.getElementById("chartjs-split-by-stage-tooltip");

  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "chartjs-split-by-stage-tooltip";
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

  const points = tooltipModel.dataPoints ?? [];
  if (points.length) {
    const title = points[0]?.label ?? tooltipModel.title?.[0] ?? "";

    let innerHtml = "<div style='font-family: Poppins, sans-serif; font-size: 12px;'>";
    innerHtml += `<div style='font-weight: bold; margin-bottom: 8px; font-size: 13px; letter-spacing: 0.5px;'>${title}</div>`;

    points.forEach((point: any) => {
      const stage = point.dataset?.label ?? "";
      const count = Number(point.parsed?.y ?? 0);
      const appLabel = count === 1 ? "application" : "applications";
      const color = point.dataset?.borderColor ?? "var(--primary-five)";
      const marker = `<span style='display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; background: ${color};'></span>`;
      innerHtml += `<div style='display: flex; align-items: center; margin-bottom: 6px; font-weight: 500; opacity: 0.95;'>${marker}${stage}: ${count} ${appLabel}</div>`;
    });

    innerHtml += "</div>";
    tooltipEl.innerHTML = innerHtml;
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

export function SplitByStageCard({
  className = "",
  height,
}: {
  className?: string;
  height?: number | string;
}) {
  const { theme } = useSettings();
  const chartTheme = getDashboardChartTheme(theme);
  const [labels, setLabels] = useState<string[]>([]);
  const [applied, setApplied] = useState<number[]>([]);
  const [interview, setInterview] = useState<number[]>([]);
  const [offer, setOffer] = useState<number[]>([]);
  const [accepted, setAccepted] = useState<number[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    applyChartDefaults();
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await api("/api/dashboard/split-by-stage-monthly", {
          method: "GET",
        });

        if (!alive) return;

        const data = res?.data;
        if (!data) throw new Error("Invalid stage split response");

        const { labels = [], stage_counts = {} } = data;

        setLabels(labels);
        setApplied(stage_counts.applied ?? []);
        setInterview(stage_counts.interview ?? []);
        setOffer(stage_counts.offer ?? []);
        setAccepted(stage_counts.accepted ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load stage split data",
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
      const el = document.getElementById("chartjs-split-by-stage-tooltip");
      if (el) el.remove();
    };
  }, []);

  // Same palette as AppsOverTime
  const colors = chartTheme.stageColors;
  const legendItems = [
    { label: "Applied", color: colors.applied },
    { label: "Interview", color: colors.interview },
    { label: "Offer", color: colors.offer },
    { label: "Accepted", color: colors.accepted },
  ];

  const common = { borderWidth: 2, borderRadius: 6, barThickness: 16 };

  const data: ChartData<"bar"> = {
    labels,
    datasets: [
      {
        label: "Applied",
        data: applied,
        backgroundColor: `${colors.applied}66`,
        borderColor: colors.applied,
        ...common,
      },
      {
        label: "Interview",
        data: interview,
        backgroundColor: `${colors.interview}66`,
        borderColor: colors.interview,
        ...common,
      },
      {
        label: "Offer",
        data: offer,
        backgroundColor: `${colors.offer}66`,
        borderColor: colors.offer,
        ...common,
      },
      {
        label: "Accepted",
        data: accepted,
        backgroundColor: `${colors.accepted}66`,
        borderColor: colors.accepted,
        ...common,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
        mode: "index",
        intersect: false,
        external: splitByStageTooltipHandler,
      }
    },
    scales: {
      x: {
        stacked: false,
        ticks: { color: chartTheme.axis },
        grid: { color: chartTheme.grid },
        border: { color: chartTheme.border },
      },
      y: {
        stacked: false,
        beginAtZero: true,
        ticks: {
          color: chartTheme.axis,
          precision: 0,
        },
        grid: { color: chartTheme.grid },
        border: { color: chartTheme.border },
      },
    },
  };

  const content = () => {
    if (loading) {
      return <ChartSkeleton variant="bar" />;
    }

    if (error) {
      return <ChartError message={error} />;
    }

    if (!labels.length) {
      return (
        <div className={`flex h-full items-center justify-center text-sm ${chartTheme.emptyText}`}>
          No applications to display yet.
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-0 w-full flex-col">
        <div className="min-h-0 flex-1">
          <Bar data={data} options={options} />
        </div>
        <ChartLegend items={legendItems} />
      </div>
    );
  };

  return (
    <Card
      title="Split by Stage"
      subtitle="Monthly counts"
      infoDescription={chartDescText.splitByStage}
      className={className}
      height={height ?? "18rem"}
    >
      <ChartHost>{content()}</ChartHost>
    </Card>
  );
}

export default SplitByStageCard;
