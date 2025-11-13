// src/hooks/useJobRealtime.ts
import { useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import type { JobBroadcastPayload } from "@/types/jobBroadcastPayload";

// Establishes a Supabase Realtime subscription for job application changes
// This hook literally allows users to see real-time updates to their job applications from supabase 
// When new jobs are added, updated, or deleted in the database, the changes are broadcasted to the client in real-time.
export function useJobRealtime(
  userId: string,
  rlsToken: string | null,
  onChange: (payload: JobBroadcastPayload) => void
) {
  const supabase = useMemo(() => {
    if (!rlsToken) return null;
    console.log("Creating stable Supabase client with RLS token");
    return createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: `Bearer ${rlsToken}` } },
      }
    );
  }, [rlsToken]);

  useEffect(() => {
    if (!userId || !supabase) {
      console.warn("Realtime not started — missing userId or Supabase client");
      return;
    }

    console.log("Connecting realtime channel for user:", userId);

    const channel = supabase
      .channel(`user:${userId}:job_applications`)
      .on("broadcast", { event: "*" }, (payload: JobBroadcastPayload) => {
        console.log("Realtime broadcast:", payload);
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
  }, [userId, supabase, onChange]);
}
