import { useEffect, useState } from "react";
import { Card, ChartError, ChartHost, ChartSkeleton } from "./Card";
import { applyChartDefaults } from "./chartSetup";
import { api } from "@/global-services/api";
import { chartDescText } from "./chartDescText";
import { useSettings } from "@/pages/settings/provider/settingsContext";
import { getDashboardChartTheme } from "./chartTheme";

type AvgStageAges = {
  applied: number;
  interview: number;
  offer: number;
  accepted: number;
};

type TimePart = {
  value: number;
  unit: string;
};

function parseHumanizedTime(raw: number | null | undefined): TimePart[] | string {
  if (raw === null || raw === undefined || Number.isNaN(raw)) {
    return "—";
  }

  const totalHours = Math.ceil(raw * 24);
  if (totalHours <= 0) {
    return [{ value: 0, unit: "hours" }];
  }

  let hoursLeft = totalHours;

  const years = Math.floor(hoursLeft / (365 * 24));
  hoursLeft %= (365 * 24);

  const months = Math.floor(hoursLeft / (30 * 24));
  hoursLeft %= (30 * 24);

  const days = Math.floor(hoursLeft / 24);
  const hours = hoursLeft % 24;

  const parts: TimePart[] = [];
  if (years > 0) parts.push({ value: years, unit: years === 1 ? "year" : "years" });
  if (months > 0) parts.push({ value: months, unit: months === 1 ? "month" : "months" });
  if (days > 0) parts.push({ value: days, unit: days === 1 ? "day" : "days" });
  if (hours > 0) parts.push({ value: hours, unit: hours === 1 ? "hour" : "hours" });

  return parts.length > 0 ? parts : [{ value: 0, unit: "hours" }];
}

export function AvgTimeInStageCard({
  className = "",
  height,
}: {
  className?: string;
  height?: number | string;
}) {
  const { theme } = useSettings();
  const chartTheme = getDashboardChartTheme(theme);
  const [values, setValues] = useState<AvgStageAges | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    applyChartDefaults();
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await api("/api/dashboard/avg-time-in-stage", {
          method: "GET",
        });

        if (!alive) return;

        const d = res?.data ?? {};

        setValues({
          applied: d.applied ?? 0,
          interview: d.interview ?? 0,
          offer: d.offer ?? 0,
          accepted: d.accepted ?? 0,
        });
      } catch (err) {
        if (!alive) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load average time in stage.",
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const stageColors = chartTheme.stageColors;

  const renderSquares = () => {
    if (loading) {
      return <ChartSkeleton variant="tiles" />;
    }

    if (error) {
      return <ChartError message={error} />;
    }

    if (!values) {
      return (
        <div className={`flex h-full items-center justify-center text-sm ${chartTheme.emptyText}`}>
          No applications in the last 90 days.
        </div>
      );
    }

    const tiles = [
      {
        key: "applied" as const,
        label: "Applied",
        value: values.applied,
        color: stageColors.applied,
      },
      {
        key: "interview" as const,
        label: "Interview",
        value: values.interview,
        color: stageColors.interview,
      },
      {
        key: "offer" as const,
        label: "Offer",
        value: values.offer,
        color: stageColors.offer,
      },
      {
        key: "accepted" as const,
        label: "Accepted",
        value: values.accepted,
        color: stageColors.accepted,
      },
    ];

    return (
      <div className="flex h-full w-full flex-col justify-evenly gap-3">
        {tiles.map((tile) => {
          const timeParts = parseHumanizedTime(tile.value);

          const renderDisplayValue = () => {
            if (typeof timeParts === "string") {
              return (
                <span 
                  className={`${chartTheme.tile.value} font-medium`}
                  style={{ fontSize: "clamp(0.88rem, 1.35vw, 1.15rem)" }}
                >
                  {timeParts}
                </span>
              );
            }

            const renderPart = (part: TimePart, idx: number) => (
              <span key={idx} className="inline-flex items-baseline gap-0.5">
                <span
                  className={`${chartTheme.tile.value} font-medium`}
                  style={{ fontSize: "clamp(0.88rem, 1.35vw, 1.15rem)", letterSpacing: "-0.25px" }}
                >
                  {part.value}
                </span>
                <span
                  className={`${chartTheme.tile.unit} font-normal opacity-70 lowercase`}
                  style={{ fontSize: "clamp(0.58rem, 0.85vw, 0.72rem)" }}
                >
                  {part.unit}
                </span>
              </span>
            );

            return (
              <span className="inline-flex items-baseline justify-end gap-x-2 whitespace-nowrap text-right">
                {timeParts.map(renderPart)}
              </span>
            );
          };

          return (
            <div
              key={tile.key}
              className={`flex min-h-[3.25rem] items-center justify-between gap-4 rounded-2xl border ${chartTheme.tile.border} ${
                chartTheme.isLight ? "bg-white/45" : "bg-white/[0.045]"
              } px-4 py-3`}
            >
              <div
                className={`flex min-w-0 flex-1 items-center gap-2 text-[7px] font-medium leading-none ${chartTheme.tile.label}`}
                style={{ letterSpacing: "1.4px" }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: tile.color }}
                />
                <span className="truncate">
                  {tile.label}
                </span>
              </div>

              <div
                className="shrink-0 text-right"
              >
                {renderDisplayValue()}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card
      title="Avg Time in Stage"
      subtitle="Rolling 90-day averages"
      infoDescription={chartDescText.avgTimeInStage}
      className={className}
      height={height ?? "18rem"}
    >
      <ChartHost>{renderSquares()}</ChartHost>
    </Card>
  );
}

export default AvgTimeInStageCard;
