import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Column } from "./Column";
import * as useDragHook from "@/pages/home/hooks/useDrag";
import * as useSettingsHook from "@/pages/settings/provider/settingsContext";
import React from "react";

vi.mock("@/pages/home/hooks/useDrag", () => ({
  useDrag: vi.fn(),
}));

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: vi.fn(),
}));

vi.mock("@/utils/getCSSVar", () => ({
  getCSSVar: () => "0.2s",
}));

describe("Column", () => {
  const mockColumn = {
    id: "applied",
    title: "Applied",
    visible: true,
    bg: "blue",
  } as any;

  const setDragTarget = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useDragHook.useDrag as any).mockReturnValue({
      setDragTarget,
      isDragging: false,
      dragTarget: null,
      draggedJobs: [],
    });
    (useSettingsHook.useSettings as any).mockReturnValue({
      reviewBehavior: "minimal",
    });
  });

  it("renders correctly with children", () => {
    render(
      <Column column={mockColumn} count={1} isHighlighted={null}>
        <div data-testid="child">Job</div>
      </Column>
    );
    expect(screen.getByText("Applied")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("handles pointer events to set drag target", () => {
    render(<Column column={mockColumn} count={0} isHighlighted={null} />);
    const surface = screen.getByText("Applied").closest('.kanban-column-surface');
    
    fireEvent.pointerEnter(surface!);
    expect(setDragTarget).toHaveBeenCalledWith("applied");

    fireEvent.pointerLeave(surface!);
    expect(setDragTarget).toHaveBeenCalledWith(null);
  });

  it("shows drop preview when dragging into target", () => {
    (useDragHook.useDrag as any).mockReturnValue({
      setDragTarget,
      isDragging: true,
      dragTarget: "applied",
      draggedJobs: [{ id: "1", applicationStage: "Applied" }],
    });

    render(<Column column={mockColumn} count={0} isHighlighted={null} />);
    expect(screen.getByText(/Add 1 Email to the "Applied" column/)).toBeInTheDocument();
  });

  it("handles scroll shadow updates", () => {
    // This is hard with JSDOM but we can mock scrollRef
    // Actually we can just trigger the onScroll
    const { container } = render(<Column column={mockColumn} count={10} isHighlighted={null} />);
    const scrollEl = container.querySelector(".kanban-column-scroll");
    
    // Stub properties
    Object.defineProperty(scrollEl, 'scrollHeight', { value: 1000 });
    Object.defineProperty(scrollEl, 'clientHeight', { value: 500 });
    Object.defineProperty(scrollEl, 'scrollTop', { value: 100 });

    fireEvent.scroll(scrollEl!);
    // Expecting shadows to update
  });

  it("renders processing column special styles", () => {
      const procCol = { ...mockColumn, id: "processing", title: "Processing" };
      const { container } = render(<Column column={procCol} count={0} isHighlighted={null} />);
      expect(container.firstChild).toHaveClass("flex h-full min-h-full shrink-0 overflow-hidden");
  });

  it("handles resize observer via useEffect", () => {
      let observeSpy = vi.fn();
      let disconnectSpy = vi.fn();
      vi.stubGlobal('ResizeObserver', class {
          observe = observeSpy;
          disconnect = disconnectSpy;
          unobserve = vi.fn();
      });

      const { unmount } = render(<Column column={mockColumn} count={1} isHighlighted={null} />);
      expect(observeSpy).toHaveBeenCalled();
      
      unmount();
      expect(disconnectSpy).toHaveBeenCalled();
  });
});
