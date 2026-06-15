import { useMemo, useState } from "react";
import type { JobCardType } from "@/types/jobCardType";
import { sortJobs } from "@/pages/home/hooks/sortJobs";
import { getJobDateParts } from "@/pages/home/utils/jobDateParts";

function normalizeSearchText(value: string): string {
  return value.toLocaleLowerCase().trim().replace(/\s+/g, " ");
}

function getSubstringScore(value: string, query: string): number | null {
  const normalizedValue = normalizeSearchText(value);
  if (!normalizedValue) return null;

  const matchIndex = normalizedValue.indexOf(query);
  if (matchIndex === -1) return null;

  const startsInsideWord =
    matchIndex > 0 && /[a-z0-9]/i.test(normalizedValue[matchIndex - 1]);
  if (query.includes(" ") && startsInsideWord) return null;

  if (normalizedValue === query) return 0;

  const startsAtWordBoundary =
    matchIndex === 0 || normalizedValue[matchIndex - 1] === " ";
  const positionPenalty = matchIndex / Math.max(normalizedValue.length, 1);

  if (matchIndex === 0) return 0.05 + positionPenalty;
  if (startsAtWordBoundary) return 0.1 + positionPenalty;
  return 0.2 + positionPenalty;
}

function getJobMatchScore(job: JobCardType, query: string): number | null {
  const { dateSearchText, time } = getJobDateParts(job);
  const fieldValues = [
    job.title,
    job.companyName ?? "",
    dateSearchText,
    time,
  ];
  const scores = fieldValues
    .map((value) => getSubstringScore(value, query))
    .filter((score): score is number => score !== null);

  return scores.length > 0 ? Math.min(...scores) : null;
}

export function useJobSearchAndSort(jobs: JobCardType[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("old");

  const { sortedJobs, matchScoreMap } = useMemo(() => {
    const sorted = sortJobs(sortOption, jobs);
    const normalizedQuery = normalizeSearchText(searchQuery);

    if (!normalizedQuery) {
      return {
        sortedJobs: sorted,
        matchScoreMap: new Map(
          sorted.map((job) => [job.id, 0])
        ),
      };
    }

    const scores = new Map<string, number>();
    sorted.forEach((job) => {
      const score = getJobMatchScore(job, normalizedQuery);
      if (score !== null) scores.set(job.id, score);
    });

    return {
      sortedJobs: sorted,
      matchScoreMap: scores,
    };
  }, [jobs, searchQuery, sortOption]);

  return {
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    sortedJobs,
    matchScoreMap,
    hasSearch: !!searchQuery.trim(),
  };
}
