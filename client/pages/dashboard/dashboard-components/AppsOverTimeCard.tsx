import { useEffect, useState } from "react";
import { Card, ChartHost } from "./Card";
import { Line } from "react-chartjs-2";
import { applyChartDefaults, cssVar, rgba } from "./chartSetup";
import { Modal } from "./Modal";

export function AppsOverTimeCard({ className = "", height }: { className?: string; height?: number | string }) {
    const [open, setOpen] = useState(false);
    useEffect(() => applyChartDefaults(), []);

    const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    const colors = {
        applied: cssVar("--color-light-purple"),
        interview: cssVar("--color-teal"),
        offer: cssVar("--color-dark-purple"),
        accepted: cssVar("--color-blue-gray"),
    };

    const data = {
        labels,
        datasets: [
            { label: "Applied", data: [20, 18, 15, 14, 12, 11, 9, 8, 7, 6, 4, 3], borderColor: colors.applied, backgroundColor: rgba(cssVar("--color-blue-5-rgb"), 0.15), fill: false, tension: 0.35, pointRadius: 2 },
            { label: "Interview", data: [19, 17, 14, 12, 11, 10, 9, 8, 6, 5, 3, 2], borderColor: colors.interview, backgroundColor: rgba(cssVar("--color-blue-5-rgb"), 0.15), fill: false, tension: 0.35, pointRadius: 2 },
            { label: "Offer", data: [10, 9, 8, 7, 6, 6, 5, 4, 4, 3, 2, 1], borderColor: colors.offer, fill: false, tension: 0.35, pointRadius: 2 },
            { label: "Accepted", data: [6, 5, 5, 4, 4, 3, 3, 2, 2, 2, 1, 1], borderColor: colors.accepted, fill: false, tension: 0.35, pointRadius: 2 },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" as const } },
        scales: {
            x: { grid: { color: "rgba(255,255,255,0.09)" } },
            y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.09)" } },
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
                <ChartHost><Line data={data} options={options} /></ChartHost>
            </Card>

            {/* Overlay for expanded chart */}
            <Modal open={open} onClose={() => setOpen(false)} title="Stages Over Time">
                <Line data={data} options={options} />
            </Modal>
        </>
    );
}

export default AppsOverTimeCard;