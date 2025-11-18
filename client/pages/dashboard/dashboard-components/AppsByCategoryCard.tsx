import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { Card, ChartHost } from "./Card";
import { Modal } from "./Modal";
import { makeDarkOptions, c, ca } from "./chartTheme";
import { applyChartDefaults } from "./chartSetup";

export function AppsByCategoryCard({ className = "", height }: { className?: string; height?: number | string }) {
    const [open, setOpen] = useState(false);
    useEffect(() => applyChartDefaults(), []);

    const labels = ["Engineering", "Design", "Data", "Operations", "Other"];
    const values = [14, 9, 7, 5, 3];

    const data: ChartData<"bar"> = {
        labels,
        datasets: [{
            label: "Applications",
            data: values,
            backgroundColor: ca("--color-teal-rgb", 0.42),
            borderColor: c("--color-teal-rgb"),
            borderWidth: 2,
            borderRadius: 8,
            barThickness: 18,
            hoverBackgroundColor: ca("--color-teal-rgb", 0.6),
        }],
    };

    const options: ChartOptions<"bar"> = makeDarkOptions<"bar">({
        indexAxis: "y",
        scales: {
            x: {
                beginAtZero: true,
                suggestedMax: Math.max(...values) + 2,
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
            <Card title="Apps by Category" subtitle="Top categories this year" className={`${className} cursor-pointer`} height={height ?? "18rem"} expandable onExpand={() => setOpen(true)}>
                <ChartHost><Bar data={data} options={options} /></ChartHost>
            </Card>

            <Modal open={open} onClose={() => setOpen(false)} title="Apps by Category">
                <ChartHost><Bar data={data} options={options} /></ChartHost>
            </Modal>
        </>
    );
}

export default AppsByCategoryCard;
