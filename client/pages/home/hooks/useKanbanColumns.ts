import { useCallback, useMemo, useState } from "react";
import type { JobCardType } from "@/types/jobCardType";
import { useSettings } from "@/pages/settings/provider/SettingsProvider";

export function useKanbanColumns(jobs: JobCardType[]) {
  const { reviewBehavior } = useSettings();

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

    if (reviewBehavior === "column") {
      base.push({
        id: "review",
        title: "Review",
        bg: "var(--review-column-bg)",
      });
    }

    if (jobs.some((j) => j.column?.toLowerCase() === "staging")) {
      base.push({
        id: "staging",
        title: "Processing",
        bg: "var(--processing-column-bg)",
      });
    }

    return base;
  }, [jobs, acceptedRejected, reviewBehavior]);

  return {
    columns,
    toggleAcceptedRejected,
    showRejectToggle: true,
  };
}
