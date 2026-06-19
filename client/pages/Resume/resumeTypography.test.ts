import { describe, expect, it } from "vitest";
import { RESUME_DOCUMENT_TYPOGRAPHY } from "./resumeTypography";
import { RESUME_CSS_LAYOUT } from "./rendering/formattingTokens";

describe("resumeTypography", () => {
    it("exports RESUME_DOCUMENT_TYPOGRAPHY mapping to RESUME_CSS_LAYOUT", () => {
        expect(RESUME_DOCUMENT_TYPOGRAPHY).toBe(RESUME_CSS_LAYOUT);
    });
});
