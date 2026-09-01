import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuidedTourSessionContext } from "@/app/layouts/guidedTourSessionContext";
import { useIsMultiSelecting } from "@/pages/home/hooks/useIsMultiSelecting";
import { useSelectedJobs } from "@/pages/home/hooks/useSelectedJobs";
import type { GuidedTourHomeInteractionState } from "@/app/layouts/guidedTourSteps";
import type { JobCardType } from "@/types/jobCardType";
import { GuidedTourHomeState } from "./GuidedTourHomeState";
import { JOB_LOCAL_CHANGE_EVENT } from "@/pages/home/utils/jobLocalChangeEvent";

vi.mock("@/global-services/projectMode", () => ({ IS_DEMO_MODE: true }));
vi.mock("@/pages/home/hooks/useIsMultiSelecting", () => ({
  useIsMultiSelecting: vi.fn(),
}));
vi.mock("@/pages/home/hooks/useSelectedJobs", () => ({
  useSelectedJobs: vi.fn(),
}));

describe("GuidedTourHomeState", () => {
  const setIsMultiSelecting = vi.fn();
  const setSelectedJobs = vi.fn();
  const selectedJobs = [
    { id: "one" },
    { id: "two" },
    { id: "three" },
  ] as JobCardType[];

  const interviewJobs = [
    { id: "interview-one", column: "interview" },
    { id: "interview-two", applicationStage: "interview" },
    { id: "interview-three", column: "interview" },
    { id: "applied-one", column: "applied" },
    { id: "demo-email-juniper-offer", column: "offer" },
  ] as JobCardType[];

  const valueFor = (
    homeInteractionState: GuidedTourHomeInteractionState,
    demoDataRevision: number
  ) => ({
    demoDataAvailable: true,
    demoDataState: "sorted" as const,
    demoDataRevision,
    homeInteractionState,
    deletedJobIds: [],
    recordDeletedJobIds: vi.fn(),
    demoJobs: interviewJobs,
    setDemoJobs: vi.fn(),
    removeDemoJobs: vi.fn(),
    emails: [],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIsMultiSelecting).mockReturnValue({
      isMultiSelecting: false,
      setIsMultiSelecting,
    });
    vi.mocked(useSelectedJobs).mockReturnValue({
      selectedJobs: [],
      setSelectedJobs,
      toggleJobSelection: vi.fn(),
    });
  });

  it("waits for the user selections and resets them when returning to the control", () => {
    const onSelectionCount = vi.fn();
    window.addEventListener("guided-tour-selection-count", onSelectionCount);

    const { rerender } = render(
      <GuidedTourSessionContext.Provider value={valueFor("select-control", 9)}>
        <GuidedTourHomeState />
      </GuidedTourSessionContext.Provider>
    );
    expect(setIsMultiSelecting).toHaveBeenLastCalledWith(false);
    expect(setSelectedJobs).toHaveBeenLastCalledWith([]);

    rerender(
      <GuidedTourSessionContext.Provider value={valueFor("selecting-cards", 10)}>
        <GuidedTourHomeState />
      </GuidedTourSessionContext.Provider>
    );
    expect(setIsMultiSelecting).toHaveBeenLastCalledWith(true);
    expect(setSelectedJobs).toHaveBeenLastCalledWith([]);

    vi.mocked(useSelectedJobs).mockReturnValue({
      selectedJobs,
      setSelectedJobs,
      toggleJobSelection: vi.fn(),
    });
    rerender(
      <GuidedTourSessionContext.Provider value={valueFor("selecting-cards", 10)}>
        <GuidedTourHomeState />
      </GuidedTourSessionContext.Provider>
    );
    expect(onSelectionCount).toHaveBeenLastCalledWith(
      expect.objectContaining({ detail: { count: 3 } })
    );

    rerender(
      <GuidedTourSessionContext.Provider value={valueFor("select-control", 9)}>
        <GuidedTourHomeState />
      </GuidedTourSessionContext.Provider>
    );
    expect(setIsMultiSelecting).toHaveBeenLastCalledWith(false);
    expect(setSelectedJobs).toHaveBeenLastCalledWith([]);

    window.removeEventListener(
      "guided-tour-selection-count",
      onSelectionCount
    );
  });

  it("selects the three active Interview cards for the guided action", () => {
    render(
      <GuidedTourSessionContext.Provider value={valueFor("selecting-cards", 10)}>
        <GuidedTourHomeState />
      </GuidedTourSessionContext.Provider>
    );

    window.dispatchEvent(new CustomEvent("guided-tour-select-interview"));

    expect(setSelectedJobs).toHaveBeenLastCalledWith(interviewJobs.slice(0, 3));
  });

  it("moves the offer card into Accepted for the guided action", () => {
    const onLocalChange = vi.fn();
    window.addEventListener(JOB_LOCAL_CHANGE_EVENT, onLocalChange);
    render(
      <GuidedTourSessionContext.Provider value={valueFor("idle", 8)}>
        <GuidedTourHomeState />
      </GuidedTourSessionContext.Provider>
    );

    window.dispatchEvent(new CustomEvent("guided-tour-accept-offer"));

    expect(onLocalChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          after: expect.objectContaining({
            id: "demo-email-juniper-offer",
            column: "accepted",
            applicationStage: "accepted",
          }),
        }),
      })
    );
    window.removeEventListener(JOB_LOCAL_CHANGE_EVENT, onLocalChange);
  });
});
