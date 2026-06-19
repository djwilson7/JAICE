import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultResumeFormatting } from "../formatting";
import type { ResumeData, SavedResume } from "../types";
import * as resumeApi from "../resumeApi";
import { useResumePersistence } from "./useResumePersistence";

vi.mock("../resumeApi");

const formatting = defaultResumeFormatting();
const makeResume = (id: string, isMaster: boolean, fullName: string): SavedResume => ({
    id,
    name: isMaster ? "Master" : "Version",
    is_master: isMaster,
    schema_version: 1,
    source_resume_id: isMaster ? null : "master",
    resume_data: { fullName, experience: [], education: [], skills: [], formatting },
    target_job_title: null,
    target_job_description: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
});

const master = makeResume("master", true, "Master Person");
const version = makeResume("version", false, "Version Person");

const makeProps = (resumeData: ResumeData) => ({
    resumeData,
    setResumeData: vi.fn(),
    currentResumeFormatting: formatting,
    applyResumeFormatting: vi.fn(),
    resetDraftState: vi.fn(),
    resetEditorTransientState: vi.fn(),
    resetFormatTransientState: vi.fn(),
    error: null,
    setError: vi.fn(),
    successMessage: null,
    setSuccessMessage: vi.fn(),
    autoSaveDelayMs: 100
});

const settleInitialLoad = async () => {
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
    });
};

describe("useResumePersistence version isolation", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        localStorage.clear();
        vi.mocked(resumeApi.listSavedResumes).mockResolvedValue({ status: "success", resumes: [master, version] });
    });

    afterEach(() => vi.useRealTimers());

    it("clears document-scoped transient state before loading another resume", async () => {
        const props = makeProps(master.resume_data);
        const { result, rerender } = renderHook(
            (currentProps) => useResumePersistence(currentProps),
            { initialProps: props }
        );
        await settleInitialLoad();
        vi.clearAllMocks();

        act(() => result.current.loadResumeIntoWorkspace(version));
        rerender({ ...props, resumeData: version.resume_data });

        expect(props.resetEditorTransientState).toHaveBeenCalledOnce();
        expect(props.resetFormatTransientState).toHaveBeenCalledOnce();
        expect(props.resetDraftState).toHaveBeenCalledOnce();
        expect(result.current.activeResumeId).toBe("version");
        expect(result.current.isDirty).toBe(false);
        const loaded = props.setResumeData.mock.calls.at(-1)?.[0] as ResumeData;
        expect(loaded).not.toBe(version.resume_data);
    });

    it("cancels a pending autosave timer when the active version changes", async () => {
        const initialProps = makeProps(master.resume_data);
        const { result, rerender } = renderHook(
            (props) => useResumePersistence(props),
            { initialProps }
        );
        await settleInitialLoad();

        rerender({ ...initialProps, resumeData: { ...master.resume_data, summary: "unsaved master edit" } });
        await act(async () => Promise.resolve());
        act(() => result.current.loadResumeIntoWorkspace(version));
        rerender({ ...initialProps, resumeData: version.resume_data });
        await act(async () => vi.advanceTimersByTimeAsync(200));

        expect(resumeApi.updateSavedResume).not.toHaveBeenCalled();
    });

    it("keeps a previous save response from overwriting the newly active version", async () => {
        let resolveSave!: (value: { status: "success"; resume: SavedResume }) => void;
        vi.mocked(resumeApi.updateSavedResume).mockImplementation(() => new Promise((resolve) => {
            resolveSave = resolve;
        }));
        const initialProps = makeProps(master.resume_data);
        const { result, rerender } = renderHook(
            (props) => useResumePersistence(props),
            { initialProps }
        );
        await settleInitialLoad();

        const editedMaster = { ...master.resume_data, summary: "master edit" };
        rerender({ ...initialProps, resumeData: editedMaster });
        await act(async () => Promise.resolve());
        let savePromise!: Promise<void>;
        act(() => {
            savePromise = result.current.handleSaveResume() as Promise<void>;
        });
        expect(resumeApi.updateSavedResume).toHaveBeenCalledWith("master", expect.anything());

        act(() => result.current.loadResumeIntoWorkspace(version));
        await act(async () => {
            resolveSave({ status: "success", resume: { ...master, resume_data: editedMaster } });
            await savePromise;
        });

        expect(result.current.activeResumeId).toBe("version");
        expect(initialProps.setSuccessMessage).not.toHaveBeenCalledWith("Resume saved successfully!");
        expect(initialProps.setResumeData.mock.calls.at(-1)?.[0]).toMatchObject({ fullName: "Version Person" });
    });
});
