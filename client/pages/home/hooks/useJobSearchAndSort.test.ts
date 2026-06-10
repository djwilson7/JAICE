import { renderHook, act } from "@testing-library/react";
import { useJobSearchAndSort } from "./useJobSearchAndSort";
import { describe, it, expect } from "vitest";
import type { JobCardType } from "@/types/jobCardType";

const mockJobs: JobCardType[] = [
  { id: "1", title: "Software Engineer", column: "applied", date: "2023-01-01" },
  { id: "2", title: "Product Manager", column: "interviewing", date: "2023-01-02" },
  { id: "3", title: "Designer", column: "offer", date: "2023-01-03" },
] as any[];

describe("useJobSearchAndSort", () => {
  it("should return all jobs when search query is empty", () => {
    const { result } = renderHook(() => useJobSearchAndSort(mockJobs));
    expect(result.current.sortedJobs.length).toBe(3);
    expect(result.current.hasSearch).toBe(false);
    expect(result.current.matchOrderMap.size).toBe(3);
  });

  it("should filter jobs based on search query", () => {
    const { result } = renderHook(() => useJobSearchAndSort(mockJobs));
    
    act(() => {
      result.current.setSearchQuery("Software");
    });

    expect(result.current.hasSearch).toBe(true);
    expect(result.current.matchOrderMap.size).toBe(1);
    expect(result.current.matchOrderMap.has("1")).toBe(true);
    expect(result.current.matchOrderMap.has("2")).toBe(false);
  });

  it("should update sort option", () => {
    const { result } = renderHook(() => useJobSearchAndSort(mockJobs));
    
    act(() => {
      result.current.setSortOption("new");
    });

    expect(result.current.sortOption).toBe("new");
    // Assuming sortJobs works correctly, we just check if it's called (it is in useMemo)
  });

  it("should handle no strong matches", () => {
    const { result } = renderHook(() => useJobSearchAndSort(mockJobs));
    
    act(() => {
      result.current.setSearchQuery("Zyxwvut"); // Something unlikely to match
    });

    expect(result.current.matchOrderMap.size).toBe(0);
  });
});
