// src/hooks/useJobRealtime.ts
import { useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import type { JobBroadcastPayload } from "@/types/jobBroadcastPayload";
import { IS_DEMO_MODE } from "@/global-services/projectMode";

// Establishes a Supabase Realtime subscription for job application changes
// This hook literally allows users to see real-time updates to their job applications from supabase 
// When new jobs are added, updated, or deleted in the database, the changes are broadcasted to the client in real-time.
export function useJobRealtime(
  userId: string,
  rlsToken: string | null,
  onChange: (payload: JobBroadcastPayload) => void
) {
  const supabase = useMemo(() => {
    if (IS_DEMO_MODE || !rlsToken) return null;
    console.log("Creating stable Supabase client");
    return createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: `Bearer ${rlsToken}` } },
      }
    );
  }, [rlsToken]);

  useEffect(() => {
    if (IS_DEMO_MODE) return;

    if (!userId || !supabase) {
      console.warn("Realtime not started — missing userId or Supabase client");
      return;
    }

    console.log("Connecting realtime channel for user");
    supabase.realtime.setAuth(rlsToken);

    const channel = supabase
      .channel(`user:${userId}:job_applications`, {
        config: { private: true },
      })
      .on("broadcast", { event: "*" }, (payload: JobBroadcastPayload) => {
        console.log("Realtime broadcast received:", payload.event);
        onChange(payload);
      })
      .subscribe((status) => {
        console.log("Channel status:", status);
        if (status === "CLOSED" || status === "TIMED_OUT") {
          console.warn("Realtime channel dropped, attempting reconnect...");
        }
      });

    return () => {
      console.log("Cleaning up realtime channel");
      supabase.removeChannel(channel);
    };
  }, [userId, rlsToken, supabase, onChange]);
}
