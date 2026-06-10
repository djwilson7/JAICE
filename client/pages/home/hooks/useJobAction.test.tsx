import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useJobActions } from "./useJobAction";
import { useState } from "react";
import type { JobCardType } from "@/types/jobCardType";

const TestComponent = () => {
  const [jobs, setJobs] = useState<JobCardType[]>([
    { id: "1", title: "Job 1" } as JobCardType,
    { id: "2", title: "Job 2" } as JobCardType
  ]);
  const { saveJob } = useJobActions(setJobs);
  
  return (
    <div>
      <span data-testid="jobsCount">{jobs.length}</span>
      <div data-testid="jobTitles">{jobs.map(j => j.title).join(", ")}</div>
      <button data-testid="update" onClick={() => saveJob({ id: "1", title: "Updated" })}>Update</button>
      <button data-testid="add" onClick={() => saveJob({ title: "New" } as any)}>Add</button>
    </div>
  );
};

describe("useJobActions", () => {
  it("updates existing job if id is provided and leaves others alone", () => {
    render(<TestComponent />);
    
    act(() => {
      screen.getByTestId("update").click();
    });
    
    expect(screen.getByTestId("jobsCount").textContent).toBe("2");
    expect(screen.getByTestId("jobTitles").textContent).toContain("Updated");
    expect(screen.getByTestId("jobTitles").textContent).toContain("Job 2");
  });

  it("adds new job if no id is provided", () => {
    render(<TestComponent />);
    
    act(() => {
      screen.getByTestId("add").click();
    });
    
    expect(screen.getByTestId("jobsCount").textContent).toBe("3");
    expect(screen.getByTestId("jobTitles").textContent).toContain("New");
  });
});
