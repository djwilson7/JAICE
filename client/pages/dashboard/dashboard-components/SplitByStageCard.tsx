import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { Card, ChartHost } from "./Card";
import { Modal } from "./Modal";
import { makeDarkOptions, c, ca } from "./chartTheme";
import { applyChartDefaults } from "./chartSetup";
import { api } from "@/global-services/api";

type StageBuckets = {
  Applied: number;
  Interview: number;
  Offer: number;
  Accepted: number;
};

const ALL_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function SplitByStageCard({
  className = "",
  height,
}: {
  className?: string;
  height?: number | string;
}) {
  const [open, setOpen] = useState(false);

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

        const res = await api("/api/dashboard/apps-over-time", {
          method: "GET",
        });

        if (!alive) return;

        const raw = (res.data?.data ?? {}) as Record<string, Partial<StageBuckets>>;

        // Build an ordered list of months with their stage counts
        const monthRows = ALL_MONTHS.map((m) => {
          const bucket = raw[m] ?? {};
          const applied = bucket.Applied ?? 0;
          const interview = bucket.Interview ?? 0;
          const offer = bucket.Offer ?? 0;
          const accepted = bucket.Accepted ?? 0;

          return {
            label: m,
            applied,
            interview,
            offer,
            accepted,
            total: applied + interview + offer + accepted,
          };
        });

        // Prefer the last 4 months that actually have applications; fall back to calendar last 4.
        const nonZero = monthRows.filter((r) => r.total > 0);
        const sliceSource =
          nonZero.length >= 4 ? nonZero.slice(-4) : monthRows.slice(-4);

        setLabels(sliceSource.map((r) => r.label));
        setApplied(sliceSource.map((r) => r.applied));
        setInterview(sliceSource.map((r) => r.interview));
        setOffer(sliceSource.map((r) => r.offer));
        setAccepted(sliceSource.map((r) => r.accepted));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load stage split data",
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

  const common = { borderWidth: 2, borderRadius: 6, barThickness: 16 };

  const data: ChartData<"bar"> = {
    labels,
    datasets: [
      {
        label: "Applied",
        data: applied,
        backgroundColor: ca("--color-light-purple-rgb", 0.45),
        borderColor: c("--color-light-purple-rgb"),
        ...common,
      },
      {
        label: "Interview",
        data: interview,
        backgroundColor: ca("--color-teal-rgb", 0.45),
        borderColor: c("--color-teal-rgb"),
        ...common,
      },
      {
        label: "Offer",
        data: offer,
        backgroundColor: ca("--color-dark-purple-rgb", 0.45),
        borderColor: c("--color-dark-purple-rgb"),
        ...common,
      },
      {
        label: "Accepted",
        data: accepted,
        backgroundColor: ca("--color-blue-gray-rgb", 0.45),
        borderColor: c("--color-blue-gray-rgb"),
        ...common,
      },
    ],
  };

  const options: ChartOptions<"bar"> = makeDarkOptions<"bar">({
    scales: {
      x: {
        stacked: true,
        ticks: { color: "rgba(255,255,255,.9)" },
        grid: { color: "rgba(255,255,255,.12)" },
        border: { color: "rgba(255,255,255,.25)" },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: { color: "rgba(255,255,255,.9)" },
        grid: { color: "rgba(255,255,255,.12)" },
        border: { color: "rgba(255,255,255,.25)" },
      },
    },
  });

  const content = () => {
    if (loading) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-slate-300">
          Loading stage split…
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-red-400">
          API request failed: {error}
        </div>
      );
    }

    if (!labels.length) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-slate-300">
          No applications to display yet.
        </div>
      );
    }

    return <Bar data={data} options={options} />;
  };

  return (
    <>
      <Card
        title="Split by Stage"
        subtitle="Monthly counts"
        className={`${className} cursor-pointer`}
        height={height ?? "18rem"}
        expandable
        onExpand={() => setOpen(true)}
      >
        <ChartHost>{content()}</ChartHost>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Split by Stage">
        <ChartHost>{content()}</ChartHost>
      </Modal>
    </>
  );
}

export default SplitByStageCard;
