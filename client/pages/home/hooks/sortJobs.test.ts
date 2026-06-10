import { describe, it, expect } from "vitest";
import { sortJobs } from "./sortJobs";
import type { JobCardType } from "@/types/jobCardType";

describe("sortJobs", () => {
  const jobs: JobCardType[] = [
    { id: "1", title: "Zebra", date: "2023-10-01T12:00:00Z", column: "inbox" } as JobCardType,
    { id: "2", title: "Apple", date: "2023-10-02T12:00:00Z", column: "inbox" } as JobCardType,
    { id: "3", title: "Mango", date: "2023-09-30T12:00:00Z", column: "inbox" } as JobCardType,
  ];

  it("sorts by new", () => {
    const result = sortJobs("new", jobs);
    expect(result[0].id).toBe("2"); // Oct 2
    expect(result[1].id).toBe("1"); // Oct 1
    expect(result[2].id).toBe("3"); // Sep 30
  });

  it("sorts by old", () => {
    const result = sortJobs("old", jobs);
    expect(result[0].id).toBe("3");
    expect(result[1].id).toBe("1");
    expect(result[2].id).toBe("2");
  });

  it("sorts az", () => {
    const result = sortJobs("az", jobs);
    expect(result[0].title).toBe("Apple");
    expect(result[1].title).toBe("Mango");
    expect(result[2].title).toBe("Zebra");
  });

  it("sorts za", () => {
    const result = sortJobs("za", jobs);
    expect(result[0].title).toBe("Zebra");
    expect(result[1].title).toBe("Mango");
    expect(result[2].title).toBe("Apple");
  });

  it("handles missing dates", () => {
    const jobsWithMissingDates: JobCardType[] = [
      { id: "1", title: "A", date: "2023-10-01T12:00:00Z", column: "inbox" } as JobCardType,
      { id: "2", title: "B", date: undefined, column: "inbox" } as JobCardType,
    ];
    // Should not crash and should treat missing date as empty string (invalid date -> NaN)
    // Actually, new Date("").getTime() is NaN. NaN - number is NaN.
    // Sort with NaN might be unstable but it shouldn't crash.
    const result = sortJobs("new", jobsWithMissingDates);
    expect(result.length).toBe(2);
    
    const resultOld = sortJobs("old", jobsWithMissingDates);
    expect(resultOld.length).toBe(2);
  });
});
