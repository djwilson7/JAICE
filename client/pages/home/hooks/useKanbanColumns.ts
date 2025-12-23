import { useMemo } from "react";
import type { JobCardType } from "@/types/jobCardType";
import { useSettings } from "@/pages/settings/provider/SettingsProvider";
import { kanBanColumns } from "@/pages/home/home-components/column/KanBanColumn";

export function useKanbanColumns(jobs: JobCardType[]) {
  const { reviewBehavior } = useSettings();

  const columns = useMemo(() => {
    const hasReviewJobs = jobs.some((j) => j.reviewNeeded === true);
    const hasStagingJobs = jobs.some(
      (j) => j.column?.toLowerCase() === "staging"
    );

    return kanBanColumns.map((column) => {
      switch (column.id) {
        case "accepted":
          return {
            ...column,
            visible: true,
          };

        case "rejected":
          return {
            ...column,
            visible: true,
          };

        case "review":
          return {
            ...column,
            visible:
              reviewBehavior === "column" ||
              (reviewBehavior === "dynamic" && hasReviewJobs),
          };

        case "staging":
          return {
            ...column,
            visible: hasStagingJobs,
          };

        default:
          return {
            ...column,
            visible: true,
          };
      }
    });
  }, [jobs, reviewBehavior]);

  return {
    columns,
  };
}
