import { useEffect, useState } from "react";
import { Card, ChartHost } from "./Card";
import { Modal } from "./Modal";
import { applyChartDefaults } from "./chartSetup";
import { api } from "@/global-services/api";

type AvgStageAges = {
  applied: number;
  interview: number;
  offer: number;
  accepted: number;
};

export function AvgTimeInStageCard({
  className = "",
  height,
}: {
  className?: string;
  height?: number | string;
}) {
  const [open, setOpen] = useState(false);

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

        console.log("avg-time-in-stage response", d); // TEMP

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

  const renderSquares = (variant: "card" | "modal" = "card") => {
    const isModal = variant === "modal";

    if (loading) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-slate-300">
          Calculating averages…
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-red-400">
          {error}
        </div>
      );
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
        label: "APPLIED",
        value: values.applied,
        color: stageColors.applied,
      },
      {
        key: "interview" as const,
        label: "INTERVIEW",
        value: values.interview,
        color: stageColors.interview,
      },
      {
        key: "offer" as const,
        label: "OFFER",
        value: values.offer,
        color: stageColors.offer,
      },
      {
        key: "accepted" as const,
        label: "ACCEPTED",
        value: values.accepted,
        color: stageColors.accepted,
      },
    ];

    return (
      <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-2">
        {tiles.map((tile) => {
          const raw = tile.value;
          const isMissing =
            raw === null || raw === undefined || Number.isNaN(raw as number);

          let display: string;

          if (isMissing) {
            display = "—";
          } else if ((raw as number) < 1) {
            const hours = (raw as number) * 24;
            display = `${hours.toFixed(2)} hrs`;
          } else {
            display = `${(raw as number).toFixed(2)} days`;
          }

          return (
            <div
              key={tile.key}
              className={`flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/50 shadow-lg shadow-black/30 ${
                isModal ? "px-6 py-5" : "px-4 py-3"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  {tile.label}
                </span>
                <span
                  className="h-2 w-8 rounded-full"
                  style={{ backgroundColor: tile.color }}
                />
              </div>

              {/* BIG number in modal, smaller in card */}
              <div
                className="mt-4 font-semibold text-white"
                style={
                  isModal
                    ? {
                        fontSize: "5.25rem", // ~text-5xl+
                        lineHeight: 1.05,
                      }
                    : {
                        fontSize: "1.0rem", // ~text-2xl
                        lineHeight: 1.2,
                      }
                }
              >
                {display}
              </div>

              <div
                className={`mt-2 text-slate-400 ${
                  isModal ? "text-xs sm:text-sm" : "text-[11px]"
                }`}
              >
                Avg time currently sitting in this stage
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Card
        title="Avg Time in Stage"
        subtitle="Rolling 90-day averages"
        className={`${className} cursor-pointer`}
        height={height ?? "18rem"}
        expandable
        onExpand={() => setOpen(true)}
      >
        <ChartHost>{renderSquares("card")}</ChartHost>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Avg Time in Stage">
        <ChartHost>{renderSquares("modal")}</ChartHost>
      </Modal>
    </>
  );
}

export default AvgTimeInStageCard;
