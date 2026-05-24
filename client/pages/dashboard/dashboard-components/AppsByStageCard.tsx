import { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { Card, ChartError, ChartHost, ChartLegend, ChartSkeleton } from "./Card";
import { Modal } from "./Modal";
import { applyChartDefaults } from "./chartSetup";
import { api } from "@/global-services/api";
import { chartDescText } from "./chartDescText";

const appsByStageTooltipHandler = (context: any) => {
  let tooltipEl = document.getElementById("chartjs-apps-by-stage-tooltip");

  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "chartjs-apps-by-stage-tooltip";
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
    const stage = point.label || "";
    const count = Number(point.parsed ?? 0);
    const appLabel = count === 1 ? "application" : "applications";
    const color = point.element?.options?.backgroundColor ?? "var(--primary-five)";

    tooltipEl.innerHTML = `
      <div style="font-family: Poppins, sans-serif; font-size: 12px;">
        <div style="font-weight: bold; margin-bottom: 8px; font-size: 13px; letter-spacing: 0.5px;">${stage}</div>
        <div style="display: flex; align-items: center; font-weight: 500; opacity: 0.95;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; background: ${color};"></span>
          ${count} ${appLabel}
        </div>
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

const STAGE_COLORS: Record<string, string> = {
  Applied: "#F59E0B",
  Interview: "#22D3EE",
  Offer: "#A78BFA",
  Accepted: "#34D399",
};
const STAGE_ORDER = ["Applied", "Interview", "Offer", "Accepted"];

export function AppsByStageCard({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState<string[]>([]);
  const [values, setValues] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    applyChartDefaults();
    let alive = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const res = await api("/api/dashboard/apps-by-stage", {
          method: "GET",
        });

        if (!alive) return;

        const payload = (res?.data ?? {}) as {
          labels?: string[];
          values?: number[];
        };

        const rawLabels = payload.labels ?? [];
        const rawValues = payload.values ?? [];
        const countsByStage = rawLabels.reduce<Record<string, number>>(
          (counts, label, index) => {
            counts[label] = rawValues[index] ?? 0;
            return counts;
          },
          {},
        );

        setLabels(STAGE_ORDER);
        setValues(STAGE_ORDER.map((stage) => countsByStage[stage] ?? 0));
      } catch (err) {
        if (!alive) return;
        console.error("Error fetching apps-by-stage", err);
        setError(
          err instanceof Error ? err.message : "Failed to load stage data.",
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchData();
    return () => {
      alive = false;
      const el = document.getElementById("chartjs-apps-by-stage-tooltip");
      if (el) el.remove();
    };
  }, []);

  const palette = labels.map(
    (label) => STAGE_COLORS[label] ?? "#64748B",
  );

  const chartData: ChartData<"doughnut"> = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: palette,
        borderColor: palette,
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
        external: appsByStageTooltipHandler,
      },
    },
    cutout: "60%",
  };

  const renderContent = (variant: "card" | "modal" = "card") => {
    const isModal = variant === "modal";
    const legendItems = STAGE_ORDER.map((stage) => ({
      label: stage,
      color: STAGE_COLORS[stage],
    }));

    if (loading) {
      return <ChartSkeleton variant="donut" />;
    }

    if (error) {
      return <ChartError message={error} />;
    }

    if (!labels.length || !values.length) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-slate-300">
          No applications to display yet.
        </div>
      );
    }

    return (
      <div
        className={`flex h-full flex-col items-center justify-center gap-6 ${
          isModal ? "pt-2 gap-10" : "pt-6 gap-6"
        }`}
      >
        {/* BIGGER donut in modal */}
        <div
          className={
            isModal
              ? "relative h-96 w-96 md:h-128 md:w-128"
              : "relative min-h-0 w-full min-w-0 flex-1"
          }
          style={{ paddingBottom: isModal ? 24 : 14 }}
        >
          <Doughnut data={chartData} options={options} />
        </div>

        <ChartLegend items={legendItems} />
      </div>
    );
  };

  return (
    <>
      <Card
        title="Applications by Stage"
        subtitle="Total distribution"
        infoDescription={chartDescText.appsByStage}
        className={`${className} cursor-pointer`}
        expandable
        onExpand={() => setOpen(true)}
      >
        <ChartHost>{renderContent("card")}</ChartHost>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Applications by Stage"
        description={chartDescText.appsByStage}
      >
        <div style={{ height: "100%", padding: "0 1rem 1rem 1rem" }}>
          {renderContent("modal")}
        </div>
      </Modal>
    </>
  );
}

export default AppsByStageCard;
