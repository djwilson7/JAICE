import { useMemo } from "react";
import type { JobCardType } from "@/types/jobCardType";
import { useSettings } from "@/pages/settings/provider/settingsContext";
import { kanBanColumns } from "@/pages/home/home-components/column/KanBanColumn";

export function useKanbanColumns(jobs: JobCardType[]) {
  const { reviewBehavior, selectedPrimaryColumn, primaryColumnBehavior } =
    useSettings();

  const columns = useMemo(() => {
    const hasReviewJobs = jobs.some((j) => j.reviewNeeded === true);
    const hasStagingJobs = jobs.some(
      (j) => j.column?.toLowerCase() === "staging"
    );
    const hasProcessingJobs = jobs.some(
      (j) => j.column?.toLowerCase() === "processing"
    );

    return kanBanColumns.map((column) => {
      switch (column.id) {
        case "accepted":
          return {
            ...column,
            visible:
              primaryColumnBehavior === "separate" ||
              (primaryColumnBehavior === "unified" &&
                selectedPrimaryColumn === "accepted"),
          };

        case "rejected":
          return {
            ...column,
            visible:
              primaryColumnBehavior === "separate" ||
              (primaryColumnBehavior === "unified" &&
                selectedPrimaryColumn === "rejected"),
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

        case "processing":
          return {
            ...column,
            visible: hasProcessingJobs,
          };

        default:
          return {
            ...column,
            visible: true,
          };
      }
    });
  }, [jobs, reviewBehavior, primaryColumnBehavior, selectedPrimaryColumn]);

  return {
    columns,
  };
}
