import { type JSX } from "react";
import { JobCard } from "@/pages/home/home-components/job-card/JobCards";
import type { JobCardType } from "@/types/jobCardType";
import { useSettings } from "@/pages/settings/provider/settingsContext";

export function useKanbanJobs({
  jobs,
  columns,
  matchScoreMap,
  hasSearch,
  openJobAppModal,
}: {
  jobs: JobCardType[];
  columns: { id: string; title: string; bg: string }[];
  matchScoreMap: Map<string, number>;
  hasSearch: boolean;
  openJobAppModal: (payload: string | JobCardType | null) => void;

}): Record<string, JSX.Element[]> {
  const { reviewBehavior } = useSettings();

  return columns.reduce((acc, column) => {
    let jobsInColumn: JobCardType[];

    if (column.id === "review") {
      jobsInColumn = jobs.filter((job) => job.reviewNeeded);
    } else {
      jobsInColumn = jobs.filter(
        (job) =>
          job.column?.toLowerCase() === column.id &&
          (reviewBehavior === "inline" || !job.reviewNeeded)
      );
    }

    const orderedJobs = [...jobsInColumn].sort((a, b) => {
      const aMatched = matchScoreMap.has(a.id);
      const bMatched = matchScoreMap.has(b.id);

      if (hasSearch) {
        if (aMatched && !bMatched) return -1;
        if (!aMatched && bMatched) return 1;
        if (aMatched && bMatched) {
          return (
            (matchScoreMap.get(a.id) ?? 1) -
            (matchScoreMap.get(b.id) ?? 1)
          );
        }
      }

      if (reviewBehavior === "inline") {
        if (a.reviewNeeded && !b.reviewNeeded) return -1;
        if (!a.reviewNeeded && b.reviewNeeded) return 1;
      }

      return 0;
    });

    acc[column.id] = orderedJobs.map((job) => (
      <JobCard
        key={job.id}
        job={job}
        dimmed={hasSearch && !matchScoreMap.has(job.id)}
        openJobAppModal={openJobAppModal}
      />
    ));

    return acc;
  }, {} as Record<string, JSX.Element[]>);
}
