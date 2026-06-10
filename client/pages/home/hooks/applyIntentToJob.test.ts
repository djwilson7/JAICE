import { describe, it, expect } from "vitest";
import { applyJobIntentToJob } from "./applyIntentToJob";
import type { JobCardType } from "@/types/jobCardType";

describe("applyJobIntentToJob", () => {
  it("applies archive intent", () => {
    const job = { id: "1", isArchived: false, reviewNeeded: true } as JobCardType;
    const result = applyJobIntentToJob(job, { type: "archive" });
    
    expect(result.isArchived).toBe(true);
    expect(result.reviewNeeded).toBe(false);
  });

  it("applies delete intent", () => {
    const job = { id: "1", isDeleted: false, reviewNeeded: true } as JobCardType;
    const result = applyJobIntentToJob(job, { type: "delete" });
    
    expect(result.isDeleted).toBe(true);
    expect(result.reviewNeeded).toBe(false);
  });

  it("applies review intent", () => {
    const job = { id: "1", reviewNeeded: true } as JobCardType;
    const result = applyJobIntentToJob(job, { type: "review" });
    
    expect(result.reviewNeeded).toBe(false);
  });

  it("applies move intent", () => {
    const job = { id: "1", column: "inbox", reviewNeeded: true } as JobCardType;
    const result = applyJobIntentToJob(job, { type: "move", targetColumn: "applied" });
    
    expect(result.column).toBe("applied");
    expect(result.reviewNeeded).toBe(false);
  });
});
