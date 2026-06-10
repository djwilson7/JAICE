import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useJobCardDrag } from "./useJobCardDrag";
import { writeJobsToDB } from "@/global-services/writeJobsToDB";
import { useDrag } from "@/pages/home/hooks/useDrag";
import { useSelectedJobs } from "@/pages/home/hooks/useSelectedJobs";
import { useIsMultiSelecting } from "@/pages/home/hooks/useIsMultiSelecting";
import { useBannerNotifications } from "@/global-components/bannerNotificationContext";
import { getJobsMovingToColumn } from "@/pages/home/utils/jobDisplayColumn";

vi.mock("@/global-services/writeJobsToDB", () => ({
  writeJobsToDB: vi.fn(),
}));

vi.mock("@/global-components/bannerNotificationContext", () => ({
  useBannerNotifications: vi.fn(),
}));

vi.mock("@/pages/home/hooks/useDrag", () => ({
  useDrag: vi.fn(),
}));

vi.mock("@/pages/home/hooks/useJobMutation", () => ({
  useJobMutation: () => ({ mutateJob: vi.fn() }),
}));

vi.mock("@/pages/home/hooks/useUndoRedo", () => ({
  useUndoRedo: () => ({ pushUndo: vi.fn() }),
}));

vi.mock("@/pages/home/hooks/useSelectedJobs", () => ({
  useSelectedJobs: vi.fn(),
}));

vi.mock("@/pages/home/hooks/useIsMultiSelecting", () => ({
  useIsMultiSelecting: vi.fn(),
}));

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: () => ({ settings: { appearance: { kanbanCompact: false } }, reviewBehavior: "review" }),
}));

vi.mock("@/pages/home/utils/jobDisplayColumn", () => ({
  getJobDisplayColumn: vi.fn().mockReturnValue("applied"),
  getJobsMovingToColumn: vi.fn((jobs, target) => jobs.map((j: any) => ({ ...j, column: target }))),
}));

describe("useJobCardDrag", () => {
  let mockSetIsDragging: any, mockSetDraggedId: any, mockSetDraggedJobs: any;
  let mockSetDragPoint: any, mockSetDragTarget: any, mockSetDragStart: any;
  let mockShowBanner: any, mockSetSelectedJobs: any, mockSetIsMultiSelecting: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetIsDragging = vi.fn();
    mockSetDraggedId = vi.fn();
    mockSetDraggedJobs = vi.fn();
    mockSetDragPoint = vi.fn();
    mockSetDragTarget = vi.fn();
    mockSetDragStart = vi.fn();
    mockShowBanner = vi.fn();
    mockSetSelectedJobs = vi.fn();
    mockSetIsMultiSelecting = vi.fn();

    (useDrag as any).mockReturnValue({
      setIsDragging: mockSetIsDragging,
      setDraggedId: mockSetDraggedId,
      setDraggedJobs: mockSetDraggedJobs,
      setDragPoint: mockSetDragPoint,
      setDragTarget: mockSetDragTarget,
      setDragStart: mockSetDragStart,
    });
    
    (useSelectedJobs as any).mockReturnValue({
      selectedJobs: [],
      setSelectedJobs: mockSetSelectedJobs,
    });
    
    (useIsMultiSelecting as any).mockReturnValue({
      isMultiSelecting: false,
      setIsMultiSelecting: mockSetIsMultiSelecting,
    });

    (useBannerNotifications as any).mockReturnValue({
      showBanner: mockShowBanner,
    });

    document.elementFromPoint = vi.fn().mockReturnValue(null);
  });

  it("should initialize without crashing", () => {
    const job = { id: "job-1", title: "Test Job", company: "Company", stage: "applied" } as any;
    const { result } = renderHook(() => useJobCardDrag(job));
    expect(result.current).toBeTruthy();
    expect(typeof result.current.onPointerDown).toBe("function");
  });

  it("should ignore interactive elements", () => {
    const job = { id: "job-1", title: "Test Job", company: "Company", stage: "applied" } as any;
    const { result } = renderHook(() => useJobCardDrag(job));
    const button = document.createElement("button");
    const event = { button: 0, target: button } as any;
    result.current.onPointerDown(event);
    expect(mockSetIsDragging).not.toHaveBeenCalled();
  });

  it("should ignore non-primary mouse button", () => {
    const job = { id: "job-1" } as any;
    const { result } = renderHook(() => useJobCardDrag(job));
    const div = document.createElement("div");
    const event = { button: 1, target: div } as any;
    result.current.onPointerDown(event);
    expect(mockSetIsDragging).not.toHaveBeenCalled();
  });

  it("should start drag on sufficient movement", () => {
    const job = { id: "job-1", title: "Test Job", company: "Company", stage: "applied" } as any;
    const { result } = renderHook(() => useJobCardDrag(job));
    
    const div = document.createElement("div");
    const event = { button: 0, target: div, pointerId: 1, clientX: 0, clientY: 0, preventDefault: vi.fn() } as any;
    
    result.current.onPointerDown(event);
    
    // Simulate pointer move
    const moveEvent = new PointerEvent("pointermove", { pointerId: 1, clientX: 5, clientY: 5 });
    Object.defineProperty(moveEvent, "preventDefault", { value: vi.fn() });
    
    act(() => {
      window.dispatchEvent(moveEvent);
    });

    expect(mockSetIsDragging).toHaveBeenCalledWith(true);
    expect(mockSetDraggedId).toHaveBeenCalledWith("job-1");
  });

  it("should handle finish drag successfully", async () => {
    const job = { id: "job-1", title: "Test Job", company: "Company", stage: "applied" } as any;
    const { result } = renderHook(() => useJobCardDrag(job));
    
    const div = document.createElement("div");
    const event = { button: 0, target: div, pointerId: 1, clientX: 0, clientY: 0, preventDefault: vi.fn() } as any;
    
    result.current.onPointerDown(event);
    
    const moveEvent = new PointerEvent("pointermove", { pointerId: 1, clientX: 5, clientY: 5 });
    Object.defineProperty(moveEvent, "preventDefault", { value: vi.fn() });
    act(() => { window.dispatchEvent(moveEvent); });

    document.elementFromPoint = vi.fn().mockReturnValue({
      closest: () => ({ dataset: { dragTarget: "interview" } })
    });
    
    (writeJobsToDB as any).mockResolvedValue({ status: "success" });

    const upEvent = new PointerEvent("pointerup", { pointerId: 1, clientX: 5, clientY: 5 });
    Object.defineProperty(upEvent, "preventDefault", { value: vi.fn() });
    
    await act(async () => {
      window.dispatchEvent(upEvent);
    });

    expect(writeJobsToDB).toHaveBeenCalled();
    expect(mockShowBanner).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }));
  });

  it("should handle multi-job drag successfully", async () => {
    (useSelectedJobs as any).mockReturnValue({
      selectedJobs: [{ id: "job-1", title: "Job 1" }, { id: "job-2", title: "Job 2" }],
      setSelectedJobs: mockSetSelectedJobs,
    });
    (useIsMultiSelecting as any).mockReturnValue({
      isMultiSelecting: true,
      setIsMultiSelecting: mockSetIsMultiSelecting,
    });

    const job = { id: "job-1", title: "Job 1" } as any;
    const { result } = renderHook(() => useJobCardDrag(job));
    
    const div = document.createElement("div");
    const event = { button: 0, target: div, pointerId: 1, clientX: 0, clientY: 0, preventDefault: vi.fn() } as any;
    result.current.onPointerDown(event);
    
    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 5, clientY: 5 }));
    });

    document.elementFromPoint = vi.fn().mockReturnValue({
      closest: () => ({ dataset: { dragTarget: "interview" } })
    });
    (writeJobsToDB as any).mockResolvedValue({ status: "success" });

    await act(async () => {
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1, clientX: 5, clientY: 5 }));
    });

    expect(writeJobsToDB).toHaveBeenCalled();
    expect(mockShowBanner).toHaveBeenCalledWith(expect.objectContaining({ 
      message: expect.stringContaining("2 jobs moved") 
    }));
  });

  it("should handle empty move list gracefully", async () => {
    (getJobsMovingToColumn as any).mockReturnValueOnce([]);
    const job = { id: "job-1" } as any;
    const { result } = renderHook(() => useJobCardDrag(job));
    
    const div = document.createElement("div");
    result.current.onPointerDown({ button: 0, target: div, pointerId: 1, clientX: 0, clientY: 0 } as any);
    
    act(() => { window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 5, clientY: 5 })); });
    
    document.elementFromPoint = vi.fn().mockReturnValue({
      closest: () => ({ dataset: { dragTarget: "interview" } })
    });

    await act(async () => {
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1, clientX: 5, clientY: 5 }));
    });

    expect(writeJobsToDB).not.toHaveBeenCalled();
    expect(mockSetIsDragging).toHaveBeenCalledWith(false);
  });

  it("should handle write failure in finishDrag", async () => {
    (writeJobsToDB as any).mockRejectedValue(new Error("DB error"));
    const job = { id: "job-1", title: "Job 1" } as any;
    const { result } = renderHook(() => useJobCardDrag(job));
    
    const div = document.createElement("div");
    result.current.onPointerDown({ button: 0, target: div, pointerId: 1, clientX: 0, clientY: 0 } as any);
    act(() => { window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 5, clientY: 5 })); });
    
    document.elementFromPoint = vi.fn().mockReturnValue({
      closest: () => ({ dataset: { dragTarget: "interview" } })
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1, clientX: 5, clientY: 5 }));
    });

    expect(mockShowBanner).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }));
    consoleSpy.mockRestore();
  });
});
