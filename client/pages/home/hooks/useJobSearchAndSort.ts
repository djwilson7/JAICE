import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import type { JobCardType } from "@/types/jobCardType";
import { sortJobs } from "@/pages/home/hooks/sortJobs";

export function useJobSearchAndSort(jobs: JobCardType[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("old");

  const fuse = useMemo(() => {
    return new Fuse<JobCardType>(jobs, {
      keys: ["title", "column", "date"],
      includeScore: true,
      threshold: 0.1,
      ignoreLocation: true,
      useExtendedSearch: true,
    });
  }, [jobs]);

  const { sortedJobs, filteredJobs } = useMemo(() => {
    const sorted = sortJobs(sortOption, jobs);

    if (!searchQuery.trim()) {
      return {
        sortedJobs: sorted,
        filteredJobs: sorted,
      };
    }

    const results = fuse.search(searchQuery);
    const strongMatches = results.filter((r) => (r.score ?? 1) <= 0.4);
    const matchedIds = new Set(strongMatches.map((r) => r.item.id));

    return {
      sortedJobs: sorted,
      filteredJobs: sorted.filter((j) => matchedIds.has(j.id)),
    };
  }, [jobs, searchQuery, sortOption, fuse]);

  const matchOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    filteredJobs.forEach((job, idx) => map.set(job.id, idx));
    return map;
  }, [filteredJobs]);

  return {
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    sortedJobs,
    matchOrderMap,
    hasSearch: !!searchQuery.trim(),
  };
}
