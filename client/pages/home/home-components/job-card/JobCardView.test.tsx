import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import JobCardView from "./JobCardView";
import * as formatInboxMessageModule from "@/pages/home/utils/formatInboxMessage";

vi.mock("@/pages/home/utils/formatInboxMessage", () => ({
  formatInboxMessage: vi.fn((text) => text),
}));
vi.mock("@/utils/getCSSVar", () => ({
  getCSSVar: () => "0.2",
}));

describe("JobCardView", () => {
  const mockJob = {
    id: "job-1",
    title: "Software Engineer",
    date: "Jan 1, 2023",
    description: "Job description here",
    notes: "Some notes",
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("renders basic job info correctly", () => {
    render(<JobCardView job={mockJob} />);
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Jan 1, 2023")).toBeInTheDocument();
    expect(screen.getByText("Job description here")).toBeInTheDocument();
    expect(screen.getByText("Some notes")).toBeInTheDocument();
  });

  it("toggles internal isOpen state when clicked without onClick prop", () => {
    render(<JobCardView job={mockJob} compact={true} />);
    expect(screen.queryByText("Job description here")).not.toBeInTheDocument();

    const card = screen.getByRole("button");
    fireEvent.click(card);
    expect(screen.getByText("Job description here")).toBeInTheDocument();
  });

  it("calls onClick prop when provided instead of toggling internal state", () => {
    const onClick = vi.fn();
    render(<JobCardView job={mockJob} onClick={onClick} />);
    
    const card = screen.getByRole("button");
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalled();
  });

  it("handles keyboard events (Enter and Space)", () => {
    render(<JobCardView job={mockJob} compact={true} />);
    const card = screen.getByRole("button");

    fireEvent.keyDown(card, { key: "Enter" });
    expect(screen.getByText("Job description here")).toBeInTheDocument();

    fireEvent.keyDown(card, { key: " " });
    expect(screen.queryByText("Job description here")).not.toBeInTheDocument();
  });

  it("renders leftSlot when provided", () => {
    render(<JobCardView job={mockJob} leftSlot={<span data-testid="left-slot">Slot</span>} />);
    expect(screen.getByTestId("left-slot")).toBeInTheDocument();
  });

  it("renders fallback message when description is empty", () => {
    (formatInboxMessageModule.formatInboxMessage as any).mockReturnValueOnce("");
    render(<JobCardView job={{ ...mockJob, description: "" }} />);
    expect(screen.getByText("No email content available.")).toBeInTheDocument();
  });
});
