import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKanbanJobs } from "./useKanbanJobs";
import { useSettings } from "@/pages/settings/provider/settingsContext";

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: vi.fn(),
}));
vi.mock("@/pages/home/home-components/job-card/JobCards", () => ({
  JobCard: ({ job }: any) => <div data-testid={`job-${job.id}`}>{job.title}</div>
}));

describe("useKanbanJobs", () => {
  it("filters and sorts jobs correctly", () => {
    (useSettings as any).mockReturnValue({ reviewBehavior: "inline" });

    const jobs = [
      { id: "1", title: "Job 1", column: "applied", reviewNeeded: false },
      { id: "2", title: "Job 2", column: "applied", reviewNeeded: true },
      { id: "3", title: "Job 3", column: "interview", reviewNeeded: false }
    ] as any[];

    const columns = [
      { id: "applied", title: "Applied", bg: "" },
      { id: "interview", title: "Interview", bg: "" },
      { id: "review", title: "Review", bg: "" }
    ];

    const { result } = renderHook(() => useKanbanJobs({
      jobs,
      columns,
      matchOrderMap: new Map([["1", 1]]),
      hasSearch: true,
      openJobAppModal: vi.fn()
    }));

    const els = result.current;
    
    // applied should have 1 and 2, but 2 should be first because of reviewNeeded and inline behavior
    expect(els["applied"]).toBeDefined();
    expect(els["applied"].length).toBe(2);
    expect(els["interview"].length).toBe(1);
    expect(els["review"].length).toBe(1); // Job 2 has reviewNeeded: true, so it appears in review col as well
  });

  it("handles separate reviewBehavior", () => {
    (useSettings as any).mockReturnValue({ reviewBehavior: "separate" });

    const jobs = [
      { id: "1", title: "Job 1", column: "applied", reviewNeeded: false },
      { id: "2", title: "Job 2", column: "applied", reviewNeeded: true },
    ] as any[];

    const columns = [
      { id: "applied", title: "Applied", bg: "" },
      { id: "review", title: "Review", bg: "" }
    ];

    const { result } = renderHook(() => useKanbanJobs({
      jobs,
      columns,
      matchOrderMap: new Map(),
      hasSearch: false,
      openJobAppModal: vi.fn()
    }));

    const els = result.current;
    
    expect(els["applied"].length).toBe(1); // Only Job 1
    expect(els["review"].length).toBe(1); // Only Job 2
  });

  it("sorts jobs correctly based on matchOrderMap", () => {
    (useSettings as any).mockReturnValue({ reviewBehavior: "separate" });

    const jobs = [
      { id: "1", title: "Job 1", column: "applied", reviewNeeded: false },
      { id: "2", title: "Job 2", column: "applied", reviewNeeded: false },
      { id: "3", title: "Job 3", column: "applied", reviewNeeded: false },
      { id: "4", title: "Job 4", column: "applied", reviewNeeded: false },
    ] as any[];

    const columns = [{ id: "applied", title: "Applied", bg: "" }];

    // Match order: 3 should be first, 1 should be second. 2 and 4 are unmatched.
    const matchOrderMap = new Map([
      ["3", 1],
      ["1", 2]
    ]);

    const { result } = renderHook(() => useKanbanJobs({
      jobs,
      columns,
      matchOrderMap,
      hasSearch: true,
      openJobAppModal: vi.fn()
    }));

    const els = result.current["applied"];
    expect(els.length).toBe(4);
    
    // Check that dimmed prop is passed correctly
    expect(els[0].props.job.id).toBe("3");
    expect(els[0].props.dimmed).toBe(false);
    expect(els[1].props.job.id).toBe("1");
    expect(els[1].props.dimmed).toBe(false);
    
    // 2 and 4 should be sorted after matched ones and should be dimmed
    expect(["2", "4"]).toContain(els[2].props.job.id);
    expect(["2", "4"]).toContain(els[3].props.job.id);
    expect(els[2].props.dimmed).toBe(true);
    expect(els[3].props.dimmed).toBe(true);
  });

  it("sorts by order in matchOrderMap when both are matched", () => {
    (useSettings as any).mockReturnValue({ reviewBehavior: "separate" });

    const jobs = [
      { id: "1", column: "applied" },
      { id: "2", column: "applied" },
    ] as any[];

    const columns = [{ id: "applied", title: "Applied", bg: "" }];

    // Job 2 comes before Job 1 in match results
    const matchOrderMap = new Map([
      ["2", 1],
      ["1", 2]
    ]);

    const { result } = renderHook(() => useKanbanJobs({
      jobs,
      columns,
      matchOrderMap,
      hasSearch: true,
      openJobAppModal: vi.fn()
    }));

    const els = result.current["applied"];
    expect(els[0].props.job.id).toBe("2");
    expect(els[1].props.job.id).toBe("1");
  });
});
