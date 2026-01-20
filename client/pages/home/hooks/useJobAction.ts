import { useCallback } from "react";
import type { JobCardType } from "@/types/jobCardType";

export function useJobActions(
  setJobs: React.Dispatch<React.SetStateAction<JobCardType[]>>
) {
  const saveJob = useCallback(
    (updated: Partial<JobCardType> & { id?: string }) => {
      setJobs((prev) => {
        if (updated.id) {
          return prev.map((j) =>
            j.id === updated.id ? (updated as JobCardType) : j
          );
        } else {
          // fallback if no id returned
          return [updated as JobCardType, ...prev];
        }
      });
    },
    [setJobs]
  );

  return { saveJob };
}
