import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/global-services/api";
import { convertToJobCardArray } from "@/pages/home/utils/convertToJobCard";
import type { JobCardType } from "@/types/jobCardType";
import { useBannerNotifications } from "@/global-components/bannerNotificationContext";

export function useJobsLoader() {
  const [jobs, setJobs] = useState<JobCardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const hasSyncedGmailRef = useRef(false);
  const { showBanner } = useBannerNotifications();

  const load = useCallback(
    async (force = false) => {
      if (!force && hasLoadedRef.current) return;

      const showPageLoader = !hasLoadedRef.current;
      if (showPageLoader) {
        setIsLoading(true);
      }

      try {
        const res = await api("/api/jobs/latest-jobs");

        if (res.status !== "success") {
          throw new Error("Latest jobs request did not return success.");
        }

        const cards = convertToJobCardArray(res.jobs);
        setJobs(cards);
        hasLoadedRef.current = true;
        showBanner({
          id: "home-jobs-load-success",
          message: "Content loaded successfully.",
          tone: "success",
          timeoutMs: 4000,
        });
      } catch (err) {
        console.error("Failed to load jobs:", err);
        showBanner({
          id: "home-jobs-load-error",
          message: "Failed to load content. Refresh the page and try again.",
          tone: "error",
          timeoutMs: 10000,
        });
      } finally {
        if (showPageLoader) {
          setIsLoading(false);
        }
      }
    },
    [showBanner]
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
