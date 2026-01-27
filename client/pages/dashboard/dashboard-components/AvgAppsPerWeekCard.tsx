import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { Card, ChartHost } from "./Card";
import { Modal } from "./Modal";
import { applyChartDefaults } from "./chartSetup";
import { api } from "@/global-services/api";
import { chartDescText } from "./chartDescText";

export function AvgAppsPerWeekCard({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState<string[]>([]);
  const [values, setValues] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applyChartDefaults();

    async function fetchData() {
      try {
        const res = await api("/api/dashboard/avg-apps-per-week");
        const data = res.data ?? res;

        setLabels(data.labels ?? []);
        setValues(data.values ?? []);
      } catch (err) {
        console.error("Error fetching avg apps per week", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <Card title="Avg Applications per Week" subtitle="10-week trend">
        <ChartHost>
          <div className="flex h-full items-center justify-center text-slate-300">
            Loading…
          </div>
        </ChartHost>
      </Card>
    );
  }

  const maxValue = Math.max(...values, 5);

  const data: ChartData<"line"> = {
    labels,
    datasets: [
      {
        label: "Avg Apps / Week",
        data: values,
        borderColor: "#F59E0B",
        backgroundColor: "rgba(245,158,11,0.18)",
        borderWidth: 3,
        pointRadius: 3,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: "start",
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { color: "#fff" } },
      tooltip: {
        backgroundColor: "rgba(15,20,30,.95)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "rgba(255,255,255,.2)",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,.12)" },
        ticks: { color: "rgba(255,255,255,.85)" },
      },
      y: {
        beginAtZero: true,
        suggestedMax: maxValue + 1,
        grid: { color: "rgba(255,255,255,.12)" },
        ticks: { color: "rgba(255,255,255,.85)" },
      },
    },
  };

  return (
    <>
      <Card
        title="Avg Applications per Week"
        subtitle="10-week trend"
        className={`${className} cursor-pointer`}
        expandable
        onExpand={() => setOpen(true)}
      >
        <ChartHost>
          <Line data={data} options={options} />
        </ChartHost>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Avg Apps per Week"
        description={chartDescText.avgAppsPerWeek}
      >
        <div style={{ height: "100%", padding: "0 1rem 1rem 1rem" }}>
          <Line data={data} options={options} />
        </div>
      </Modal>
    </>
  );
}

export default AvgAppsPerWeekCard;