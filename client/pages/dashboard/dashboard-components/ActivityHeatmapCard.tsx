/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Chart } from "react-chartjs-2";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";
import { Chart as ChartJS } from "chart.js";
import type { ChartOptions } from "chart.js";
import { Card, ChartHost } from "./Card";
import { Modal } from "./Modal";
import { applyChartDefaults } from "./chartSetup";
import { api } from "@/global-services/api";
import { chartDescText } from "./chartDescText";

// Register the matrix controller
ChartJS.register(MatrixController, MatrixElement);

type HeatmapData = {
  x: string; // date
  y: string; // day of week (0-6)
  v: number; // value (application count)
};

interface MatrixContext {
  chart: {
    chartArea?: {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    };
  };
  raw?: HeatmapData;
}

export function ActivityHeatmapCard({
  className = "",
  height,
}: {
  className?: string;
  height?: number | string;
}) {
  const [open, setOpen] = useState(false);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    applyChartDefaults();
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await api("/api/dashboard/activity-heatmap", {
          method: "GET",
        });

        if (!alive) return;

        const data = (res?.data ?? []) as HeatmapData[];
        setHeatmapData(data);
      } catch (err) {
        if (!alive) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load activity heatmap data."
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

  const maxValue = heatmapData.length
    ? Math.max(...heatmapData.map((d) => d.v))
    : 0;

  const chartData: any = {
    datasets: [
      {
        label: "Applications",
        data: heatmapData,
        backgroundColor(context: MatrixContext) {
          const value = context.raw?.v || 0;
          if (value === 0) return "rgba(255,255,255,0.05)";
          
          // Color scale from light to dark teal/cyan
          const intensity = Math.min(value / Math.max(maxValue, 1), 1);
          const r = Math.floor(34 + 177 * (1 - intensity));
          const g = Math.floor(211 + 44 * (1 - intensity));
          const b = Math.floor(238 + 17 * (1 - intensity));
          
          return `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.7})`;
        },
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        width(context: MatrixContext) {
          const a = context.chart.chartArea || { left: 0, right: 0 };
          return ((a.right || 0) - (a.left || 0)) / 13 - 2; // ~12 weeks + padding
        },
        height(context: MatrixContext) {
          const a = context.chart.chartArea || { top: 0, bottom: 0 };
          return ((a.bottom || 0) - (a.top || 0)) / 7 - 2; // 7 days
        },
      },
    ],
  };

  const options: ChartOptions<"matrix"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15,20,30,0.95)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "rgba(255,255,255,0.2)",
        borderWidth: 1,
        callbacks: {
          title: (items) => {
            const item = items[0];
            const raw = item.raw as HeatmapData;
            return raw.x || "";
          },
          label: (item) => {
            const raw = item.raw as HeatmapData;
            const count = raw.v || 0;
            return `${count} application${count !== 1 ? "s" : ""}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "category",
        position: "bottom",
        offset: true,
        ticks: {
          color: "rgba(255,255,255,0.85)",
          font: { size: 11 },
        },
        grid: {
            display: true,
            offset: true,
            color: "rgba(255,255,255,0.04)",
            lineWidth: 1,
            drawTicks: false            
         },
        border: { display: false },
      },
      y: {
        type: "category",
        offset: true,
        labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        ticks: {
          color: "rgba(255,255,255,0.85)",
          font: { size: 11 },
        },
        grid: { 
            display: true,
            offset: true,
            color: "rgba(255,255,255,0.08)",
            lineWidth: 1,
            drawTicks: false,
         },
        border: { display: false },
      },
    },
  };

  const content = () => {
    if (loading) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-slate-300">
          Loading activity data...
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

    if (!heatmapData.length) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-slate-300">
          No activity data available yet.
        </div>
      );
    }

    return <Chart type="matrix" data={chartData} options={options} />;
  };

  return (
    <>
      <Card
        title="Activity Heatmap"
        subtitle="12-week application pattern"
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
        title="Activity Heatmap"
        description={chartDescText.activityHeatmap}
      >
        <div style={{ height: "100%", padding: "0 1rem 1rem 1rem" }}>
          {content()}
        </div>
      </Modal>
    </>
  );
}

export default ActivityHeatmapCard;