import { describe, expect, it } from "vitest";
import {
  createDemoProcessingJobs,
  createDemoExploreJobs,
  createDemoSortedJobs,
  DEMO_EMAILS,
} from "./demoEmails";

describe("demo email data", () => {
  it("provides seven unique inbound emails with reusable stage signals", () => {
    expect(DEMO_EMAILS).toHaveLength(7);
    expect(new Set(DEMO_EMAILS.map((email) => email.id)).size).toBe(7);
    expect(
      new Set(DEMO_EMAILS.map((email) => email.detectedStage)).size
    ).toBeGreaterThan(2);
    expect(
      DEMO_EMAILS.every(
        (email) =>
          email.subject.length > 0 &&
          email.preview.length > 0 &&
          email.companyName.length > 0
      )
    ).toBe(true);
  });

  it("derives isolated Kanban records in the processing lane", () => {
    const first = createDemoProcessingJobs();
    const second = createDemoProcessingJobs();

    expect(first).toHaveLength(7);
    expect(first.every((job) => job.column === "staging")).toBe(true);
    expect(first.every((job) => job.providerSource === "gmail")).toBe(true);
    expect(first[0]).not.toBe(second[0]);
  });

  it("sorts the same email records into their detected stages", () => {
    const processing = createDemoProcessingJobs();
    const sorted = createDemoSortedJobs();

    expect(sorted.map((job) => job.id)).toEqual(
      processing.map((job) => job.id)
    );
    expect(sorted.every((job) => job.column !== "staging")).toBe(true);
    expect(new Set(sorted.map((job) => job.column)).size).toBeGreaterThan(2);
  });

  it("provides nineteen additional email cards for free exploration", () => {
    const exploreJobs = createDemoExploreJobs();

    expect(exploreJobs).toHaveLength(19);
    expect(new Set(exploreJobs.map((job) => job.id)).size).toBe(19);
    expect(exploreJobs.every((job) => job.column !== "staging")).toBe(true);
    expect(new Set(exploreJobs.map((job) => job.column)).size).toBe(5);
  });
});
