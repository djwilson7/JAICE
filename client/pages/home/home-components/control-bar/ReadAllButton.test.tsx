import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ReadAllButton } from "./ReadAllButton";
import * as writeJobsToDBModule from "@/global-services/writeJobsToDB";

vi.mock("@/global-services/writeJobsToDB", () => ({
  writeJobsToDB: vi.fn().mockResolvedValue({}),
}));

describe("ReadAllButton", () => {
  const mockJobs = [
    { id: "1", title: "Job 1", recentlyAdded: true },
    { id: "2", title: "Job 2", recentlyAdded: false },
    { id: "3", title: "Job 3", recentlyAdded: true },
  ] as any[];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly with label", () => {
    render(<ReadAllButton jobs={mockJobs} />);
    expect(screen.getByText("Read All")).toBeInTheDocument();
  });

  it("renders correctly in compact mode", () => {
    render(<ReadAllButton jobs={mockJobs} compact={true} />);
    expect(screen.queryByText("Read All")).not.toBeInTheDocument();
  });

  it("is disabled when no unread jobs", () => {
    const { container } = render(<ReadAllButton jobs={[{ recentlyAdded: false } as any]} />);
    expect(container.firstChild).toHaveClass("opacity-50");
    expect(container.firstChild).toHaveClass("cursor-not-allowed");
  });

  it("calls writeJobsToDB with filtered unread jobs when clicked", async () => {
    render(<ReadAllButton jobs={mockJobs} />);
    const button = screen.getByRole("button");
    
    await act(async () => {
      fireEvent.click(button);
    });

    expect(writeJobsToDBModule.writeJobsToDB).toHaveBeenCalledWith({
      jobs_to_update: [
        { id: "1", title: "Job 1", recentlyAdded: false },
        { id: "3", title: "Job 3", recentlyAdded: false },
      ],
    });
  });

  it("handles writeJobsToDB error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (writeJobsToDBModule.writeJobsToDB as any).mockRejectedValueOnce(new Error("Fail"));

    render(<ReadAllButton jobs={mockJobs} />);
    const button = screen.getByRole("button");

    await act(async () => {
      fireEvent.click(button);
    });

    expect(consoleSpy).toHaveBeenCalledWith("Failed to mark all as read:", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("does nothing if already updating", async () => {
    let resolvePromise: any;
    (writeJobsToDBModule.writeJobsToDB as any).mockReturnValueOnce(new Promise(res => resolvePromise = res));

    render(<ReadAllButton jobs={mockJobs} />);
    const button = screen.getByRole("button");

    act(() => {
      fireEvent.click(button);
    });
    
    // Second click while isUpdating is true
    act(() => {
      fireEvent.click(button);
    });

    expect(writeJobsToDBModule.writeJobsToDB).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePromise({});
    });
  });
});
