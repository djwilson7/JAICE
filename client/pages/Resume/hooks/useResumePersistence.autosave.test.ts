import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultResumeFormatting } from "../formatting";
import type { ResumeData } from "../types";
import * as resumeApi from "../resumeApi";
import { useResumePersistence } from "./useResumePersistence";

vi.mock("../resumeApi");

const savedResume = {
    id: "resume-1",
    name: "Primary Resume",
    is_master: true,
    schema_version: 1,
    source_resume_id: null,
    resume_data: {
        fullName: "Alice",
        experience: [],
        education: [],
        skills: [],
        formatting: defaultResumeFormatting()
    },
    target_job_title: null,
    target_job_description: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
};

const makeProps = (resumeData: ResumeData) => ({
    resumeData,
    setResumeData: vi.fn(),
    currentResumeFormatting: defaultResumeFormatting(),
    applyResumeFormatting: vi.fn(),
    resetDraftState: vi.fn(),
    error: null,
    setError: vi.fn(),
    successMessage: null,
    setSuccessMessage: vi.fn(),
    autoSaveDelayMs: 2500
});

describe("useResumePersistence auto-save", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.clear();
        vi.clearAllMocks();
        vi.mocked(resumeApi.listSavedResumes).mockResolvedValue({
            status: "success",
            resumes: [savedResume]
        });
        vi.mocked(resumeApi.updateSavedResume).mockResolvedValue({
            status: "success",
            resume: savedResume
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("saves once after the inactivity delay and resets when editing continues", async () => {
        const initialData = savedResume.resume_data as ResumeData;
        const { result, rerender } = renderHook(
            (props) => useResumePersistence(props),
            { initialProps: makeProps(initialData) }
        );

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        rerender(makeProps({ ...initialData, summary: "First edit" }));
        await act(async () => Promise.resolve());
        act(() => vi.advanceTimersByTime(2000));
        expect(resumeApi.updateSavedResume).not.toHaveBeenCalled();

        rerender(makeProps({ ...initialData, summary: "Continued edit" }));
        await act(async () => Promise.resolve());
        act(() => vi.advanceTimersByTime(2499));
        expect(resumeApi.updateSavedResume).not.toHaveBeenCalled();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1);
        });
        expect(resumeApi.updateSavedResume).toHaveBeenCalledTimes(1);
        expect(result.current.autoSaveEnabled).toBe(true);
    });

    it("does not auto-save when the control is disabled", async () => {
        localStorage.setItem("resume_auto_save_enabled", "false");
        const initialData = savedResume.resume_data as ResumeData;
        const { result, rerender } = renderHook(
            (props) => useResumePersistence(props),
            { initialProps: makeProps(initialData) }
        );

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });
        rerender(makeProps({ ...initialData, summary: "Local only" }));
        await act(async () => Promise.resolve());
        await act(async () => {
            await vi.advanceTimersByTimeAsync(3000);
        });

        expect(result.current.autoSaveEnabled).toBe(false);
        expect(resumeApi.updateSavedResume).not.toHaveBeenCalled();
    });
});
