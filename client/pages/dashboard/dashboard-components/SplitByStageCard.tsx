import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { Card, ChartHost } from "./Card";
import { Modal } from "./Modal";
import { makeDarkOptions } from "./chartTheme";
import { applyChartDefaults } from "./chartSetup";
import { api } from "@/global-services/api";
import { chartDescText } from "./chartDescText";

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

        const res = await api("/api/dashboard/split-by-stage-monthly/", {
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

  const options: ChartOptions<"bar"> = makeDarkOptions<"bar">({
    plugins: {
      legend: {
        labels: {
          color: "rgba(255,255,255,.9)",
          usePointStyle: true,
          boxWidth: 10,
        },
      },
      tooltip: {
        backgroundColor: "rgba(15,20,30,0.95)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "rgba(255,255,255,0.2)",
        borderWidth: 1,
      }
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Split by Stage"
        description={chartDescText.splitByStage}
      >
        <div style={{ height: "100%", padding: "0 1rem 1rem 1rem" }}>
          {content()}
        </div>
      </Modal>
    </>
  );
}

export default SplitByStageCard;