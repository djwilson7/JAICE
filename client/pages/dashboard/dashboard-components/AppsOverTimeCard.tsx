import { useEffect, useState } from "react";
import { Card, ChartError, ChartHost, ChartLegend, ChartSkeleton } from "./Card";
import { Line } from "react-chartjs-2";
import { applyChartDefaults } from "./chartSetup";
import { Modal } from "./Modal";
import { api } from "@/global-services/api";
import Button from "@/global-components/button";
import { chartDescText } from "./chartDescText";

type RangeOptions = 3 | 7 | 14 | 30 | 45 | 90;
const RANGES: RangeOptions[] = [3, 7, 14, 30, 45, 90];

// Generate the last N days as labels
function lastNDaysLabels(n: number) {
  const labels = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    labels.push(
      date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    );
  }
  return labels;
}

// Slice arrays by selected range
function applyRange(arr: number[], range: number) {
  if (!arr || arr.length === 0) return [];
  return arr.slice(-range);
}

const externalTooltipHandler = (context: any) => {
  // Tooltip Element
  let tooltipEl = document.getElementById("chartjs-apps-over-time-tooltip");

  // Create element on first render
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "chartjs-apps-over-time-tooltip";
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
    const titleLines = tooltipModel.title || [];
    const bodyLines = tooltipModel.body || [];

    let innerHtml = "<div style='font-family: Poppins, sans-serif; font-size: 12px;'>";

    titleLines.forEach((title: string) => {
      innerHtml += `<div style='font-weight: bold; margin-bottom: 8px; font-size: 13px; letter-spacing: 0.5px;'>${title}</div>`;
    });

    bodyLines.forEach((bodyItem: any, i: number) => {
      const colors = tooltipModel.labelColors[i];
      const stageName = bodyItem.lines[0];
      const span = `<span style='display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; background: ${colors.borderColor};'></span>`;
      innerHtml += `<div style='display: flex; align-items: center; margin-bottom: 6px; font-weight: 500; opacity: 0.95;'>${span}${stageName}</div>`;
    });

    innerHtml += "</div>";
    tooltipEl.innerHTML = innerHtml;
  }

  const position = context.chart.canvas.getBoundingClientRect();

  // Display, position, and set styles for appearance
  tooltipEl.style.opacity = "1";
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
  tooltipEl.style.border = "1px solid rgba(var(--primary-five-rgb), 0.24)";
  tooltipEl.style.borderRadius = "12px";
  tooltipEl.style.background = "rgba(var(--primary-one-rgb), 0.82)";
  tooltipEl.style.backdropFilter = "blur(16px) saturate(1.25)";
  tooltipEl.style.setProperty("-webkit-backdrop-filter", "blur(16px) saturate(1.25)");
  tooltipEl.style.boxShadow = "0 18px 40px rgba(0,0,0,0.32), inset 0 0 0 1px rgba(var(--primary-five-rgb), 0.06)";
  tooltipEl.style.color = "var(--primary-five)";
  tooltipEl.style.padding = "12px 14px";
};

export function AppsOverTimeCard({
  className = "",
  height,
}: {
  className?: string;
  height?: number | string;
}) {
  const [open, setOpen] = useState(false);

  const [range, setRange] = useState<RangeOptions>(90);

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

        const res = await api("/api/dashboard/stages-over-time", {
          method: "GET",
        });

        if (!alive) return;

        const data = res?.data;
        if (!data) throw new Error("Invalid stages-over-time response");

        const { stage_counts = {} } = data;

        setApplied(stage_counts.applied ?? []);
        setInterview(stage_counts.interview ?? []);
        setOffer(stage_counts.offer ?? []);
        setAccepted(stage_counts.accepted ?? []);

      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
      const el = document.getElementById("chartjs-apps-over-time-tooltip");
      if (el) el.remove();
    };
  }, []);

  // Filtered datasets based on selected range
  const filteredApplied = applyRange(applied, range);
  const filteredInterview = applyRange(interview, range);
  const filteredOffer = applyRange(offer, range);
  const filteredAccepted = applyRange(accepted, range);

  const labels = lastNDaysLabels(range);

  const colors = {
    applied: "#F59E0B",
    interview: "#22D3EE",
    offer: "#A78BFA",
    accepted: "#34D399",
  };
  const legendItems = [
    { label: "Applied", color: colors.applied },
    { label: "Interview", color: colors.interview },
    { label: "Offer", color: colors.offer },
    { label: "Accepted", color: colors.accepted },
  ];

  const data = {
    labels,
    datasets: [
      {
        label: "Applied",
        data: filteredApplied,
        borderColor: colors.applied,
        backgroundColor: colors.applied,
        tension: 0.4,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 6,
        borderWidth: 3,
      },
      {
        label: "Interview",
        data: filteredInterview,
        borderColor: colors.interview,
        backgroundColor: colors.interview,
        tension: 0.4,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 6,
        borderWidth: 3,
      },
      {
        label: "Offer",
        data: filteredOffer,
        borderColor: colors.offer,
        backgroundColor: colors.offer,
        tension: 0.4,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 6,
        borderWidth: 3,
      },
      {
        label: "Accepted",
        data: filteredAccepted,
        borderColor: colors.accepted,
        backgroundColor: colors.accepted,
        tension: 0.4,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 6,
        borderWidth: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
        external: externalTooltipHandler,
      }
    },
    scales: {
      x: {
        grid: {
          color: function(context: any): string {
            const index = context.index;
            const label = labels[index];
            if (!label) return "transparent";

            // If the range is small, keep the default subtle grid lines
            if (range <= 14) {
              return "rgba(255,255,255,0.09)";
            }

            // Parse month day
            const parts = label.split(" ");
            if (parts.length < 2) return "transparent";

            const dayNum = parseInt(parts[1], 10);

            // Prominent vertical line for the 1st of the month (reduced opacity)
            if (dayNum === 1) {
              return "rgba(255,255,255,0.12)";
            }

            // Less prominent vertical line for mid-month (15th, or 14th if February) (reduced opacity)
            const isMidMonth = dayNum === 15 || (dayNum === 14 && label.startsWith("Feb"));
            if (isMidMonth) {
              return "rgba(255,255,255,0.04)";
            }

            return "transparent";
          }
        },
        ticks: {
          autoSkip: false,
          maxRotation: 0,
          minRotation: 0,
          callback: function(_val: any, index: number): string {
            const label = labels[index];
            if (!label) return "";

            // If the range is small, show all labels normally
            if (range <= 14) {
              return label;
            }

            // Parse day out of "Month Day" format (e.g. "May 24" -> 24)
            const parts = label.split(" ");
            if (parts.length < 2) return label;

            const dayNum = parseInt(parts[1], 10);

            // Show label ONLY on the 1st of the month
            if (dayNum === 1) {
              return label;
            }

            return "";
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: {
          precision: 0,
        },
      },
    },
  };

  // Shared range selector component
  const RangeSelector = ({
    range,
    onChange,
  }: {
    range: RangeOptions;
    onChange: (value: RangeOptions) => void;
  }) => (
    <div className="flex gap-2 mb-4">
      {RANGES.map((r) => (
        <Button
          key={r}
          onClick={() => onChange(r)}
          isSelected={range === r ? true : false}
        >
          {r} days
        </Button>
      ))}
    </div>
  );

  return (
    <>
      <Card
        title="Stages Over Time"
        subtitle={`${range}-day trend`}
        infoDescription={chartDescText.stagesOverTime}
        className={`${className} cursor-pointer`}
        height={height ?? "18rem"}
        expandable
        onExpand={() => setOpen(true)}
      >
        <ChartHost>
          {loading && <ChartSkeleton variant="line" />}
          {error && <ChartError message={error} />}
          {!loading && !error && (
            <div className="flex h-full min-h-0 w-full flex-col">
              <div className="min-h-0 flex-1">
                <Line data={data} options={options} />
              </div>
              <ChartLegend items={legendItems} />
            </div>
          )}
        </ChartHost>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Stages Over Time"
        description={chartDescText.stagesOverTime}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0 1rem" }}>
          <div style={{ flexShrink: 0, paddingTop: "0.5rem" }}>
            <RangeSelector range={range} onChange={setRange} />
          </div>

          <div style={{ flex: 1, minHeight: 0, paddingBottom: "1rem" }}>
            <div className="flex h-full min-h-0 w-full flex-col">
              <div className="min-h-0 flex-1">
                <Line data={data} options={options} />
              </div>
              <ChartLegend items={legendItems} />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default AppsOverTimeCard;
