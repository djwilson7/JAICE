import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultResumeFormatting } from "../formatting";
import { defaultResumeData } from "../resumeData";
import * as resumeApi from "../resumeApi";
import { useResumePersistence } from "./useResumePersistence";

vi.mock("@/global-services/projectMode", () => ({ IS_DEMO_MODE: true }));
vi.mock("../resumeApi");

describe("useResumePersistence in demo mode", () => {
  it("starts with a local document without loading saved resumes", () => {
    const { result } = renderHook(() =>
      useResumePersistence({
        resumeData: defaultResumeData(),
        setResumeData: vi.fn(),
        currentResumeFormatting: defaultResumeFormatting(),
        applyResumeFormatting: vi.fn(),
        resetDraftState: vi.fn(),
        error: null,
        setError: vi.fn(),
        successMessage: null,
        setSuccessMessage: vi.fn(),
      })
    );

    expect(result.current.loadingList).toBe(false);
    expect(result.current.initialLoadState).toBe("loaded");
    expect(result.current.resumesList).toEqual([]);
    expect(resumeApi.listSavedResumes).not.toHaveBeenCalled();
  });
});
