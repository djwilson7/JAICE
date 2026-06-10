import { renderHook } from "@testing-library/react";
import { useKanbanColumns } from "./useKanbanColumns";
import { useSettings } from "@/pages/settings/provider/settingsContext";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { JobCardType } from "@/types/jobCardType";

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: vi.fn(),
}));

describe("useKanbanColumns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show staging column if jobs exist', () => {
    (useSettings as any).mockReturnValue({
      reviewBehavior: "inline",
      selectedPrimaryColumn: "accepted",
      primaryColumnBehavior: "separate",
    });

    const jobs: JobCardType[] = [
      { id: "1", column: "staging" },
    ] as any[];

    const { result } = renderHook(() => useKanbanColumns(jobs));

    const staging = result.current.columns.find(c => c.id === "staging");

    expect(staging?.visible).toBe(true);
  });

  it('should hide staging column if no jobs exist', () => {
    (useSettings as any).mockReturnValue({
      reviewBehavior: "inline",
      selectedPrimaryColumn: "accepted",
      primaryColumnBehavior: "separate",
    });

    const jobs: JobCardType[] = [];

    const { result } = renderHook(() => useKanbanColumns(jobs));

    const staging = result.current.columns.find(c => c.id === "staging");

    expect(staging?.visible).toBe(false);
  });

  it("should handle unified primary column behavior", () => {
    (useSettings as any).mockReturnValue({
      reviewBehavior: "inline",
      selectedPrimaryColumn: "accepted",
      primaryColumnBehavior: "unified",
    });

    const { result } = renderHook(() => useKanbanColumns([]));

    const accepted = result.current.columns.find(c => c.id === "accepted");
    const rejected = result.current.columns.find(c => c.id === "rejected");

    expect(accepted?.visible).toBe(true);
    expect(rejected?.visible).toBe(false);
  });

  it("should handle dynamic review behavior", () => {
    (useSettings as any).mockReturnValue({
      reviewBehavior: "dynamic",
      selectedPrimaryColumn: "accepted",
      primaryColumnBehavior: "separate",
    });

    const { result: res1 } = renderHook(() => useKanbanColumns([{ reviewNeeded: true } as any]));
    expect(res1.current.columns.find(c => c.id === "review")?.visible).toBe(true);

    const { result: res2 } = renderHook(() => useKanbanColumns([{ reviewNeeded: false } as any]));
    expect(res2.current.columns.find(c => c.id === "review")?.visible).toBe(false);
  });
});
