import type { PageSize, PaperLayoutFormat, PaperMetrics, ResumeFormatting } from "./types";

export const SECTION_GAP_PX: Record<PaperLayoutFormat, number> = {
    compact: 6,
    standard: 10,
    relaxed: 16
};

export const PAPER_SIZES: Record<PageSize, PaperMetrics> = {
    a4: {
        label: "A4",
        standardLabel: "Europe, Asia, etc.",
        width: 794,
        height: 1123,
        printName: "A4",
        dimensionLabel: {
            width: "210 mm",
            height: "297 mm"
        }
    },
    letter: {
        label: "Letter",
        standardLabel: "US & Canada",
        width: 816,
        height: 1056,
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
    bodyFontSize: 12,
    pageMarginPt: 42,
    paperLayoutFormat: "standard"
});


export const normalizeResumeFormatting = (formatting?: Partial<ResumeFormatting> | null): ResumeFormatting => {
    const defaults = defaultResumeFormatting();
    const pageSize = formatting?.pageSize === "letter" || formatting?.pageSize === "a4" ? formatting.pageSize : defaults.pageSize;
    const paperLayoutFormat =
        formatting?.paperLayoutFormat === "compact" || formatting?.paperLayoutFormat === "standard" || formatting?.paperLayoutFormat === "relaxed"
            ? formatting.paperLayoutFormat
            : defaults.paperLayoutFormat;

    return {
        pageSize,
        titleFontSize: clampNumberValue(formatting?.titleFontSize, 18, 34, defaults.titleFontSize),
        headerFontSize: clampNumberValue(formatting?.headerFontSize, 12, 22, defaults.headerFontSize),
        bodyFontSize: clampNumberValue(formatting?.bodyFontSize, 9, 15, defaults.bodyFontSize),
        pageMarginPt: clampNumberValue(formatting?.pageMarginPt, 24, 60, defaults.pageMarginPt),
        paperLayoutFormat
    };
};

export const clampNumberValue = (value: unknown, min: number, max: number, fallback: number) => {
    const numberValue = typeof value === "number" && Number.isFinite(value) ? value : fallback;
    return Math.min(max, Math.max(min, numberValue));
};
