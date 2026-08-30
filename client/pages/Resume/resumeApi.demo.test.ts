import { describe, expect, it, vi } from "vitest";
import {
  createSavedResume,
  deleteSavedResume,
  exportResumePdf,
  listSavedResumes,
  saveResumeRenderDiagnostics,
  streamResumeChatResponse,
  streamResumeTailorSuggestion,
  updateSavedResume,
} from "./resumeApi";
import { api, apiBlob } from "@/global-services/api";
import { defaultResumeData } from "./resumeData";

const authModuleLoaded = vi.hoisted(() => vi.fn());

vi.mock("@/global-services/projectMode", () => ({
  IS_DEMO_MODE: true,
}));

vi.mock("@/global-services/api", () => ({
  api: vi.fn(),
  apiBlob: vi.fn(),
}));

vi.mock("@/global-services/auth", () => {
  authModuleLoaded();
  return { getIdToken: vi.fn() };
});

describe("resume streaming in demo mode", () => {
  it("handles persistence and export operations locally", async () => {
    const resumeData = defaultResumeData();
    const payload = {
      name: "Demo Resume",
      is_master: true,
      source_resume_id: null,
      resume_data: resumeData,
    };

    await expect(listSavedResumes()).resolves.toEqual({
      status: "success",
      resumes: [],
    });
    await expect(createSavedResume(payload)).resolves.toMatchObject({
      status: "success",
      resume: { name: "Demo Resume", resume_data: resumeData },
    });
    await expect(
      updateSavedResume("resume-1", {
        name: "Updated Resume",
        is_master: false,
        resume_data: resumeData,
      })
    ).resolves.toMatchObject({
      status: "success",
      resume: { id: "resume-1", name: "Updated Resume" },
    });
    await expect(deleteSavedResume("resume-1")).resolves.toMatchObject({
      status: "success",
    });
    await expect(exportResumePdf(resumeData, "Demo Resume")).resolves.toMatchObject({
      filename: null,
      previewUrl: null,
    });
    await expect(saveResumeRenderDiagnostics({})).resolves.toMatchObject({
      status: "success",
    });

    expect(api).not.toHaveBeenCalled();
    expect(apiBlob).not.toHaveBeenCalled();
    expect(authModuleLoaded).not.toHaveBeenCalled();
  });

  it("rejects rewrite requests locally without loading auth or fetching", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      streamResumeTailorSuggestion({} as never, vi.fn())
    ).rejects.toThrow("unavailable in demo mode");

    expect(authModuleLoaded).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects chat requests locally without loading auth or fetching", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      streamResumeChatResponse({} as never, undefined, vi.fn(), vi.fn())
    ).rejects.toThrow("unavailable in demo mode");

    expect(authModuleLoaded).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
