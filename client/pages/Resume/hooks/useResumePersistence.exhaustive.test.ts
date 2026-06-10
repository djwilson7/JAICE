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

    // 2. handleDeleteResume (ACTIVE one)
    act(() => { result.current.handleDeleteResume("m1", { stopPropagation: vi.fn() } as any); });
    await act(async () => { await result.current.confirmDeleteResume(); });
    expect(result.current.activeResumeId).toBeNull();

    // 3. handleSaveResume (create new since active is null)
    await act(async () => { await result.current.handleSaveResume(); });
    expect(resumeApi.createSavedResume).toHaveBeenCalled();

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
});
