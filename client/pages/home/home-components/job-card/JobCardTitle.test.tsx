import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { JobCardTitle } from "./JobCardTitle";
import * as useIsMultiSelectingHook from "@/pages/home/hooks/useIsMultiSelecting";
import * as useSelectedJobsHook from "@/pages/home/hooks/useSelectedJobs";
import * as useJobCardHook from "@/pages/home/hooks/useJobCard";
import * as writeJobsToDBModule from "@/global-services/writeJobsToDB";
import * as jobLocalChangeEventModule from "@/pages/home/utils/jobLocalChangeEvent";

// Mock framer-motion to simplify events
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, onTap, onClick, ...props }: any) => (
      <div {...props} onClick={onTap || onClick}>
        {children}
      </div>
    ),
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/pages/home/hooks/useIsMultiSelecting", () => ({
  useIsMultiSelecting: vi.fn(),
}));
vi.mock("@/pages/home/hooks/useSelectedJobs", () => ({
  useSelectedJobs: vi.fn(),
}));
vi.mock("@/pages/home/hooks/useJobCard", () => ({
  useJobCard: vi.fn(),
}));
vi.mock("@/global-services/writeJobsToDB", () => ({
  writeJobsToDB: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/pages/home/utils/jobLocalChangeEvent", () => ({
  dispatchJobLocalChange: vi.fn(),
}));
vi.mock("@/utils/getCSSVar", () => ({
  getCSSVar: () => "0.2s",
}));

describe("JobCardTitle", () => {
  const mockJob = {
    id: "job-1",
    title: "Software Engineer",
    receivedAtRaw: 1672531200000, 
    recentlyAdded: false,
  } as any;

  let mockSetLocalOpen: any;
  const mockSetIsSelected = vi.fn();
  const mockRegisterOpen = vi.fn();
  const mockRegisterClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetLocalOpen = vi.fn();
    (useIsMultiSelectingHook.useIsMultiSelecting as any).mockReturnValue({ isMultiSelecting: false });
    (useSelectedJobsHook.useSelectedJobs as any).mockReturnValue({ toggleJobSelection: vi.fn() });
    (useJobCardHook.useJobCard as any).mockReturnValue({
      expandAll: false,
      commandId: 0,
      registerOpen: mockRegisterOpen,
      registerClose: mockRegisterClose,
    });
  });

  it("renders the job title correctly", () => {
    render(<JobCardTitle job={mockJob} setLocalOpen={mockSetLocalOpen} isSelected={false} setIsSelected={mockSetIsSelected} isOpen={false} isHovered={false} />);
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
  });

  it("handles fallback date string in getDateParts", () => {
    const jobWithFallback = { ...mockJob, receivedAtRaw: null, date: "2023-01-01, 10:00 AM" };
    render(<JobCardTitle job={jobWithFallback} setLocalOpen={mockSetLocalOpen} isSelected={false} setIsSelected={mockSetIsSelected} isOpen={false} isHovered={false} />);
    expect(screen.getByText("2023-01-01")).toBeInTheDocument();
  });

  it("toggles open state and handles recentlyAdded", async () => {
    mockSetLocalOpen.mockImplementation((updater: any) => {
      if (typeof updater === 'function') updater(null);
    });

    const jobRecent = { ...mockJob, recentlyAdded: true };
    render(<JobCardTitle job={jobRecent} setLocalOpen={mockSetLocalOpen} isSelected={false} setIsSelected={mockSetIsSelected} isOpen={false} isHovered={false} />);
    
    const titleContainer = screen.getByTitle(/Click to open/i);
    fireEvent.click(titleContainer);

    expect(mockSetLocalOpen).toHaveBeenCalled();
    expect(jobLocalChangeEventModule.dispatchJobLocalChange).toHaveBeenCalled();
    expect(writeJobsToDBModule.writeJobsToDB).toHaveBeenCalled();
  });

  it("toggles job selection in multi-select mode", () => {
    (useIsMultiSelectingHook.useIsMultiSelecting as any).mockReturnValue({ isMultiSelecting: true });
    const toggleJobSelection = vi.fn();
    (useSelectedJobsHook.useSelectedJobs as any).mockReturnValue({ toggleJobSelection });

    render(<JobCardTitle job={mockJob} setLocalOpen={mockSetLocalOpen} isSelected={false} setIsSelected={mockSetIsSelected} isOpen={false} isHovered={false} />);
    
    const titleContainer = screen.getByTitle(/Click to open/i);
    fireEvent.click(titleContainer);

    expect(toggleJobSelection).toHaveBeenCalled();
    expect(mockSetIsSelected).toHaveBeenCalledWith(true);
  });

  it("registers open/close in useEffect", () => {
    const { rerender } = render(<JobCardTitle job={mockJob} isOpen={false} setLocalOpen={mockSetLocalOpen} isSelected={false} setIsSelected={mockSetIsSelected} isHovered={false} />);
    
    rerender(<JobCardTitle job={mockJob} isOpen={true} setLocalOpen={mockSetLocalOpen} isSelected={false} setIsSelected={mockSetIsSelected} isHovered={false} />);
    expect(mockRegisterOpen).toHaveBeenCalled();

    rerender(<JobCardTitle job={mockJob} isOpen={false} setLocalOpen={mockSetLocalOpen} isSelected={false} setIsSelected={mockSetIsSelected} isHovered={false} />);
    expect(mockRegisterClose).toHaveBeenCalled();
  });

  it("displays correct text in trash mode", () => {
    vi.spyOn(Date, 'now').mockReturnValue(mockJob.receivedAtRaw + (10 * 24 * 60 * 60 * 1000));
    render(<JobCardTitle job={mockJob} mode="trash" setLocalOpen={mockSetLocalOpen} isSelected={false} setIsSelected={mockSetIsSelected} isOpen={false} isHovered={false} />);
    expect(screen.getByText(/Deletes in \d+ days/)).toBeInTheDocument();
  });

  it("displays correct text in archive mode", () => {
    render(<JobCardTitle job={mockJob} mode="archive" setLocalOpen={mockSetLocalOpen} isSelected={false} setIsSelected={mockSetIsSelected} isOpen={false} isHovered={false} />);
    expect(screen.getByText(/Archived/i)).toBeInTheDocument();
  });

  it("displays 'Recently Added' when job is recent and not hovered", () => {
    const recentJob = { ...mockJob, recentlyAdded: true };
    render(<JobCardTitle job={recentJob} setLocalOpen={mockSetLocalOpen} isSelected={false} setIsSelected={mockSetIsSelected} isOpen={false} isHovered={false} />);
    expect(screen.getByText("Recently Added")).toBeInTheDocument();
  });

  it("displays 'Tap to Open' or 'Tap to Close' when hovered", () => {
    const { rerender } = render(<JobCardTitle job={mockJob} isHovered={true} isOpen={false} setLocalOpen={mockSetLocalOpen} isSelected={false} setIsSelected={mockSetIsSelected} />);
    expect(screen.getByText("Tap to Open")).toBeInTheDocument();

    rerender(<JobCardTitle job={mockJob} isHovered={true} isOpen={true} setLocalOpen={mockSetLocalOpen} isSelected={false} setIsSelected={mockSetIsSelected} />);
    expect(screen.getByText("Tap to Close")).toBeInTheDocument();
  });
});
