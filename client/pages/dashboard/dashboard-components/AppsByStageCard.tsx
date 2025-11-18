import { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { Card, ChartHost } from "./Card";
import { Modal } from "./Modal";
import { applyChartDefaults } from "./chartSetup";
import { api } from "@/global-services/api";

const STAGE_COLORS: Record<string, string> = {
  Applied: "#F59E0B",
  Interview: "#22D3EE",
  Offer: "#A78BFA",
  Accepted: "#34D399",
};

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

        setLabels(payload.labels ?? []);
        setValues(payload.values ?? []);
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
    };
  }, []);

  const palette = labels.map(
    (label) => STAGE_COLORS[label] ?? "#64748B", // fallback
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
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15,20,30,.95)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "rgba(255,255,255,.2)",
        borderWidth: 1,
      },
    },
    cutout: "60%",
  };

  const renderContent = (variant: "card" | "modal" = "card") => {
    const isModal = variant === "modal";

    if (loading) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-slate-300">
          Loading stage distribution…
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
              : "relative h-32 w-32 md:h-40 md:w-40"
          }
        >
          <Doughnut data={chartData} options={options} />
        </div>

        {/* Custom legend */}
        <div
          className={`flex flex-wrap items-center justify-center gap-6 ${
            isModal ? "text-sm" : "text-xs"
          } text-slate-100`}
        >
          {labels.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="h-2 w-5 rounded-full"
                style={{ backgroundColor: palette[i] }}
              />
              <span className="text-[11px] uppercase tracking-wide text-slate-200">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card
        title="Applications by Stage"
        subtitle="Total distribution"
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
      >
        <ChartHost>{renderContent("modal")}</ChartHost>
      </Modal>
    </>
  );
}

export default AppsByStageCard;
