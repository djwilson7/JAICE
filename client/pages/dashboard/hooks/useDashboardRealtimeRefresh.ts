import { useCallback, useEffect, useState } from "react";
import { api } from "@/global-services/api";
import { useJobRealtime } from "@/pages/home/hooks/useJobRealtime";
import { useAuth } from "@/global-components/authContext";
import { IS_DEMO_MODE } from "@/global-services/projectMode";

export function useDashboardRealtimeRefresh() {
  const { user } = useAuth();
  const userId = user?.uid ?? "";
  const [rlsToken, setRlsToken] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (IS_DEMO_MODE || !userId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await api("/api/auth/setup-frontend-rls-session", {
          method: "POST",
        });
        if (!cancelled) setRlsToken(res?.rls_jwt ?? null);
      } catch (error) {
        console.error("Failed to prepare dashboard realtime session:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleChange = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  useJobRealtime(userId, rlsToken, handleChange);

  return refreshKey;
}
