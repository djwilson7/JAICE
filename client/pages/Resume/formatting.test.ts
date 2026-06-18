import { describe, expect, it } from "vitest";
import { buildResumeRenderTokens } from "./formatting";

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
        expect(documentCssVariables["--resume-body-font-size"]).toBe("11.5pt");
        expect(documentCssVariables["--resume-subheader-font-size"]).toBe("13pt");
        expect(documentCssVariables["--resume-header-font-size"]).toBe("17pt");
        expect(documentCssVariables["--resume-title-font-size"]).toBe("27pt");
        expect(documentCssVariables["--resume-title-line-height"]).toBe("1.1");
        expect(documentCssVariables["--resume-header-line-height"]).toBe("1.15");
        expect(documentCssVariables["--resume-subheader-line-height"]).toBe("1.2");
        expect(documentCssVariables["--resume-body-line-height"]).toBe("1.3");
        expect(tokens.bodyTextStyle.fontSize).toBe("var(--resume-body-font-size)");
        expect(tokens.bodyTextStyle.lineHeight).toBe("var(--resume-body-line-height)");
        expect(tokens.contactTextStyle.fontSize).toBe("var(--resume-body-font-size)");
        expect(tokens.metaTextStyle.fontSize).toBe("var(--resume-subheader-font-size)");
        expect(tokens.metaTextStyle.lineHeight).toBe("var(--resume-subheader-line-height)");
        expect(tokens.headingStyle.fontSize).toBe("var(--resume-header-font-size)");
        expect(tokens.headingStyle.lineHeight).toBe("var(--resume-header-line-height)");
        expect(tokens.titleStyle.fontSize).toBe("var(--resume-title-font-size)");
        expect(tokens.titleStyle.lineHeight).toBe("var(--resume-title-line-height)");
        expect(tokens.bodyFontSizePx).toBeCloseTo(15.3333);
        expect(tokens.sectionGapPx).toBeCloseTo(21.3333);
        expect(tokens.innerSectionGapPx).toBeCloseTo(16);
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
});
