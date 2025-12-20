import { useCallback, useMemo, useState } from "react";
import type { JobCardType } from "@/types/jobCardType";

export function useKanbanColumns(jobs: JobCardType[]) {
  const [acceptedRejected, setAcceptedRejected] = useState<
    "accepted" | "rejected"
  >("accepted");

  const toggleAcceptedRejected = useCallback(() => {
    setAcceptedRejected((p) => (p === "accepted" ? "rejected" : "accepted"));
  }, []);

  const columns = useMemo(() => {
    const base = [
      { id: "applied", title: "Applied", bg: "var(--applied-column-bg)" },
      { id: "interview", title: "Interview", bg: "var(--interview-column-bg)" },
      { id: "offer", title: "Offer", bg: "var(--offer-column-bg)" },
      acceptedRejected === "accepted"
        ? { id: "accepted", title: "Accepted", bg: "var(--accepted-column-bg)" }
        : {
            id: "rejected",
            title: "Rejected",
            bg: "var(--rejected-column-bg)",
          },
    ];

    if (jobs.some((j) => j.column?.toLowerCase() === "staging")) {
      base.push({
        id: "staging",
        title: "Processing",
        bg: "var(--color-light-gray)",
      });
    }

    return base;
  }, [jobs, acceptedRejected]);

  return {
    columns,
    toggleAcceptedRejected,
    showRejectToggle:
      acceptedRejected === "accepted" || acceptedRejected === "rejected",
  };
}
