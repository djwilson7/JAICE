import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { api } from "@/global-services/api";

vi.mock("@/global-services/projectMode", () => ({
  IS_DEMO_MODE: true,
}));

vi.mock("@/global-services/api", () => ({
  api: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/global-components/bannerNotificationContext", () => ({
  useBannerNotifications: () => ({ showBanner: vi.fn() }),
}));

import { useJobsLoader } from "@/pages/home/hooks/useJobsLoader";
import { useRealtimeJobs } from "@/pages/home/hooks/useRealTimeJobs";
import { useJobRealtime } from "@/pages/home/hooks/useJobRealtime";
import { checkGmailStatus } from "@/pages/home/utils/checkGmailStatus";
import { useGritScore } from "@/utils/useGritScore";

describe("Home external connections in demo mode", () => {
  it("does not start reads, sync, metrics, token setup, or Supabase", async () => {
    const { result } = renderHook(() => {
      const jobsLoader = useJobsLoader();
      const gritScore = useGritScore();
      useRealtimeJobs("demo-user", vi.fn());
      useJobRealtime("demo-user", "demo-token", vi.fn());
      return { jobsLoader, gritScore };
    });

    await act(async () => {
      await result.current.jobsLoader.reloadJobs();
    });

    expect(result.current.jobsLoader.jobs).toEqual([]);
    expect(result.current.jobsLoader.isLoading).toBe(false);
    expect(result.current.gritScore.loading).toBe(false);
    expect(api).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("uses a local disconnected Gmail state without checking the backend", async () => {
    const setGmailConnected = vi.fn();
    const setGmailError = vi.fn();

    await checkGmailStatus({ setGmailConnected, setGmailError });

    expect(setGmailConnected).toHaveBeenCalledWith(false);
    expect(setGmailError).toHaveBeenCalledWith(null);
    expect(api).not.toHaveBeenCalled();
  });
});
