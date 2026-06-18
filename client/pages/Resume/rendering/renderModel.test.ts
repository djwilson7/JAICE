import { describe, expect, it } from "vitest";
import fixtures from "../../../../common/resume_render/fixtures/render_models.json";
import type { ResumeData } from "../types";
import { buildResumeRenderModel } from "./renderModel";

describe("buildResumeRenderModel", () => {
    it.each(fixtures.cases)("$name matches the shared cross-stack fixture", ({ input, expected }) => {
        expect(buildResumeRenderModel(input as ResumeData)).toEqual(expected);
    });
});
