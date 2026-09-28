import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
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
import { GuidedTourSessionProvider } from "@/app/layouts/GuidedTourSessionProvider";
import { useGuidedTourSession } from "@/app/layouts/guidedTourSessionContext";

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

  it("reveals shared mock emails locally without making a request", () => {
    const { result } = renderHook(() => useJobsLoader(), {
      wrapper: ({ children }) => (
        <GuidedTourSessionProvider demoDataState="processing">
          {children}
        </GuidedTourSessionProvider>
      ),
    });

    expect(result.current.jobs).toHaveLength(7);
    expect(result.current.jobs.every((job) => job.column === "staging")).toBe(
      true
    );
    expect(api).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("loads every demo card in free roam and resets them when a tour starts", () => {
    function JobsCount() {
      const { jobs } = useJobsLoader();
      return <span data-testid="demo-job-count">{jobs.length}</span>;
    }

    const { rerender } = render(
      <GuidedTourSessionProvider demoDataState="free-roam">
        <JobsCount />
      </GuidedTourSessionProvider>
    );

    expect(screen.getByTestId("demo-job-count")).toHaveTextContent("26");

    rerender(
      <GuidedTourSessionProvider demoDataState="hidden">
        <JobsCount />
      </GuidedTourSessionProvider>
    );

    expect(screen.getByTestId("demo-job-count")).toHaveTextContent("0");

    rerender(
      <GuidedTourSessionProvider demoDataState="free-roam">
        <JobsCount />
      </GuidedTourSessionProvider>
    );

    expect(screen.getByTestId("demo-job-count")).toHaveTextContent("26");
  });

  it("reverses processing and sorted records with the tour steps", () => {
    function JobsCount() {
      const { jobs, setJobs } = useJobsLoader();
      const { demoJobs, setDemoJobs } = useGuidedTourSession();
      const offer = jobs.find(
        (job) => job.id === "demo-email-juniper-offer"
      );
      return (
        <>
          <span data-testid="demo-job-count">{jobs.length}</span>
          <span data-testid="demo-job-columns">
            {jobs.map((job) => job.column).join(",")}
          </span>
          <span data-testid="demo-offer-column">{offer?.column ?? "none"}</span>
          <span data-testid="demo-deleted-count">
            {demoJobs.filter((job) => job.isDeleted).length}
          </span>
          <button
            type="button"
            onClick={() =>
              setJobs((currentJobs) =>
                currentJobs.map((job) =>
                  job.id === "demo-email-juniper-offer"
                    ? { ...job, column: "accepted" }
                    : job
                )
              )
            }
          >
            Move offer
          </button>
          <button
            type="button"
            onClick={() =>
              setDemoJobs((currentJobs) =>
                currentJobs.map((job) =>
                  job.id === "demo-email-northstar-application"
                    ? { ...job, isDeleted: false }
                    : job
                )
              )
            }
          >
            Restore Northstar
          </button>
        </>
      );
    }

    const { rerender } = render(
      <GuidedTourSessionProvider demoDataState="hidden">
        <JobsCount />
      </GuidedTourSessionProvider>
    );
    expect(screen.getByTestId("demo-job-count")).toHaveTextContent("0");

    rerender(
      <GuidedTourSessionProvider demoDataState="processing">
        <JobsCount />
      </GuidedTourSessionProvider>
    );
    expect(screen.getByTestId("demo-job-count")).toHaveTextContent("7");
    expect(screen.getByTestId("demo-job-columns")).toHaveTextContent(
      "staging,staging,staging,staging,staging,staging,staging"
    );

    rerender(
      <GuidedTourSessionProvider demoDataState="hidden">
        <JobsCount />
      </GuidedTourSessionProvider>
    );
    expect(screen.getByTestId("demo-job-count")).toHaveTextContent("0");

    rerender(
      <GuidedTourSessionProvider demoDataState="processing">
        <JobsCount />
      </GuidedTourSessionProvider>
    );
    expect(screen.getByTestId("demo-job-count")).toHaveTextContent("7");

    rerender(
      <GuidedTourSessionProvider
        demoDataState="sorted"
        demoDataRevision={8}
      >
        <JobsCount />
      </GuidedTourSessionProvider>
    );
    expect(screen.getByTestId("demo-job-count")).toHaveTextContent("7");
    expect(screen.getByTestId("demo-job-columns")).not.toHaveTextContent(
      "staging"
    );
    expect(screen.getByTestId("demo-offer-column")).toHaveTextContent("offer");

    fireEvent.click(screen.getByRole("button", { name: "Move offer" }));
    expect(screen.getByTestId("demo-offer-column")).toHaveTextContent(
      "accepted"
    );

    rerender(
      <GuidedTourSessionProvider
        demoDataState="sorted"
        demoDataRevision={7}
      >
        <JobsCount />
      </GuidedTourSessionProvider>
    );
    expect(screen.getByTestId("demo-offer-column")).toHaveTextContent("offer");

    rerender(
      <GuidedTourSessionProvider
        demoDataState="bulk-deleted"
        demoDataRevision={13}
        deletedJobIds={[
          "demo-email-northstar-application",
          "demo-email-harbor-interview",
          "demo-email-juniper-offer",
        ]}
      >
        <JobsCount />
      </GuidedTourSessionProvider>
    );
    expect(screen.getByTestId("demo-job-count")).toHaveTextContent("4");
    expect(screen.getByTestId("demo-offer-column")).toHaveTextContent("none");
    expect(screen.getByTestId("demo-deleted-count")).toHaveTextContent("3");

    fireEvent.click(
      screen.getByRole("button", { name: "Restore Northstar" })
    );
    expect(screen.getByTestId("demo-job-count")).toHaveTextContent("5");
    expect(screen.getByTestId("demo-deleted-count")).toHaveTextContent("2");

    rerender(
      <GuidedTourSessionProvider
        demoDataState="bulk-deleted"
        demoDataRevision={15}
        deletedJobIds={[
          "demo-email-northstar-application",
          "demo-email-harbor-interview",
          "demo-email-juniper-offer",
        ]}
      >
        <JobsCount />
      </GuidedTourSessionProvider>
    );
    expect(screen.getByTestId("demo-job-count")).toHaveTextContent("24");
    expect(screen.getByTestId("demo-deleted-count")).toHaveTextContent("2");

    rerender(
      <GuidedTourSessionProvider
        demoDataState="bulk-deleted"
        demoDataRevision={14}
        deletedJobIds={[
          "demo-email-northstar-application",
          "demo-email-harbor-interview",
          "demo-email-juniper-offer",
        ]}
      >
        <JobsCount />
      </GuidedTourSessionProvider>
    );
    expect(screen.getByTestId("demo-job-count")).toHaveTextContent("5");

    rerender(
      <GuidedTourSessionProvider
        demoDataState="sorted"
        demoDataRevision={12}
        deletedJobIds={[
          "demo-email-northstar-application",
          "demo-email-harbor-interview",
          "demo-email-juniper-offer",
        ]}
      >
        <JobsCount />
      </GuidedTourSessionProvider>
    );
    expect(screen.getByTestId("demo-job-count")).toHaveTextContent("7");
    expect(screen.getByTestId("demo-offer-column")).toHaveTextContent("offer");
    expect(api).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });
});
