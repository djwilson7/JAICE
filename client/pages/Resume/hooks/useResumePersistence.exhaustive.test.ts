import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useResumePersistence } from "./useResumePersistence";
import * as resumeApi from "../resumeApi";
import { defaultResumeFormatting } from "../formatting";

vi.mock("../resumeApi");

describe("useResumePersistence exhaustive", () => {
  const mockProps = {
    resumeData: { fullName: "Alice", formatting: {} } as any,
    setResumeData: vi.fn(),
    currentResumeFormatting: defaultResumeFormatting(),
    applyResumeFormatting: vi.fn(),
    resetDraftState: vi.fn(),
    error: null,
    setError: vi.fn(),
    successMessage: null,
    setSuccessMessage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (resumeApi.listSavedResumes as any).mockResolvedValue({ status: "success", resumes: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("covers all paths", async () => {
    const resumes = [
        { id: "m1", name: "Master", is_master: true, updated_at: "2023-01-01", resume_data: { fullName: "Alice", formatting: {} } },
        { id: "v1", name: "Ver 1", is_master: false, updated_at: "2023-01-02", resume_data: { fullName: "Alice", formatting: {} } }
    ];
    (resumeApi.listSavedResumes as any).mockResolvedValue({ status: "success", resumes });
    (resumeApi.createSavedResume as any).mockResolvedValue({ status: "success", resume: resumes[0] });
    (resumeApi.updateSavedResume as any).mockResolvedValue({ status: "success", resume: resumes[0] });
    (resumeApi.deleteSavedResume as any).mockResolvedValue({ status: "success" });

    const { result, rerender } = renderHook((p) => useResumePersistence(p), { initialProps: mockProps });

    // 1. Initial fetch
    await act(async () => { await vi.runAllTimersAsync(); });

    // 2. Master deletion is blocked; deleting an active version returns to master.
    act(() => { result.current.handleDeleteResume("m1", { stopPropagation: vi.fn() } as any); });
    expect(result.current.pendingDeleteResume).toBeNull();
    act(() => { result.current.loadResumeIntoWorkspace(resumes[1] as any); });
    act(() => { result.current.handleDeleteResume("v1", { stopPropagation: vi.fn() } as any); });
    await act(async () => { await result.current.confirmDeleteResume(); });
    expect(result.current.activeResumeId).toBe("m1");

    // 3. handleSaveResume targets the safely loaded master.
    act(() => { result.current.setIsDirty(true); });
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await result.current.handleSaveResume(); });
    expect(resumeApi.updateSavedResume).toHaveBeenCalled();

    // 4. Timer coverage for successMessage and error
    rerender({ ...mockProps, successMessage: "Done" });
    act(() => { vi.advanceTimersByTime(4001); });
    expect(mockProps.setSuccessMessage).toHaveBeenCalledWith(null);

    rerender({ ...mockProps, error: "Oops" });
    act(() => { vi.advanceTimersByTime(8001); });

    // 4. Timer coverage for successMessage and error
    rerender({ ...mockProps, successMessage: "Done" });
    act(() => { vi.advanceTimersByTime(4001); });
    expect(mockProps.setSuccessMessage).toHaveBeenCalledWith(null);

    rerender({ ...mockProps, error: "Oops" });
    act(() => { vi.advanceTimersByTime(8001); });
    expect(mockProps.setError).toHaveBeenCalledWith(null);

    // 5. handleCreateResume with clones
    await act(async () => { await result.current.handleCreateResume(true); });
    await act(async () => { await result.current.handleCreateResume(false, true); });

    // 6. isDirty with no activeSavedResume
    // Already hit because activeResumeId is null now.
  });

  it("covers delete master and delete error paths in confirmDeleteResume", async () => {
    const resumes = [
        { id: "v1", name: "Ver 1", is_master: false, updated_at: "2023-01-02", resume_data: { fullName: "Alice", formatting: {} } }
    ];
    (resumeApi.listSavedResumes as any).mockResolvedValue({ status: "success", resumes });
    (resumeApi.deleteSavedResume as any).mockRejectedValue(new Error("Delete failed"));

    const { result } = renderHook((p) => useResumePersistence(p), { initialProps: mockProps });

    // Initial fetch
    await act(async () => { await vi.runAllTimersAsync(); });

    // Set up pendingDeleteResume via handleDeleteResume
    act(() => { result.current.handleDeleteResume("v1", { stopPropagation: vi.fn() } as any); });
    expect(result.current.pendingDeleteResume).toBeDefined();

    // Mutate the pendingDeleteResume to make it master to trigger the early return branch
    act(() => {
      (result.current.pendingDeleteResume as any).is_master = true;
    });

    await act(async () => {
      await result.current.confirmDeleteResume();
    });
    expect(mockProps.setError).toHaveBeenCalledWith("The master resume cannot be deleted.");
    expect(result.current.pendingDeleteResume).toBeNull();

    // Now test the delete API failure path
    resumes[0].is_master = false;
    act(() => { result.current.handleDeleteResume("v1", { stopPropagation: vi.fn() } as any); });
    await act(async () => {
      await result.current.confirmDeleteResume();
    });
    expect(mockProps.setError).toHaveBeenCalledWith("Delete failed");
  });
});
