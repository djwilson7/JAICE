import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { Card, ChartHost } from "./Card";
import { Modal } from "./Modal";
import { applyChartDefaults } from "./chartSetup";

export function AvgAppsPerWeekCard({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => applyChartDefaults(), []);

  const labels = ["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10"];
  const values = [3,4,5,6,5,7,6,8,7,6];

  const data: ChartData<"line"> = {
    labels,
    datasets: [{
      label: "Avg Apps / Week",
      data: values,
      borderColor: "rgb(var(--color-teal-rgb))",
      backgroundColor: "rgba(var(--color-teal-rgb), .18)",
      borderWidth: 3,
      pointRadius: 2,
      pointHoverRadius: 5,
      pointHitRadius: 8,
      tension: 0.35,
      fill: "start",
    }],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: false },
    plugins: {
      legend: { position: "bottom", labels: { color: "rgba(255,255,255,.9)" } },
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
        ticks: { color: "rgba(255,255,255,.8)" },
      },
      y: {
        beginAtZero: true,
        suggestedMax: Math.max(...values) + 2,
        grid: { color: "rgba(255,255,255,.12)" },
        ticks: { color: "rgba(255,255,255,.8)" },
        border: { color: "rgba(255,255,255,.25)" },
      },
    },
  };

  return (
    <>
      <Card
        title="Avg Apps per Week"
        subtitle="10-week trend"
        className={`${className} cursor-pointer`}
        expandable
        onExpand={() => setOpen(true)}
      >
        <ChartHost><Line data={data} options={options} /></ChartHost>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Avg Apps per Week">
        <ChartHost><Line data={data} options={options} /></ChartHost>
      </Modal>
    </>
  );
}

export default AvgAppsPerWeekCard;