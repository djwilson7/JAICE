import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { Card, ChartHost } from "./Card";
import { Modal } from "./Modal";
import { makeDarkOptions, c, ca } from "./chartTheme";
import { applyChartDefaults } from "./chartSetup";

export function AvgTimeInStageCard({ className = "", height }: { className?: string; height?: number | string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => applyChartDefaults(), []);

  const labels = ["Applied → Interview", "Interview → Offer", "Offer → Accepted"];
  const days   = [11, 7, 4]; // example durations in days

  const data: ChartData<"bar"> = {
    labels,
    datasets: [{
      label: "Average Days",
      data: days,
      backgroundColor: ca("--color-dark-purple-rgb", 0.38),
      borderColor: c("--color-dark-purple-rgb"),
      borderWidth: 2,
      borderRadius: 8,
      barThickness: 18,
      hoverBackgroundColor: ca("--color-dark-purple-rgb", 0.56),
    }],
  };

  const options: ChartOptions<"bar"> = makeDarkOptions<"bar">({
    indexAxis: "y",
    scales: {
      x: {
        beginAtZero: true,
        suggestedMax: Math.max(...days) + 2,
        ticks: { color: "rgba(255,255,255,.85)" },
        grid: { color: "rgba(255,255,255,.12)" },
        border: { color: "rgba(255,255,255,.25)" },
      },
      y: {
        ticks: { color: "rgba(255,255,255,.95)" },
        grid: { display: false },
        border: { color: "rgba(255,255,255,.25)" },
      },
    },
  });

  return (
    <>
      <Card title="Avg Time in Stage" subtitle="Rolling 90-day avg" className={`${className} cursor-pointer`} height={height ?? "18rem"} expandable onExpand={() => setOpen(true)}>
        <ChartHost><Bar data={data} options={options} /></ChartHost>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Avg Time in Stage">
        <ChartHost><Bar data={data} options={options} /></ChartHost>
      </Modal>
    </>
  );
}

export default AvgTimeInStageCard;