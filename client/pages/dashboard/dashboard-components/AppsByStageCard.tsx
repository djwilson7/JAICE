import { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { Card, ChartHost } from "./Card";
import { Modal } from "./Modal";
import { applyChartDefaults } from "./chartSetup";
import { api } from "@/global-services/api";

export function AppsByStageCard({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState<string[]>([]);
  const [values, setValues] = useState<number[]>([]);

  useEffect(() => {
    applyChartDefaults();

    const fetchData = async () => {
      try {
        const res = await api("/api/dashboard/apps-by-stage");
        const data = res.data?.data;

        if (data) {
          setLabels(data.labels ?? []);
          setValues(data.values ?? []);
        }
      } catch (err) {
        console.error("Error fetching apps-by-stage", err);
        // optional: fall back to zeros
        setLabels(["Applied", "Interview", "Offer", "Accepted"]);
        setValues([0, 0, 0, 0]);
      }
    };

    fetchData();
  }, []);

  const data: ChartData<"doughnut"> = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: [
          "rgba(var(--color-light-purple-rgb), .60)",
          "rgba(var(--color-teal-rgb), .60)",
          "rgba(var(--color-dark-purple-rgb), .60)",
          "rgba(var(--color-blue-gray-rgb), .60)",
        ],
        borderColor: [
          "rgb(var(--color-light-purple-rgb))",
          "rgb(var(--color-teal-rgb))",
          "rgb(var(--color-dark-purple-rgb))",
          "rgb(var(--color-blue-gray-rgb))",
        ],
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
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
    elements: {
      arc: {
        borderJoinStyle: "round",
      },
    },
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
        <ChartHost>
          <Doughnut data={data} options={options} />
        </ChartHost>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Apps by Stage">
        <ChartHost>
          <Doughnut data={data} options={options} />
        </ChartHost>
      </Modal>
    </>
  );
}

export default AppsByStageCard;
