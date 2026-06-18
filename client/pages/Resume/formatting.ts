import type React from "react";
import type { PageSize, PaperMetrics, ResumeFormatting } from "./types";
import { RESUME_RENDER_SPEC } from "./rendering/renderSpec";
import { RESUME_CSS_DEFAULTS, RESUME_CSS_DENSITY_PRESETS } from "./rendering/formattingTokens";
import { ptToPx, pxCss, pxToPt } from "./utils/documentUnits";

export const RESUME_DENSITY_PRESETS = RESUME_CSS_DENSITY_PRESETS;

export const PAPER_SIZES: Record<PageSize, PaperMetrics> = {
    a4: {
        ...RESUME_RENDER_SPEC.paperSizes.a4,
        width: ptToPx(RESUME_RENDER_SPEC.paperSizes.a4.widthPt),
        height: ptToPx(RESUME_RENDER_SPEC.paperSizes.a4.heightPt)
    },
    letter: {
        ...RESUME_RENDER_SPEC.paperSizes.letter,
        width: ptToPx(RESUME_RENDER_SPEC.paperSizes.letter.widthPt),
        height: ptToPx(RESUME_RENDER_SPEC.paperSizes.letter.heightPt)
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
    pageSize: RESUME_RENDER_SPEC.defaults.pageSize,
    paperLayoutFormat: RESUME_RENDER_SPEC.defaults.paperLayoutFormat,
    innerSectionGapFormat: RESUME_RENDER_SPEC.defaults.innerSectionGapFormat,
    ...RESUME_CSS_DEFAULTS
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
        titleFontSize: clampNumberValue(formatting?.titleFontSize, ...RESUME_RENDER_SPEC.limits.titleFontSize, defaults.titleFontSize),
        headerFontSize: clampNumberValue(formatting?.headerFontSize, ...RESUME_RENDER_SPEC.limits.headerFontSize, defaults.headerFontSize),
        subHeaderFontSize: clampNumberValue(formatting?.subHeaderFontSize, ...RESUME_RENDER_SPEC.limits.subHeaderFontSize, defaults.subHeaderFontSize),
        bodyFontSize: clampNumberValue(formatting?.bodyFontSize, ...RESUME_RENDER_SPEC.limits.bodyFontSize, defaults.bodyFontSize),
        pageMarginPt: clampNumberValue(formatting?.pageMarginPt, ...RESUME_RENDER_SPEC.limits.pageMarginPt, defaults.pageMarginPt),
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
};

export const buildResumeRenderTokens = (
    formattingInput?: Partial<ResumeFormatting> | null,
    paperMetricsOverride?: PaperMetrics
): ResumeRenderTokens => {
    const formatting = normalizeResumeFormatting(formattingInput);
    const paperMetrics = paperMetricsOverride ?? PAPER_SIZES[formatting.pageSize];
    const paperSizeSpec = RESUME_RENDER_SPEC.paperSizes[formatting.pageSize];
    const pageWidth = paperSizeSpec.cssWidth;
    const pageHeight = paperSizeSpec.cssHeight;
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
    const innerDensityPreset = RESUME_DENSITY_PRESETS[formatting.innerSectionGapFormat] ?? RESUME_DENSITY_PRESETS.standard;
    const innerSectionGapPt = innerDensityPreset.innerSectionGapPt;
    const sectionGapPx = ptToPx(sectionGapPt);
    const innerSectionGapPx = ptToPx(innerSectionGapPt);
    const titleFontSizePx = ptToPx(formatting.titleFontSize);
    const headerFontSizePx = ptToPx(formatting.headerFontSize);
    const subHeaderFontSizePx = ptToPx(formatting.subHeaderFontSize);
    const bodyFontSizePx = ptToPx(formatting.bodyFontSize);
    const documentCssVariables = {
        "--resume-title-font-size-pt": String(formatting.titleFontSize),
        "--resume-header-font-size-pt": String(formatting.headerFontSize),
        "--resume-subheader-font-size-pt": String(formatting.subHeaderFontSize),
        "--resume-body-font-size-pt": String(formatting.bodyFontSize),
        "--resume-page-margin-pt": String(formatting.pageMarginPt),
        "--resume-section-gap-pt": String(sectionGapPt),
        "--resume-inner-section-gap-pt": String(innerSectionGapPt),
        "--resume-title-font-size": pxCss(titleFontSizePx),
        "--resume-header-font-size": pxCss(headerFontSizePx),
        "--resume-subheader-font-size": pxCss(subHeaderFontSizePx),
        "--resume-body-font-size": pxCss(bodyFontSizePx),
        "--resume-section-gap": pxCss(sectionGapPx),
        "--resume-inner-section-gap": pxCss(innerSectionGapPx),
        "--resume-title-line-height": String(titleLineHeight),
        "--resume-header-line-height": String(headerLineHeight),
        "--resume-subheader-line-height": String(subHeaderLineHeight),
        "--resume-body-line-height": String(bodyLineHeight),
        "--resume-line-height": String(bodyLineHeight),
        "--resume-page-margin": pxCss(pageMarginPx)
    } as React.CSSProperties;

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
        innerSectionGapPx
    };
};
