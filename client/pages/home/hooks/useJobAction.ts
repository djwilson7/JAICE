import { useCallback } from "react";
import type { JobCardType } from "@/types/jobCardType";
import { IS_DEMO_MODE } from "@/global-services/projectMode";

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
          const nextJob = IS_DEMO_MODE
            ? {
                ...updated,
                id: `demo-manual-${crypto.randomUUID()}`,
              }
            : updated;
          return [nextJob as JobCardType, ...prev];
        }
      });
    },
    [setJobs]
  );

  return { saveJob };
}
