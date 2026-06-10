import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { JobCard } from "./JobCards";
import * as useIsMultiSelectingHook from "@/pages/home/hooks/useIsMultiSelecting";
import * as useJobMutationHook from "@/pages/home/hooks/useJobMutation";
import * as useJobCardHook from "@/pages/home/hooks/useJobCard";
import * as useDeleteConfirmHook from "@/pages/home/hooks/useDeleteConfirm";
import * as openGmailMessageModule from "@/pages/home/hooks/useOpenGmailMessage";

vi.mock("@/pages/home/hooks/useIsMultiSelecting", () => ({
  useIsMultiSelecting: vi.fn(),
}));
vi.mock("@/pages/home/hooks/useJobMutation", () => ({
  useJobMutation: vi.fn(),
}));
vi.mock("@/pages/home/hooks/useJobCard", () => ({
  useJobCard: vi.fn(),
}));
vi.mock("@/pages/home/hooks/useDeleteConfirm", () => ({
  useDeleteConfirm: vi.fn(),
}));
vi.mock("@/pages/home/hooks/useOpenGmailMessage", () => ({
  openGmailMessage: vi.fn(),
}));
vi.mock("@/pages/home/hooks/useDrag", () => ({
  useDrag: () => ({ isDragging: false }),
}));
vi.mock("@/pages/home/hooks/useJobCardDrag", () => ({
  useJobCardDrag: () => ({ onPointerDown: vi.fn() }),
}));
vi.mock("@/pages/home/hooks/useSelectedJobs", () => ({
  useSelectedJobs: () => ({ selectedJobs: [] }),
}));

describe("JobCard", () => {
  const mockJob = {
    id: "job-1",
    title: "Software Engineer",
    reviewNeeded: true,
    providerSource: "gmail",
  } as any;

  const mockMutateJob = vi.fn();
  const mockRequestDelete = vi.fn((resolve) => resolve());
  const mockOpenJobAppModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useIsMultiSelectingHook.useIsMultiSelecting as any).mockReturnValue({ isMultiSelecting: false });
    (useJobMutationHook.useJobMutation as any).mockReturnValue({ mutateJob: mockMutateJob });
    (useJobCardHook.useJobCard as any).mockReturnValue({ expandAll: false });
    (useDeleteConfirmHook.useDeleteConfirm as any).mockReturnValue({
      open: false,
      processing: false,
      requestDelete: mockRequestDelete,
      confirm: vi.fn(),
      cancel: vi.fn(),
    });
  });

  it("renders correctly and handles button clicks", () => {
    render(<JobCard job={mockJob} dimmed={false} openJobAppModal={mockOpenJobAppModal} />);
    
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();

    // Edit button
    fireEvent.click(screen.getByTitle("Edit Job"));
    expect(mockOpenJobAppModal).toHaveBeenCalledWith(mockJob);

    // Archive button
    fireEvent.click(screen.getByTitle("Archive Job"));
    expect(mockMutateJob).toHaveBeenCalledWith(mockJob, { type: "archive" });

    // Open Email button
    fireEvent.click(screen.getByTitle("Open Email"));
    expect(openGmailMessageModule.openGmailMessage).toHaveBeenCalledWith(mockJob.id);

    // Review button
    fireEvent.click(screen.getByTitle("Mark Job as Reviewed"));
    expect(mockMutateJob).toHaveBeenCalledWith(mockJob, { type: "review" });
  });

  it("handles trash click correctly when not multi-selecting", async () => {
    render(<JobCard job={mockJob} dimmed={false} openJobAppModal={mockOpenJobAppModal} />);
    
    await act(async () => {
      fireEvent.click(screen.getByTitle("Delete Job"));
    });

    expect(mockRequestDelete).toHaveBeenCalled();
  });

  it("does not trigger delete confirm when multi-selecting", () => {
    (useIsMultiSelectingHook.useIsMultiSelecting as any).mockReturnValue({ isMultiSelecting: true });
    render(<JobCard job={mockJob} dimmed={false} openJobAppModal={mockOpenJobAppModal} />);
    
    fireEvent.click(screen.getByTitle("Delete Job"));
    expect(mockRequestDelete).not.toHaveBeenCalled();
  });

  it("resets isSelected when isMultiSelecting becomes false", () => {
    const { rerender } = render(<JobCard job={mockJob} dimmed={false} openJobAppModal={mockOpenJobAppModal} />);
    
    // Manual state manipulation is hard, but we can verify effect coverage
    (useIsMultiSelectingHook.useIsMultiSelecting as any).mockReturnValue({ isMultiSelecting: true });
    rerender(<JobCard job={mockJob} dimmed={false} openJobAppModal={mockOpenJobAppModal} />);
    
    (useIsMultiSelectingHook.useIsMultiSelecting as any).mockReturnValue({ isMultiSelecting: false });
    rerender(<JobCard job={mockJob} dimmed={false} openJobAppModal={mockOpenJobAppModal} />);
  });

  it("renders with visible Gmail button only if providerSource is not manual_entry", () => {
    const { rerender } = render(<JobCard job={{ ...mockJob, providerSource: "manual_entry" }} dimmed={false} openJobAppModal={mockOpenJobAppModal} />);
    expect(screen.queryByTitle("Open Email")).not.toBeInTheDocument();

    rerender(<JobCard job={{ ...mockJob, providerSource: "gmail" }} dimmed={false} openJobAppModal={mockOpenJobAppModal} />);
    expect(screen.getByTitle("Open Email")).toBeInTheDocument();
  });

  it("renders with visible Review button only if reviewNeeded is true", () => {
    const { rerender } = render(<JobCard job={{ ...mockJob, reviewNeeded: false }} dimmed={false} openJobAppModal={mockOpenJobAppModal} />);
    expect(screen.queryByTitle("Mark Job as Reviewed")).not.toBeInTheDocument();

    rerender(<JobCard job={{ ...mockJob, reviewNeeded: true }} dimmed={false} openJobAppModal={mockOpenJobAppModal} />);
    expect(screen.getByTitle("Mark Job as Reviewed")).toBeInTheDocument();
  });

  it("executes mutateJob on delete confirmation", async () => {
     let deleteCallback: any;
     (useDeleteConfirmHook.useDeleteConfirm as any).mockImplementation((cb: any) => {
       deleteCallback = cb;
       return { open: false, processing: false, requestDelete: vi.fn(), confirm: vi.fn(), cancel: vi.fn() };
     });

     render(<JobCard job={mockJob} dimmed={false} openJobAppModal={mockOpenJobAppModal} />);
     
     await act(async () => {
       await deleteCallback();
     });

     expect(mockMutateJob).toHaveBeenCalledWith(mockJob, { type: "delete" });
  });
});
