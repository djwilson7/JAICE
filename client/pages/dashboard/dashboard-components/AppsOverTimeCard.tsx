import { useEffect, useState } from "react";
import { Card, ChartHost } from "./Card";
import { Line } from "react-chartjs-2";
import { applyChartDefaults } from "./chartSetup";
import { Modal } from "./Modal";
import { api } from "@/global-services/api";

const MONTH_LABELS = [
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

export function AppsOverTimeCard({

  className = "",
  height,
}: {
  className?: string;
  height?: number | string;
}) {
  const [open, setOpen] = useState(false);

  const [applied, setApplied] = useState<number[]>([]);
  const [interview, setInterview] = useState<number[]>([]);
  const [offer, setOffer] = useState<number[]>([]);
  const [accepted, setAccepted] = useState<number[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("STATE VALUES", {
      applied,
      interview,
      offer,
      accepted,
    });
  }, [applied, interview, offer, accepted]);


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

        console.log("apps-over-time response", d); // TEMP: verify values

        // d.applied etc. are already full arrays from the backend
        setApplied(d.applied ?? new Array(MONTH_LABELS.length).fill(0));
        setInterview(d.interview ?? new Array(MONTH_LABELS.length).fill(0));
        setOffer(d.offer ?? new Array(MONTH_LABELS.length).fill(0));
        setAccepted(d.accepted ?? new Array(MONTH_LABELS.length).fill(0));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load data",
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

  const colors = {
    applied: "#F59E0B",
    interview: "#22D3EE",
    offer: "#A78BFA",
    accepted: "#34D399",
  };

  const labels = MONTH_LABELS;

  const data = {
    labels,
    datasets: [
      {
        label: "Applied",
        data: applied,
        borderColor: colors.applied,
        tension: 0.35,
        fill: false,
        pointRadius: 2,
      },
      {
        label: "Interview",
        data: interview,
        borderColor: colors.interview,
        tension: 0.35,
        fill: false,
        pointRadius: 2,
      },
      {
        label: "Offer",
        data: offer,
        borderColor: colors.offer,
        tension: 0.35,
        fill: false,
        pointRadius: 2,
      },
      {
        label: "Accepted",
        data: accepted,
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
        // make sure you are NOT forcing max: 1 anywhere
      },
    },
  };

  return (
    <>
      <Card
        title="Stages Over Time"
        subtitle="90-day trend"
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
        <Line data={data} options={options} />
      </Modal>
    </>
  );
}

export default AppsOverTimeCard;
