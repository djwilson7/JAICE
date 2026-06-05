import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/global-services/api";
import { convertToJobCardArray } from "@/pages/home/utils/convertToJobCard";
import type { JobCardType } from "@/types/jobCardType";

export function useJobsLoader() {
  const [jobs, setJobs] = useState<JobCardType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasLoadedRef = useRef(false);
  const hasSyncedGmailRef = useRef(false);

  const load = useCallback(
    async (force = false) => {
      if (!force && (hasLoadedRef.current || isLoading)) return;

      setIsLoading(true);

      try {
        const res = await api("/api/jobs/latest-jobs");

        if (res.status === "success") {
          const cards = convertToJobCardArray(res.jobs);
          setJobs(cards);
          hasLoadedRef.current = true;
        }
      } catch (err) {
        console.error("Failed to load jobs:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  // initial load
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (hasSyncedGmailRef.current) return;
    hasSyncedGmailRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        await api("/api/gmail/sync-now", { method: "POST" });
        if (!cancelled) {
          await load(true);
        }
      } catch (err) {
        console.error("Failed to enqueue Gmail sync:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [load]);

  return {
    jobs,
    setJobs, // exposed for realtime & local merges
    reloadJobs: () => load(true),
    isLoading,
  };
}
