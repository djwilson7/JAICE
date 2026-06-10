import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useDragEndHandler } from "./useOnDragEnd";
import { DragContext } from "@/pages/home/contexts/DragContext";
import { writeJobsToDB } from "@/global-services/writeJobsToDB";

vi.mock("@/global-services/writeJobsToDB", () => ({
  writeJobsToDB: vi.fn(),
}));

const getMockContext = () => ({
  draggedId: "1",
  dragTarget: "interview",
  dragStart: "applied",
  setIsDragging: vi.fn(),
  setDraggedId: vi.fn(),
  setDragTarget: vi.fn(),
  setDragStart: vi.fn(),
});

const TestComponent = ({ job }: any) => {
  const { processDragEnd } = useDragEndHandler({ job });
  return <button data-testid="dragend" onClick={processDragEnd}>DragEnd</button>;
};

describe("useOnDragEnd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes drag end successfully", async () => {
    (writeJobsToDB as any).mockResolvedValue(undefined);
    const mockContext = getMockContext();
    
    render(
      <DragContext.Provider value={mockContext as any}>
        <TestComponent job={{ id: "1", reviewNeeded: true, column: "applied" }} />
      </DragContext.Provider>
    );

    await act(async () => {
      screen.getByTestId("dragend").click();
    });

    expect(writeJobsToDB).toHaveBeenCalled();
    expect(mockContext.setIsDragging).toHaveBeenCalledWith(false);
  });

  it("returns early if dragTarget is same as dragStart", async () => {
    (writeJobsToDB as any).mockResolvedValue(undefined);
    const mockContext = getMockContext();
    mockContext.dragTarget = "applied";
    mockContext.dragStart = "applied";

    render(
      <DragContext.Provider value={mockContext as any}>
        <TestComponent job={{ id: "1" }} />
      </DragContext.Provider>
    );

    await act(async () => {
      screen.getByTestId("dragend").click();
    });

    expect(writeJobsToDB).not.toHaveBeenCalled();
    expect(mockContext.setIsDragging).toHaveBeenCalledWith(false);
  });

  it("handles writeJobsToDB failure", async () => {
    (writeJobsToDB as any).mockRejectedValue(new Error("Fail"));
    const mockContext = getMockContext();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <DragContext.Provider value={mockContext as any}>
        <TestComponent job={{ id: "1" }} />
      </DragContext.Provider>
    );

    await act(async () => {
      await screen.getByTestId("dragend").click();
    });

    expect(consoleSpy).toHaveBeenCalledWith("Drag end operation failed:", expect.any(Error));
    expect(mockContext.setIsDragging).toHaveBeenCalledWith(false);
    consoleSpy.mockRestore();
  });

  it("returns early if draggedId does not match job id", async () => {
    const mockContext = getMockContext();
    mockContext.draggedId = "2";

    render(
      <DragContext.Provider value={mockContext as any}>
        <TestComponent job={{ id: "1" }} />
      </DragContext.Provider>
    );

    await act(async () => {
      screen.getByTestId("dragend").click();
    });

    expect(writeJobsToDB).not.toHaveBeenCalled();
  });

  it("handles when context is null", () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestComponent job={{ id: "1" }} />)).toThrow("useDragEndHandler must be used within DragProvider");
    consoleSpy.mockRestore();
  });
});
