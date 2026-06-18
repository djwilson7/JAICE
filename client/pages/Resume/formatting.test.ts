import { describe, expect, it } from "vitest";
import { buildResumeRenderTokens } from "./formatting";
import { RESUME_CSS_DEFAULTS, RESUME_FORMATTING_CSS } from "./rendering/formattingTokens";

describe("resume formatting render tokens", () => {
    it("gives body and meta font sizes one shared meaning", () => {
        const tokens = buildResumeRenderTokens({
            bodyFontSize: 11.5,
            subHeaderFontSize: 13,
            headerFontSize: 17,
            titleFontSize: 27,
            pageMarginPt: 48,
            paperLayoutFormat: "relaxed",
            innerSectionGapFormat: "compact",
            pageSize: "letter"
        });

        const documentCssVariables = tokens.documentCssVariables as Record<string, string | number>;
        expect(documentCssVariables["--resume-body-font-size-pt"]).toBe("11.5");
        expect(documentCssVariables["--resume-body-font-size"]).toBe("15.33px");
        expect(documentCssVariables["--resume-subheader-font-size"]).toBe("17.33px");
        expect(documentCssVariables["--resume-header-font-size"]).toBe("22.67px");
        expect(documentCssVariables["--resume-title-font-size"]).toBe("36px");
        expect(documentCssVariables["--resume-title-line-height"]).toBe("1.1");
        expect(documentCssVariables["--resume-header-line-height"]).toBe("1.15");
        expect(documentCssVariables["--resume-subheader-line-height"]).toBe("1.2");
        expect(documentCssVariables["--resume-body-line-height"]).toBe("1.3");
        expect(tokens.bodyFontSizePx).toBeCloseTo(15.3333);
        expect(tokens.sectionGapPx).toBeCloseTo(21.3333);
        expect(tokens.innerSectionGapPx).toBeCloseTo(5.3333);
        expect(tokens.pageWidth).toBe("8.5in");
        expect(tokens.pageHeight).toBe("11in");
        expect(tokens.pageWidthPt).toBe(612);
        expect(tokens.pageHeightPt).toBe(792);
        expect(tokens.contentWidthPt).toBe(516);
        expect(tokens.contentHeightPt).toBe(696);
        expect(tokens.contentWidth).toBe(688);
    });

    it("normalizes invalid values before deriving render tokens", () => {
        const tokens = buildResumeRenderTokens({
            bodyFontSize: 100,
            subHeaderFontSize: -1,
            headerFontSize: Number.NaN,
            titleFontSize: 1,
            pageMarginPt: 999,
            paperLayoutFormat: "wide" as any,
            innerSectionGapFormat: "tight" as any,
            pageSize: "legal" as any
        });

        expect(tokens.formatting.bodyFontSize).toBe(15);
        expect(tokens.formatting.subHeaderFontSize).toBe(10);
        expect(tokens.formatting.headerFontSize).toBe(16);
        expect(tokens.formatting.titleFontSize).toBe(18);
        expect(tokens.formatting.pageMarginPt).toBe(72);
        expect(tokens.sectionGapPx).toBeCloseTo(16);
        expect(tokens.innerSectionGapPx).toBeCloseTo(10.6667);
        expect(tokens.paperMetrics.printName).toBe("A4");
    });

    it("loads visual defaults from the canonical CSS token source", () => {
        expect(RESUME_CSS_DEFAULTS).toEqual({
            titleFontSize: 24,
            headerFontSize: 16,
            subHeaderFontSize: 14,
            bodyFontSize: 12,
            pageMarginPt: 54
        });
        expect(RESUME_FORMATTING_CSS).toContain("--resume-standard-section-gap-pt: 12");
        expect(RESUME_FORMATTING_CSS).toContain(".resume-page-content");
    });
});
