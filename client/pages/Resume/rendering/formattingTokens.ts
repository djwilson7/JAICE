import rawFormattingCss from "virtual:resume-formatting-tokens";
import type { PaperLayoutFormat } from "../types";

const readNumber = (name: string): number => {
    const match = rawFormattingCss.match(new RegExp(`--${name}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)\\s*;`));
    if (!match) throw new Error(`Missing resume formatting token: --${name}`);
    const value = Number(match[1]);
    if (!Number.isFinite(value)) throw new Error(`Invalid resume formatting token: --${name}`);
    return value;
};

const readDensity = (name: PaperLayoutFormat) => ({
    titleLineHeight: readNumber(`resume-${name}-title-line-height`),
    headerLineHeight: readNumber(`resume-${name}-header-line-height`),
    subHeaderLineHeight: readNumber(`resume-${name}-subheader-line-height`),
    bodyLineHeight: readNumber(`resume-${name}-body-line-height`),
    sectionGapPt: readNumber(`resume-${name}-section-gap-pt`),
    innerSectionGapPt: readNumber(`resume-${name}-inner-section-gap-pt`)
});

export const RESUME_CSS_DEFAULTS = {
    titleFontSize: readNumber("resume-default-title-font-size-pt"),
    headerFontSize: readNumber("resume-default-header-font-size-pt"),
    subHeaderFontSize: readNumber("resume-default-subheader-font-size-pt"),
    bodyFontSize: readNumber("resume-default-body-font-size-pt"),
    pageMarginPt: readNumber("resume-default-page-margin-pt")
} as const;

export const RESUME_CSS_DENSITY_PRESETS = {
    compact: readDensity("compact"),
    standard: readDensity("standard"),
    relaxed: readDensity("relaxed")
} as const;

export const RESUME_CSS_LAYOUT = {
    titleHorizontalPaddingPx: readNumber("resume-title-horizontal-padding-px"),
    titleVerticalPaddingPx: readNumber("resume-title-vertical-padding-px"),
    fieldHorizontalPaddingPx: readNumber("resume-field-horizontal-padding-px"),
    fieldVerticalPaddingPx: readNumber("resume-field-vertical-padding-px"),
    sectionHeadingPaddingBottomPx: readNumber("resume-heading-padding-bottom-px"),
    sectionHeadingMarginBottomPx: readNumber("resume-heading-margin-bottom-px"),
    metaRowToBulletGapPx: readNumber("resume-meta-row-to-bullet-gap-px"),
    educationDetailGapPx: readNumber("resume-education-detail-gap-px"),
    bulletIndentPx: readNumber("resume-bullet-indent-px"),
    bulletGapPx: readNumber("resume-bullet-gap-px"),
    metaGroupGapPx: readNumber("resume-meta-group-gap-px"),
    dateGroupGapPx: readNumber("resume-date-group-gap-px"),
    metaDateGapPx: readNumber("resume-meta-date-gap-px"),
    contactRowGapPx: readNumber("resume-contact-row-gap-px"),
    contactStackGapPx: readNumber("resume-contact-stack-gap-px")
} as const;

export { rawFormattingCss as RESUME_FORMATTING_CSS };
