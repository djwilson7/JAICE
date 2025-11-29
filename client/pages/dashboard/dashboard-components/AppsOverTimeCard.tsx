import { useEffect, useState } from "react";
import { Card, ChartHost } from "./Card";
import { Line } from "react-chartjs-2";
import { applyChartDefaults } from "./chartSetup";
import { Modal } from "./Modal";
import { api } from "@/global-services/api";

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

        const res = await api("/api/dashboard/apps-over-time/", {
          method: "GET",
        });

        if (!alive) return;

        const d = res?.data ?? {};

        setApplied(d.applied ?? []);
        setInterview(d.interview ?? []);
        setOffer(d.offer ?? []);
        setAccepted(d.accepted ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data",);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
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

  const data = {
    labels,
    datasets: [
      {
        label: "Applied",
        data: filteredApplied,
        borderColor: colors.applied,
        tension: 0.35,
        fill: false,
        pointRadius: 2,
      },
      {
        label: "Interview",
        data: filteredInterview,
        borderColor: colors.interview,
        tension: 0.35,
        fill: false,
        pointRadius: 2,
      },
      {
        label: "Offer",
        data: filteredOffer,
        borderColor: colors.offer,
        tension: 0.35,
        fill: false,
        pointRadius: 2,
      },
      {
        label: "Accepted",
        data: filteredAccepted,
        borderColor: colors.accepted,
        tension: 0.35,
        fill: false,
        pointRadius: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" as const } },
    scales: {
      x: { grid: { color: "rgba(255,255,255,0.09)" } },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(255,255,255,0.09)" },
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
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`px-3 py-1 rounded-lg text-sm transition
            ${range === r
              ? "bg-slate-700 text-white"
              : "bg-slate-800 text-slate-300"
            }`}
        >
          {r} days
        </button>
      ))}
    </div>
  );

  return (
    <>
      <Card
        title="Stages Over Time"
        subtitle={`${range}-day trend`}
        className={`${className} cursor-pointer`}
        height={height ?? "18rem"}
        expandable
        onExpand={() => setOpen(true)}
      >
        <ChartHost>
          {loading && <div className="text-slate-300">Loading...</div>}
          {error && <div className="text-red-400">{error}</div>}
          {!loading && !error && <Line data={data} options={options} />}
        </ChartHost>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Stages Over Time">
        <div className="px-4 pt-2">
          <RangeSelector range={range} onChange={setRange} />
        </div>

        <div className="h-[60vh] px-4 pb-4">
          <Line data={data} options={options} />
        </div>
      </Modal>
    </>
  );
}

export default AppsOverTimeCard;
