import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { Card, ChartHost } from "./Card";
import { Modal } from "./Modal";
import { makeDarkOptions } from "./chartTheme";
import { applyChartDefaults } from "./chartSetup";
import { api } from "@/global-services/api";

type StageArrays = {
  applied: number[];
  interview: number[];
  offer: number[];
  accepted: number[];
};

const ALL_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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

        // ✅ mirror AppsOverTimeCard: same endpoint + shape
        const res = await api("/api/dashboard/apps-over-time/", {
          method: "GET",
        });

        if (!alive) return;

        const raw = (res?.data ?? {}) as Partial<StageArrays>;

        const appliedArr = raw.applied ?? new Array(ALL_MONTHS.length).fill(0);
        const interviewArr =
          raw.interview ?? new Array(ALL_MONTHS.length).fill(0);
        const offerArr = raw.offer ?? new Array(ALL_MONTHS.length).fill(0);
        const acceptedArr =
          raw.accepted ?? new Array(ALL_MONTHS.length).fill(0);

        // Build an ordered list of months with their stage counts
        const monthRows = ALL_MONTHS.map((label, i) => {
          const a = appliedArr[i] ?? 0;
          const iv = interviewArr[i] ?? 0;
          const o = offerArr[i] ?? 0;
          const ac = acceptedArr[i] ?? 0;

          return {
            label,
            applied: a,
            interview: iv,
            offer: o,
            accepted: ac,
            total: a + iv + o + ac,
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

  // Same palette as AppsOverTime
  const colors = {
    applied: "#F59E0B",
    interview: "#22D3EE",
    offer: "#A78BFA",
    accepted: "#34D399",
  };

  const common = { borderWidth: 2, borderRadius: 6, barThickness: 16 };

  const data: ChartData<"bar"> = {
    labels,
    datasets: [
      {
        label: "Applied",
        data: applied,
        backgroundColor: `${colors.applied}66`, // light fill
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

  const options: ChartOptions<"bar"> = makeDarkOptions<"bar">({
    plugins: {
      legend: {
        labels: {
          color: "rgba(255,255,255,.9)",
          usePointStyle: true,
          boxWidth: 10,
        },
      },
    },
    scales: {
      x: {
        stacked: false,
        ticks: { color: "rgba(255,255,255,.9)" },
        grid: { color: "rgba(255,255,255,.12)" },
        border: { color: "rgba(255,255,255,.25)" },
      },
      y: {
        stacked: false,
        beginAtZero: true,
        ticks: { color: "rgba(255,255,255,.9)" },
        grid: { color: "rgba(255,255,255,.12)" },
        border: { color: "rgba(255,255,255,.25)" },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
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
