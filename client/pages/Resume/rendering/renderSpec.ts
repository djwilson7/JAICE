import rawRenderSpec from "../../../../common/resume_render/render_spec.json";
import type { PageSize, PaperLayoutFormat, ResumeFormatting } from "../types";

type NumericRange = readonly [number, number];

type PaperSizeSpec = {
    label: string;
    standardLabel: string;
    widthPt: number;
    heightPt: number;
    printName: string;
    cssWidth: string;
    cssHeight: string;
    dimensionLabel: {
        width: string;
        height: string;
    };
};

export type ResumeRenderSpec = {
    version: string;
    defaults: Pick<ResumeFormatting, "pageSize" | "paperLayoutFormat" | "innerSectionGapFormat">;
    limits: {
        titleFontSize: NumericRange;
        headerFontSize: NumericRange;
        subHeaderFontSize: NumericRange;
        bodyFontSize: NumericRange;
        pageMarginPt: NumericRange;
    };
    paperSizes: Record<PageSize, PaperSizeSpec>;
    densityNames: PaperLayoutFormat[];
};

function assertRange(value: unknown, label: string): asserts value is [number, number] {
    if (!Array.isArray(value) || value.length !== 2 || value.some((item) => typeof item !== "number")) {
        throw new Error(`Invalid resume render range: ${label}`);
    }
}

const validateRenderSpec = (value: unknown): ResumeRenderSpec => {
    if (!value || typeof value !== "object") {
        throw new Error("Invalid resume render spec");
    }
    const spec = value as ResumeRenderSpec;
    if (!spec.version || !spec.defaults || !spec.limits || !spec.paperSizes || !spec.densityNames) {
        throw new Error("Resume render spec is missing required sections");
    }
    assertRange(spec.limits.titleFontSize, "titleFontSize");
    assertRange(spec.limits.headerFontSize, "headerFontSize");
    assertRange(spec.limits.subHeaderFontSize, "subHeaderFontSize");
    assertRange(spec.limits.bodyFontSize, "bodyFontSize");
    assertRange(spec.limits.pageMarginPt, "pageMarginPt");
    for (const pageSize of ["a4", "letter"] as const) {
        if (!spec.paperSizes[pageSize]?.widthPt || !spec.paperSizes[pageSize]?.heightPt) {
            throw new Error(`Resume render spec is missing paper size ${pageSize}`);
        }
    }
    for (const density of ["compact", "standard", "relaxed"] as const) {
        if (!spec.densityNames.includes(density)) throw new Error(`Resume render spec is missing density ${density}`);
    }
    return spec;
};

export const RESUME_RENDER_SPEC = validateRenderSpec(rawRenderSpec);
