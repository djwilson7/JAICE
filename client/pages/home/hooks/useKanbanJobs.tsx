import { type JSX } from "react";
import { JobCard } from "@/pages/home/home-components/JobCards";
import type { JobCardType } from "@/types/jobCardType";

export function useKanbanJobs({
  jobs,
  columns,
  matchOrderMap,
  hasSearch,
  openJobAppModal,
}: {
  jobs: JobCardType[];
  columns: { id: string; title: string; bg: string }[];
  matchOrderMap: Map<string, number>;
  hasSearch: boolean;
  openJobAppModal: (payload: string | JobCardType | null) => void;
}): Record<string, JSX.Element[]> {
  return columns.reduce((acc, column) => {
    const jobsInColumn = jobs.filter(
      (job) => job.column?.toLowerCase() === column.id
    );

    const orderedJobs = [...jobsInColumn].sort((a, b) => {
      if (a.reviewNeeded && !b.reviewNeeded) return -1;
      if (!a.reviewNeeded && b.reviewNeeded) return 1;

      const aMatched = matchOrderMap.has(a.id);
      const bMatched = matchOrderMap.has(b.id);

      if (aMatched && !bMatched) return -1;
      if (!aMatched && bMatched) return 1;
      if (aMatched && bMatched)
        return (matchOrderMap.get(a.id) ?? 0) - (matchOrderMap.get(b.id) ?? 0);
      return 0;
    });

    acc[column.id] = orderedJobs.map((job) => (
      <JobCard
        key={job.id}
        job={job}
        dimmed={hasSearch && !matchOrderMap.has(job.id)}
        openJobAppModal={openJobAppModal}
      />
    ));

    return acc;
  }, {} as Record<string, JSX.Element[]>);
}
