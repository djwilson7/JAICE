import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSelectedJobs } from "./useSelectedJobs";
import { SelectedJobsContext } from "../contexts/SelectedJobsContext";
import React from "react";

describe("useSelectedJobs", () => {
  it("throws error when used outside SelectedJobsProvider", () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useSelectedJobs())).toThrow(
      "useSelectedJobs must be used within a SelectedJobsProvider"
    );
    consoleSpy.mockRestore();
  });

  it("returns context value when used within SelectedJobsProvider", () => {
    const mockContextValue = { selectedJobs: ["1", "2"] } as any;
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SelectedJobsContext.Provider value={mockContextValue}>{children}</SelectedJobsContext.Provider>
    );

    const { result } = renderHook(() => useSelectedJobs(), { wrapper });
    expect(result.current).toEqual(mockContextValue);
  });
});
