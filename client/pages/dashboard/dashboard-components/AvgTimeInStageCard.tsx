import { useEffect, useState } from "react";
import { Card, ChartError, ChartHost, ChartSkeleton } from "./Card";
import { applyChartDefaults } from "./chartSetup";
import { api } from "@/global-services/api";
import { chartDescText } from "./chartDescText";

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

  const stageColors = {
    applied: "#F59E0B",
    interview: "#22D3EE",
    offer: "#A78BFA",
    accepted: "#34D399",
  };

  const renderSquares = () => {
    if (loading) {
      return <ChartSkeleton variant="tiles" />;
    }

    if (error) {
      return <ChartError message={error} />;
    }

    if (!values) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-slate-300">
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
      <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-2">
        {tiles.map((tile) => {
          const timeParts = parseHumanizedTime(tile.value);

          const renderDisplayValue = () => {
            if (typeof timeParts === "string") {
              return (
                <span 
                  className="text-white font-medium"
                  style={{ fontSize: "clamp(1rem, 2vw, 1.5rem)" }}
                >
                  {timeParts}
                </span>
              );
            }

            const macroParts = timeParts.filter(
              (p) =>
                p.unit === "yr" ||
                p.unit === "year" ||
                p.unit === "years" ||
                p.unit === "mo" ||
                p.unit === "month" ||
                p.unit === "months"
            );
            const microParts = timeParts.filter(
              (p) =>
                p.unit === "d" ||
                p.unit === "day" ||
                p.unit === "days" ||
                p.unit === "h" ||
                p.unit === "hour" ||
                p.unit === "hours"
            );

            const renderPart = (part: TimePart, idx: number) => (
              <span key={idx} className="inline-flex items-baseline gap-0.5">
                <span
                  className="text-white font-medium"
                  style={{ fontSize: "clamp(1rem, 2vw, 1.5rem)", letterSpacing: "-0.5px" }}
                >
                  {part.value}
                </span>
                <span
                  className="text-slate-400 font-normal opacity-60 lowercase"
                  style={{ fontSize: "clamp(0.7rem, 1.2vw, 0.9rem)" }}
                >
                  {part.unit}
                </span>
              </span>
            );

            const hasMacro = macroParts.length > 0;
            const hasMicro = microParts.length > 0;

            if (hasMacro && hasMicro) {
              return (
                <span className="flex flex-col items-center gap-1">
                  <span className="inline-flex items-baseline gap-2">
                    {macroParts.map(renderPart)}
                  </span>
                  <span className="inline-flex items-baseline gap-2">
                    {microParts.map(renderPart)}
                  </span>
                </span>
              );
            }

            return (
              <span className="inline-flex items-baseline gap-2">
                {timeParts.map(renderPart)}
              </span>
            );
          };

          return (
            <div
              key={tile.key}
              className="flex flex-col rounded-2xl border border-white/10 bg-slate-900/50 shadow-lg shadow-black/30 px-4 py-4 h-full"
            >
              <div
                className="flex flex-shrink-0 items-center gap-2 text-[7px] font-medium leading-none text-[rgba(255,255,255,0.62)]"
                style={{ letterSpacing: "1.4px" }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: tile.color }}
                />
                <span>
                  {tile.label}
                </span>
              </div>

              {/* BIG centered number in card */}
              <div
                className="flex-1 flex items-center justify-center text-center"
                style={{ marginTop: "0.5rem" }}
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
