import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  GuidedTourSessionContext,
  useGuidedTourSession,
} from "@/app/layouts/guidedTourSessionContext";
import { GuidedTourSessionProvider } from "@/app/layouts/GuidedTourSessionProvider";
import type { GuidedTourHomeInteractionState } from "@/app/layouts/guidedTourSteps";
import { api } from "@/global-services/api";
import { useTrashActions } from "./useTrashActions";
import { createDemoDeletedJobs } from "@/demo-data/demoEmails";

vi.mock("@/global-services/projectMode", () => ({ IS_DEMO_MODE: true }));
vi.mock("@/global-services/api", () => ({ api: vi.fn() }));
vi.mock("@/global-components/bannerNotificationContext", () => ({
  useBannerNotifications: () => ({ showBanner: vi.fn() }),
}));

const deletedJobIds = [
  "demo-email-northstar-application",
  "demo-email-harbor-interview",
  "demo-email-juniper-offer",
];

function TrashHarness() {
  const trash = useTrashActions({});
  const { demoJobs } = useGuidedTourSession();
  return (
    <>
      <span data-testid="open">{String(trash.isOpen)}</span>
      <span data-testid="count">{trash.items.length}</span>
      <span data-testid="restored-count">
        {demoJobs.filter((job) => !job.isDeleted).length}
      </span>
      <button type="button" onClick={() => void trash.open()}>
        Open trash
      </button>
      <button
        type="button"
        disabled={!trash.items[0]}
        onClick={() =>
          void trash.handleAction("undelete", [trash.items[0]?.id])
        }
      >
        Restore first
      </button>
    </>
  );
}

function sessionValue(homeInteractionState: GuidedTourHomeInteractionState) {
  return {
    demoDataAvailable: true,
    demoDataState: "bulk-deleted" as const,
    demoDataRevision: 14,
    homeInteractionState,
    deletedJobIds,
    recordDeletedJobIds: vi.fn(),
    demoJobs: createDemoDeletedJobs(deletedJobIds),
    setDemoJobs: vi.fn(),
    removeDemoJobs: vi.fn(),
    emails: [],
  };
}

describe("useTrashActions in the guided demo", () => {
  it("opens the matching deleted cards locally and closes them for free exploration", async () => {
    const { rerender } = render(
      <GuidedTourSessionContext.Provider value={sessionValue("trash-ready")}>
        <TrashHarness />
      </GuidedTourSessionContext.Provider>
    );

    await act(async () => {
      screen.getByRole("button", { name: "Open trash" }).click();
    });
    expect(screen.getByTestId("open")).toHaveTextContent("true");
    expect(screen.getByTestId("count")).toHaveTextContent("3");
    expect(api).not.toHaveBeenCalled();

    rerender(
      <GuidedTourSessionContext.Provider value={sessionValue("trash-open")}>
        <TrashHarness />
      </GuidedTourSessionContext.Provider>
    );
    expect(screen.getByTestId("open")).toHaveTextContent("true");

    rerender(
      <GuidedTourSessionContext.Provider value={sessionValue("free")}>
        <TrashHarness />
      </GuidedTourSessionContext.Provider>
    );
    expect(screen.getByTestId("open")).toHaveTextContent("false");
    expect(api).not.toHaveBeenCalled();
  });

  it("restores a deleted card into the persistent demo job set", async () => {
    const onTrashRestored = vi.fn();
    window.addEventListener("guided-tour-trash-restored", onTrashRestored);
    render(
      <GuidedTourSessionProvider
        demoDataState="bulk-deleted"
        demoDataRevision={14}
        homeInteractionState="trash-open"
        deletedJobIds={deletedJobIds}
      >
        <TrashHarness />
      </GuidedTourSessionProvider>
    );

    expect(screen.getByTestId("count")).toHaveTextContent("3");
    expect(screen.getByTestId("restored-count")).toHaveTextContent("4");

    await act(async () => {
      screen.getByRole("button", { name: "Restore first" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("2");
      expect(screen.getByTestId("restored-count")).toHaveTextContent("5");
    });
    expect(onTrashRestored).toHaveBeenLastCalledWith(
      expect.objectContaining({
        detail: {
          ids: ["demo-email-northstar-application"],
        },
      })
    );
    expect(api).not.toHaveBeenCalled();
    window.removeEventListener("guided-tour-trash-restored", onTrashRestored);
  });
});
