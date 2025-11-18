import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { Card, ChartHost } from "./Card";
import { Modal } from "./Modal";
import { makeDarkOptions, c, ca } from "./chartTheme";
import { applyChartDefaults } from "./chartSetup";

export function SplitByStageCard({ className = "", height }: { className?: string; height?: number | string }) {
    const [open, setOpen] = useState(false);
    useEffect(() => applyChartDefaults(), []);

    const labels = ["Sep", "Oct", "Nov", "Dec"];
    const applied = [8, 6, 4, 3];
    const interview = [5, 4, 3, 2];
    const offer = [2, 1, 1, 1];
    const accepted = [1, 1, 1, 0];

    const common = { borderWidth: 2, borderRadius: 6, barThickness: 16 };

    const data: ChartData<"bar"> = {
        labels,
        datasets: [
            { label: "Applied", data: applied, backgroundColor: ca("--color-light-purple-rgb", 0.45), borderColor: c("--color-light-purple-rgb"), ...common },
            { label: "Interview", data: interview, backgroundColor: ca("--color-teal-rgb", 0.45), borderColor: c("--color-teal-rgb"), ...common },
            { label: "Offer", data: offer, backgroundColor: ca("--color-dark-purple-rgb", 0.45), borderColor: c("--color-dark-purple-rgb"), ...common },
            { label: "Accepted", data: accepted, backgroundColor: ca("--color-blue-gray-rgb", 0.45), borderColor: c("--color-blue-gray-rgb"), ...common },
        ],
    };

    const options: ChartOptions<"bar"> = makeDarkOptions<"bar">({
        scales: {
            x: {
                stacked: true,
                ticks: { color: "rgba(255,255,255,.9)" },
                grid: { color: "rgba(255,255,255,.12)" },
                border: { color: "rgba(255,255,255,.25)" },
            },
            y: {
                stacked: true,
                beginAtZero: true,
                ticks: { color: "rgba(255,255,255,.9)" },
                grid: { color: "rgba(255,255,255,.12)" },
                border: { color: "rgba(255,255,255,.25)" },
            },
        },
    });

    return (
        <>
            <Card title="Split by Stage" subtitle="Monthly counts" className={`${className} cursor-pointer`} height={height ?? "18rem"} expandable onExpand={() => setOpen(true)}>
                <ChartHost><Bar data={data} options={options} /></ChartHost>
            </Card>

            <Modal open={open} onClose={() => setOpen(false)} title="Split by Stage">
                <ChartHost><Bar data={data} options={options} /></ChartHost>
            </Modal>
        </>
    );
}

export default SplitByStageCard;