import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/global-services/api";
import { useJobRealtime } from "@/pages/home/hooks/useJobRealtime";
import { applyJobChange } from "@/pages/home/utils/applyJobChange";
import type { JobCardType } from "@/types/jobCardType";
import type { JobRealtimeEvent } from "@/pages/home/utils/convertToJobCard";

export function useRealtimeJobs(
  userId: string,
  setJobs: React.Dispatch<React.SetStateAction<JobCardType[]>>
) {
  const [rlsToken, setRlsToken] = useState<string | null>(null);
  const [newJobsCount, setNewJobsCount] = useState(0);
  const lastSeenCountRef = useRef(0);

  // mint token
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await api("/api/auth/setup-frontend-rls-session", {
          method: "POST",
        });
        if (!cancelled) setRlsToken(res?.rls_jwt ?? null);
      } catch {
        // Keep the previous token when session setup fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // refresh token
  useEffect(() => {
    if (!userId) return;

    const REFRESH_MS = 25 * 60 * 1000;
    const id = setInterval(async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await api("/api/auth/setup-frontend-rls-session", {
          method: "POST",
        });
        setRlsToken(res?.rls_jwt ?? null);
      } catch {
        // Keep the previous token when refresh fails.
      }
    }, REFRESH_MS);

    return () => clearInterval(id);
  }, [userId]);

  const handleRealtimeChange = useCallback((event: JobRealtimeEvent) => {
    if (event.type === "INSERT") {
      setNewJobsCount((n) => n + 1);
    }
    setJobs((prev) => applyJobChange(prev, event));
  }, [setJobs]);

  useJobRealtime(userId, rlsToken, handleRealtimeChange);

  const resetNewJobsCount = useCallback(() => {
    setNewJobsCount(0);
    lastSeenCountRef.current = 0;
  }, []);

  return {
    newJobsCount,
    resetNewJobsCount,
  };
}
