import { describe, it, expect } from "vitest";
import { normalizeColumn, getJobDisplayColumn, getJobsMovingToColumn } from "./jobDisplayColumn";
import type { JobCardType } from "@/types/jobCardType";
import type { ReviewBehavior } from "@/pages/settings/provider/settingsTypes";

describe("jobDisplayColumn", () => {
  describe("normalizeColumn", () => {
    it("trims and lowercases", () => {
      expect(normalizeColumn(" INbox ")).toBe("inbox");
      expect(normalizeColumn(undefined)).toBe("");
    });
  });

  describe("getJobDisplayColumn", () => {
    it("returns review if reviewNeeded is true and behavior is not inline", () => {
      const job = { reviewNeeded: true, column: "inbox" } as JobCardType;
      expect(getJobDisplayColumn(job, "review_column")).toBe("review");
    });

    it("returns column if reviewNeeded is true but behavior is inline", () => {
      const job = { reviewNeeded: true, column: "inbox" } as JobCardType;
      expect(getJobDisplayColumn(job, "inline")).toBe("inbox");
    });

    it("returns column if reviewNeeded is false", () => {
      const job = { reviewNeeded: false, column: "Applied" } as JobCardType;
      expect(getJobDisplayColumn(job, "review_column")).toBe("applied");
    });
  });

  describe("getJobsMovingToColumn", () => {
    it("filters jobs that are not already in the target column", () => {
      const jobs = [
        { id: "1", column: "inbox", reviewNeeded: false },
        { id: "2", column: "applied", reviewNeeded: false },
        { id: "3", column: "inbox", reviewNeeded: true },
      ] as JobCardType[];

      // target: inbox
      // job 1: inbox
      // job 2: applied
      // job 3: review (if behavior is review_column)
      const movingToInbox = getJobsMovingToColumn(jobs, "inbox", "review_column");
      expect(movingToInbox).toHaveLength(2);
      expect(movingToInbox.map(j => j.id)).toEqual(["2", "3"]);

      const movingToInboxInline = getJobsMovingToColumn(jobs, "inbox", "inline");
      expect(movingToInboxInline).toHaveLength(1);
      expect(movingToInboxInline.map(j => j.id)).toEqual(["2"]);
    });
  });
});
