import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JobCardContainer } from "./JobCardContainer";
import * as useDragHook from "@/pages/home/hooks/useDrag";
import * as useSelectedJobsHook from "@/pages/home/hooks/useSelectedJobs";
import * as useIsMultiSelectingHook from "@/pages/home/hooks/useIsMultiSelecting";
import * as useJobCardDragHook from "@/pages/home/hooks/useJobCardDrag";

// Mock framer-motion to simplify events
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, onHoverStart, onHoverEnd, whileHover, whileTap, variants, animate, initial, ...props }: any) => (
      <div 
        {...props} 
        onMouseEnter={onHoverStart} 
        onMouseLeave={onHoverEnd}
      >
        {children}
      </div>
    ),
  },
  createPortal: (children: any) => children, // Mock createPortal for simplicity if needed
}));

vi.mock("@/pages/home/hooks/useJobCardDrag", () => ({
  useJobCardDrag: vi.fn(),
}));
vi.mock("@/pages/home/hooks/useSelectedJobs", () => ({
  useSelectedJobs: vi.fn(),
}));
vi.mock("@/pages/home/hooks/useIsMultiSelecting", () => ({
  useIsMultiSelecting: vi.fn(),
}));
vi.mock("@/pages/home/hooks/useDrag", () => ({
  useDrag: vi.fn(),
}));

describe("JobCardContainer", () => {
  const mockJob = { id: "job-1", reviewNeeded: false, applicationStage: "Applied" } as any;
  const mockSetIsHovered = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useJobCardDragHook.useJobCardDrag as any).mockReturnValue({ onPointerDown: vi.fn() });
    (useSelectedJobsHook.useSelectedJobs as any).mockReturnValue({ selectedJobs: [] });
    (useIsMultiSelectingHook.useIsMultiSelecting as any).mockReturnValue({ isMultiSelecting: false });
    (useDragHook.useDrag as any).mockReturnValue({ isDragging: false, draggedId: null, dragPoint: null });
  });

  it("renders correctly and handles hover", () => {
    render(
      <JobCardContainer job={mockJob} dimmed={false} setIsHovered={mockSetIsHovered} isSelected={false}>
        <div data-testid="child">Child</div>
      </JobCardContainer>
    );

    const container = screen.getByTestId("child").parentElement;
    expect(container).toBeInTheDocument();

    fireEvent.mouseEnter(container!);
    expect(mockSetIsHovered).toHaveBeenCalledWith(true);

    fireEvent.mouseLeave(container!);
    expect(mockSetIsHovered).toHaveBeenCalledWith(false);
  });

  it("renders with review class when job needs review", () => {
    render(
      <JobCardContainer job={{ ...mockJob, reviewNeeded: true }} dimmed={false} setIsHovered={mockSetIsHovered} isSelected={false}>
        <div data-testid="child" />
      </JobCardContainer>
    );
    const container = screen.getByTestId("child").parentElement;
    expect(container).toHaveClass("review");
  });

  it("shows stack clone when dragging and point exists", () => {
    (useDragHook.useDrag as any).mockReturnValue({
      isDragging: true,
      draggedId: "job-1",
      dragPoint: { x: 100, y: 100 },
    });

    const mockRect = { left: 10, top: 20, width: 200, height: 100 };
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(mockRect as any);

    render(
      <JobCardContainer job={mockJob} dimmed={false} setIsHovered={mockSetIsHovered} isSelected={false}>
        <div data-testid="child">Drag Clone</div>
      </JobCardContainer>
    );

    const children = screen.getAllByTestId("child");
    expect(children).toHaveLength(2);
  });

  it("calculates stack offset correctly for group dragging", () => {
    (useIsMultiSelectingHook.useIsMultiSelecting as any).mockReturnValue({ isMultiSelecting: true });
    (useSelectedJobsHook.useSelectedJobs as any).mockReturnValue({
      selectedJobs: [{ id: "other-job" }, { id: "job-1" }],
    });
    (useDragHook.useDrag as any).mockReturnValue({
      isDragging: true,
      draggedId: "other-job",
      dragPoint: { x: 100, y: 100 },
    });

    const mockRect = { left: 10, top: 20, width: 200, height: 100 };
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(mockRect as any);

    render(
      <JobCardContainer job={mockJob} dimmed={false} setIsHovered={mockSetIsHovered} isSelected={true}>
        <div data-testid="child" />
      </JobCardContainer>
    );

    const clones = screen.getAllByTestId("child");
    expect(clones).toHaveLength(2);
  });
});
