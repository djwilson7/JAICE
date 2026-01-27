import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { Card, ChartHost } from "./Card";
import { Modal } from "./Modal";
import { makeDarkOptions } from "./chartTheme";
import { applyChartDefaults } from "./chartSetup";
import { api } from "@/global-services/api";
import { chartDescText } from "./chartDescText";

type CategoryDatum = {
    category: string;
    count: number;
};

export function AppsByCategoryCard({
    className = "",
    height,
}: {
    className?: string;
    height?: number | string;
}) {
    const [open, setOpen] = useState(false);

    // Dynamic chart values
    const [labels, setLabels] = useState<string[]>([]);
    const [values, setValues] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Chart.js defaults
    useEffect(() => {
        applyChartDefaults();
    }, []);

    // Fetch category data
    useEffect(() => {
        let alive = true;

        async function load() {
            try {
                setLoading(true);
                setError(null);

                const res = await api("/api/dashboard/apps-by-category", {
                    method: "GET",
                });

                if (!alive) return;

                const data = (res?.data ?? []) as CategoryDatum[];

                setLabels(data.map((d) => d.category));
                setValues(data.map((d) => d.count));
            } catch (err) {
                if (!alive) return;

                let message = "Failed to load category data";
                if (err instanceof Error) message = err.message;

                setError(message);
            } finally {
                if (alive) setLoading(false);
            }
        }

        load();
        return () => {
            alive = false;
        };
    }, []);

    const stagePalette = ["#F59E0B", "#22D3EE", "#A78BFA", "#34D399"];

    const colors = {
        // Per-bar colors cycling through the stage palette
        barFill: labels.map((_, i) => `${stagePalette[i % stagePalette.length]}88`),
        barBorder: labels.map((_, i) => stagePalette[i % stagePalette.length]),

        grid: "rgba(148,163,184,0.18)",
        ticks: "#E5E7EB",
        legend: "#F3F4F6",
        axis: "rgba(203,213,225,0.35)",
        tooltipBg: "rgba(17,24,39,0.95)",
    };

    const maxValue = values.length ? Math.max(...values) : 0;

    const data: ChartData<"bar"> = {
        labels,
        datasets: [
            {
                label: "Applications",
                data: values,
                backgroundColor: colors.barFill,
                borderColor: colors.barBorder,
                borderWidth: 3,
                borderRadius: 10,
                borderSkipped: false,
                barThickness: 22,
                hoverBackgroundColor: colors.barBorder,
                hoverBorderColor: colors.barBorder,
                hoverBorderWidth: 3,
            },
        ],
    };

    const options: ChartOptions<"bar"> = makeDarkOptions<"bar">({
        indexAxis: "y",
        plugins: {
            legend: {
                labels: { color: colors.legend, usePointStyle: true, boxWidth: 10 },
            },
            tooltip: {
                backgroundColor: colors.tooltipBg,
                titleColor: "#fff",
                bodyColor: "#fff",
                borderColor: "rgba(255,255,255,0.18)",
                borderWidth: 1,
            },
        },
        scales: {
            x: {
                beginAtZero: true,
                suggestedMax: maxValue + 2,
                ticks: { color: colors.ticks, font: { size: 12, weight: 500 } },
                grid: { color: colors.grid },
                border: { color: colors.axis },
            },
            y: {
                ticks: { color: colors.ticks, font: { size: 12, weight: 600 } },
                grid: { display: false },
                border: { color: colors.axis },
            },
        },
        responsive: true,
        maintainAspectRatio: false,
    });

    const content = () => {
        if (loading) {
            return (
                <div className="flex h-full items-center justify-center text-sm text-slate-300">
                    Loading category data...
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

        if (!values.length) {
            return (
                <div className="flex h-full items-center justify-center text-sm text-slate-300">
                    No applications categorized yet.
                </div>
            );
        }

        return <Bar data={data} options={options} />;
    };

    return (
        <>
            <Card
                title="Applications by Category"
                subtitle="Top categories this year"
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
                title="Apps by Category"
                description={chartDescText.applicationsByCategory}
            >
                <div style={{ height: "100%", padding: "0 1rem 1rem 1rem" }}>
                    {content()}
                </div>
            </Modal>
        </>
    );
}

export default AppsByCategoryCard;