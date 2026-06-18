import type React from "react";
import type { PageSize, PaperLayoutFormat, PaperMetrics, ResumeFormatting } from "./types";
import { RESUME_DOCUMENT_TYPOGRAPHY } from "./resumeTypography";
import { ptCss, ptToPx, pxToPt } from "./utils/documentUnits";

export const RESUME_DENSITY_PRESETS = {
    compact: {
        titleLineHeight: 1.0,
        headerLineHeight: 1.05,
        subHeaderLineHeight: 1.1,
        bodyLineHeight: 1.1,
        sectionGapPt: 8,
        innerSectionGapPt: 4
    },
    standard: {
        titleLineHeight: 1.05,
        headerLineHeight: 1.1,
        subHeaderLineHeight: 1.15,
        bodyLineHeight: 1.2,
        sectionGapPt: 12,
        innerSectionGapPt: 8
    },
    relaxed: {
        titleLineHeight: 1.1,
        headerLineHeight: 1.15,
        subHeaderLineHeight: 1.2,
        bodyLineHeight: 1.3,
        sectionGapPt: 16,
        innerSectionGapPt: 12
    }
} as const satisfies Record<PaperLayoutFormat, {
    titleLineHeight: number;
    headerLineHeight: number;
    subHeaderLineHeight: number;
    bodyLineHeight: number;
    sectionGapPt: number;
    innerSectionGapPt: number;
}>;

export const PAPER_SIZES: Record<PageSize, PaperMetrics> = {
    a4: {
        label: "A4",
        standardLabel: "Europe, Asia, etc.",
        widthPt: 595.28,
        heightPt: 841.89,
        width: ptToPx(595.28),
        height: ptToPx(841.89),
        printName: "A4",
        dimensionLabel: {
            width: "210 mm",
            height: "297 mm"
        }
    },
    letter: {
        label: "Letter",
        standardLabel: "US & Canada",
        widthPt: 612,
        heightPt: 792,
        width: ptToPx(612),
        height: ptToPx(792),
        printName: "Letter",
        dimensionLabel: {
            width: "8.5 in",
            height: "11 in"
        }
    }
};

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 1.4;
export const ZOOM_STEP = 0.1;
export const MIN_FIT_ZOOM = 0.25;
export const PAGE_STACK_GAP_PX = 24;


export const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
export const clampFitZoom = (value: number) => Math.min(1, Math.max(MIN_FIT_ZOOM, value));

export const defaultResumeFormatting = (): ResumeFormatting => ({
    pageSize: "a4",
    titleFontSize: 24,
    headerFontSize: 16,
    subHeaderFontSize: 14,
    bodyFontSize: 12,
    pageMarginPt: 54,
    paperLayoutFormat: "standard",
    innerSectionGapFormat: "standard"
});


export const normalizeResumeFormatting = (formatting?: Partial<ResumeFormatting> | null): ResumeFormatting => {
    const defaults = defaultResumeFormatting();
    const pageSize = formatting?.pageSize === "letter" || formatting?.pageSize === "a4" ? formatting.pageSize : defaults.pageSize;
    const paperLayoutFormat =
        formatting?.paperLayoutFormat === "compact" || formatting?.paperLayoutFormat === "standard" || formatting?.paperLayoutFormat === "relaxed"
            ? formatting.paperLayoutFormat
            : defaults.paperLayoutFormat;
    const innerSectionGapFormat =
        formatting?.innerSectionGapFormat === "compact" || formatting?.innerSectionGapFormat === "standard" || formatting?.innerSectionGapFormat === "relaxed"
            ? formatting.innerSectionGapFormat
            : defaults.innerSectionGapFormat;

    return {
        pageSize,
        titleFontSize: clampNumberValue(formatting?.titleFontSize, 18, 34, defaults.titleFontSize),
        headerFontSize: clampNumberValue(formatting?.headerFontSize, 12, 22, defaults.headerFontSize),
        subHeaderFontSize: clampNumberValue(formatting?.subHeaderFontSize, 10, 20, defaults.subHeaderFontSize),
        bodyFontSize: clampNumberValue(formatting?.bodyFontSize, 9, 15, defaults.bodyFontSize),
        pageMarginPt: clampNumberValue(formatting?.pageMarginPt, 24, 72, defaults.pageMarginPt),
        paperLayoutFormat,
        innerSectionGapFormat
    };
};

export const clampNumberValue = (value: unknown, min: number, max: number, fallback: number) => {
    const numberValue = typeof value === "number" && Number.isFinite(value) ? value : fallback;
    return Math.min(max, Math.max(min, numberValue));
};

export type ResumeRenderTokens = {
    formatting: ResumeFormatting;
    paperMetrics: PaperMetrics;
    pageWidth: string;
    pageHeight: string;
    documentCssVariables: React.CSSProperties;
    pageMarginPx: number;
    pageWidthPt: number;
    pageHeightPt: number;
    pageWidthPx: number;
    pageHeightPx: number;
    contentWidthPt: number;
    contentHeightPt: number;
    contentWidth: number;
    contentHeight: number;
    titleLineHeight: number;
    headerLineHeight: number;
    subHeaderLineHeight: number;
    bodyLineHeight: number;
    titleFontSizePx: number;
    headerFontSizePx: number;
    subHeaderFontSizePx: number;
    bodyFontSizePx: number;
    sectionGapPt: number;
    innerSectionGapPt: number;
    sectionGapPx: number;
    innerSectionGapPx: number;
    fieldPadding: string;
    titlePadding: string;
    titleStyle: React.CSSProperties;
    headingStyle: React.CSSProperties;
    bodyTextStyle: React.CSSProperties;
    contactTextStyle: React.CSSProperties;
    metaTextStyle: React.CSSProperties;
    sectionStyle: React.CSSProperties;
};

export const buildResumeRenderTokens = (
    formattingInput?: Partial<ResumeFormatting> | null,
    paperMetricsOverride?: PaperMetrics
): ResumeRenderTokens => {
    const formatting = normalizeResumeFormatting(formattingInput);
    const paperMetrics = paperMetricsOverride ?? PAPER_SIZES[formatting.pageSize];
    const pageWidth = formatting.pageSize === "a4" ? "210mm" : "8.5in";
    const pageHeight = formatting.pageSize === "a4" ? "297mm" : "11in";
    const pageWidthPt = paperMetrics.widthPt ?? pxToPt(paperMetrics.width);
    const pageHeightPt = paperMetrics.heightPt ?? pxToPt(paperMetrics.height);
    const pageWidthPx = ptToPx(pageWidthPt);
    const pageHeightPx = ptToPx(pageHeightPt);
    const pageMarginPx = ptToPx(formatting.pageMarginPt);
    const contentWidthPt = Math.max(1, pageWidthPt - formatting.pageMarginPt * 2);
    const contentHeightPt = Math.max(1, pageHeightPt - formatting.pageMarginPt * 2);
    const contentWidth = ptToPx(contentWidthPt);
    const contentHeight = ptToPx(contentHeightPt);
    const densityPreset = RESUME_DENSITY_PRESETS[formatting.paperLayoutFormat] ?? RESUME_DENSITY_PRESETS.standard;
    const titleLineHeight = densityPreset.titleLineHeight;
    const headerLineHeight = densityPreset.headerLineHeight;
    const subHeaderLineHeight = densityPreset.subHeaderLineHeight;
    const bodyLineHeight = densityPreset.bodyLineHeight;
    const sectionGapPt = densityPreset.sectionGapPt;
    const innerSectionGapPt = densityPreset.innerSectionGapPt;
    const sectionGapPx = ptToPx(sectionGapPt);
    const innerSectionGapPx = ptToPx(innerSectionGapPt);
    const titleFontSizePx = ptToPx(formatting.titleFontSize);
    const headerFontSizePx = ptToPx(formatting.headerFontSize);
    const subHeaderFontSizePx = ptToPx(formatting.subHeaderFontSize);
    const bodyFontSizePx = ptToPx(formatting.bodyFontSize);
    const fieldPadding = `${RESUME_DOCUMENT_TYPOGRAPHY.fieldVerticalPaddingPx}px ${RESUME_DOCUMENT_TYPOGRAPHY.fieldHorizontalPaddingPx}px`;
    const titlePadding = `${RESUME_DOCUMENT_TYPOGRAPHY.titleVerticalPaddingPx}px ${RESUME_DOCUMENT_TYPOGRAPHY.titleHorizontalPaddingPx}px`;
    const documentCssVariables = {
        "--resume-title-font-size": ptCss(formatting.titleFontSize),
        "--resume-header-font-size": ptCss(formatting.headerFontSize),
        "--resume-subheader-font-size": ptCss(formatting.subHeaderFontSize),
        "--resume-body-font-size": ptCss(formatting.bodyFontSize),
        "--resume-section-gap": ptCss(sectionGapPt),
        "--resume-inner-section-gap": ptCss(innerSectionGapPt),
        "--resume-title-line-height": String(titleLineHeight),
        "--resume-header-line-height": String(headerLineHeight),
        "--resume-subheader-line-height": String(subHeaderLineHeight),
        "--resume-body-line-height": String(bodyLineHeight),
        "--resume-line-height": String(bodyLineHeight),
        "--resume-page-margin": ptCss(formatting.pageMarginPt),
        "--resume-font-family": RESUME_DOCUMENT_TYPOGRAPHY.bodyFamily
    } as React.CSSProperties;

    const titleStyle: React.CSSProperties = {
        margin: "0 0 2px",
        padding: titlePadding,
        textAlign: "center",
        fontSize: "var(--resume-title-font-size)",
        lineHeight: "var(--resume-title-line-height)",
        fontFamily: RESUME_DOCUMENT_TYPOGRAPHY.titleFamily,
        fontWeight: RESUME_DOCUMENT_TYPOGRAPHY.strongWeight,
        color: "#0f172a"
    };
    const headingStyle: React.CSSProperties = {
        fontSize: "var(--resume-header-font-size)",
        lineHeight: "var(--resume-header-line-height)",
        margin: `0 0 ${RESUME_DOCUMENT_TYPOGRAPHY.sectionHeadingMarginBottomPx}px`,
        paddingBottom: RESUME_DOCUMENT_TYPOGRAPHY.sectionHeadingPaddingBottomPx,
        borderBottom: "1px solid #cbd5e1",
        fontFamily: RESUME_DOCUMENT_TYPOGRAPHY.sectionHeadingFamily,
        fontWeight: RESUME_DOCUMENT_TYPOGRAPHY.headingWeight,
        letterSpacing: 0,
        textTransform: "uppercase",
        color: "#0f172a",
        textAlign: "left"
    };
    const bodyTextStyle: React.CSSProperties = {
        fontSize: "var(--resume-body-font-size)",
        lineHeight: "var(--resume-body-line-height)",
        color: "#334155",
        fontFamily: "var(--resume-font-family)",
        fontWeight: RESUME_DOCUMENT_TYPOGRAPHY.bodyWeight,
        textAlign: "left",
        whiteSpace: "pre-wrap"
    };
    const contactTextStyle: React.CSSProperties = {
        fontSize: "var(--resume-body-font-size)",
        lineHeight: "var(--resume-body-line-height)",
        fontFamily: RESUME_DOCUMENT_TYPOGRAPHY.contactFamily,
        fontWeight: RESUME_DOCUMENT_TYPOGRAPHY.contactWeight,
        color: "#475569",
        textAlign: "center"
    };
    const metaTextStyle: React.CSSProperties = {
        fontSize: "var(--resume-subheader-font-size)",
        lineHeight: "var(--resume-subheader-line-height)",
        fontFamily: RESUME_DOCUMENT_TYPOGRAPHY.contactFamily,
        fontWeight: RESUME_DOCUMENT_TYPOGRAPHY.metaWeight,
        color: "#475569",
        textAlign: "left"
    };
    const sectionStyle: React.CSSProperties = {
        marginBottom: "var(--resume-section-gap)",
        textAlign: "left",
        width: "100%"
    };

    return {
        formatting,
        paperMetrics,
        pageWidth,
        pageHeight,
        documentCssVariables,
        pageMarginPx,
        pageWidthPt,
        pageHeightPt,
        pageWidthPx,
        pageHeightPx,
        contentWidthPt,
        contentHeightPt,
        contentWidth,
        contentHeight,
        titleLineHeight,
        headerLineHeight,
        subHeaderLineHeight,
        bodyLineHeight,
        titleFontSizePx,
        headerFontSizePx,
        subHeaderFontSizePx,
        bodyFontSizePx,
        sectionGapPt,
        innerSectionGapPt,
        sectionGapPx,
        innerSectionGapPx,
        fieldPadding,
        titlePadding,
        titleStyle,
        headingStyle,
        bodyTextStyle,
        contactTextStyle,
        metaTextStyle,
        sectionStyle
    };
};
