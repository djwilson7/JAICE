import { renderHook, act } from "@testing-library/react";
import { useJobSearchAndSort } from "./useJobSearchAndSort";
import { describe, it, expect } from "vitest";
import type { JobCardType } from "@/types/jobCardType";

const mockJobs: JobCardType[] = [
  {
    id: "1",
    title: "Software Engineer",
    companyName: "Acme Systems",
    column: "applied",
    receivedAtRaw: "2026-06-15T15:45:00",
  },
  {
    id: "2",
    title: "Product Manager",
    companyName: "Northstar Labs",
    column: "interview",
    receivedAtRaw: "2026-05-02T09:30:00",
  },
  {
    id: "3",
    title: "Designer",
    companyName: "Acme Studio",
    column: "offer",
    receivedAtRaw: "2026-04-03T11:15:00",
  },
  {
    id: "4",
    title: "Coder",
    companyName: "Example Company",
    column: "applied",
    receivedAtRaw: "2026-10-18T17:00:00",
  },
  {
    id: "5",
    title: "Marketing Coordinator",
    companyName: "Example Company",
    column: "rejected",
    receivedAtRaw: "2026-10-19T08:00:00",
  },
  {
    id: "6",
    title: "MySoftware Engineer",
    companyName: "Example Company",
    column: "interview",
    receivedAtRaw: "2026-09-01T08:00:00",
  },
];

describe("useJobSearchAndSort", () => {
  it("should return all jobs when search query is empty", () => {
    const { result } = renderHook(() => useJobSearchAndSort(mockJobs));
    expect(result.current.sortedJobs.length).toBe(6);
    expect(result.current.hasSearch).toBe(false);
    expect(result.current.matchScoreMap.size).toBe(6);
  });

  it("matches a partial job title", () => {
    const { result } = renderHook(() => useJobSearchAndSort(mockJobs));
    
    act(() => {
      result.current.setSearchQuery("soft");
    });

    expect(result.current.hasSearch).toBe(true);
    expect(result.current.matchScoreMap.has("1")).toBe(true);
    expect(result.current.matchScoreMap.has("2")).toBe(false);
  });

  it("does not match title typos that omit query characters", () => {
    const { result } = renderHook(() => useJobSearchAndSort(mockJobs));

    act(() => {
      result.current.setSearchQuery("sftware enginer");
    });

    expect(result.current.matchScoreMap.size).toBe(0);
  });

  it("requires the full query to be contiguous within one title", () => {
    const { result } = renderHook(() => useJobSearchAndSort(mockJobs));

    act(() => {
      result.current.setSearchQuery("coder");
    });

    expect(result.current.matchScoreMap.has("4")).toBe(true);
    expect(result.current.matchScoreMap.has("5")).toBe(false);
  });

  it("supports progressively narrower character matches", () => {
    const { result } = renderHook(() => useJobSearchAndSort(mockJobs));

    act(() => {
      result.current.setSearchQuery("co");
    });

    expect(result.current.matchScoreMap.has("4")).toBe(true);
    expect(result.current.matchScoreMap.has("5")).toBe(true);

    act(() => {
      result.current.setSearchQuery("cod");
    });

    expect(result.current.matchScoreMap.has("4")).toBe(true);
    expect(result.current.matchScoreMap.has("5")).toBe(false);
  });

  it("matches a contiguous suffix", () => {
    const { result } = renderHook(() => useJobSearchAndSort(mockJobs));

    act(() => {
      result.current.setSearchQuery("der");
    });

    expect(result.current.matchScoreMap.has("4")).toBe(true);
    expect(result.current.matchScoreMap.has("5")).toBe(false);
  });

  it("keeps multi-word queries contiguous", () => {
    const { result } = renderHook(() => useJobSearchAndSort(mockJobs));

    act(() => {
      result.current.setSearchQuery("software engine");
    });

    expect(result.current.matchScoreMap.has("1")).toBe(true);
    expect(result.current.matchScoreMap.has("6")).toBe(false);
    expect(result.current.matchScoreMap.size).toBe(1);
  });

  it("matches company names", () => {
    const { result } = renderHook(() => useJobSearchAndSort(mockJobs));

    act(() => {
      result.current.setSearchQuery("Acme");
    });

    expect(result.current.matchScoreMap.has("1")).toBe(true);
    expect(result.current.matchScoreMap.has("3")).toBe(true);
    expect(result.current.matchScoreMap.has("2")).toBe(false);
  });

  it("matches full month names against displayed dates", () => {
    const { result } = renderHook(() => useJobSearchAndSort(mockJobs));

    act(() => {
      result.current.setSearchQuery("June");
    });

    expect(result.current.matchScoreMap.has("1")).toBe(true);
    expect(result.current.matchScoreMap.has("2")).toBe(false);
    expect(result.current.matchScoreMap.has("4")).toBe(false);
    expect(result.current.matchScoreMap.has("5")).toBe(false);
  });

  it("matches displayed time text", () => {
    const { result } = renderHook(() => useJobSearchAndSort(mockJobs));

    act(() => {
      result.current.setSearchQuery("3:45 PM");
    });

    expect(result.current.matchScoreMap.has("1")).toBe(true);
    expect(result.current.matchScoreMap.has("2")).toBe(false);
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

    expect(result.current.matchScoreMap.size).toBe(0);
  });
});
