import { useEffect, useState } from "react";
import type { FontPreviewTarget, PageSize, PaperLayoutFormat, ResumeFormatting, ZoomMode } from "../types";
import { defaultResumeFormatting, normalizeResumeFormatting } from "../formatting";

export const useResumeFormatState = () => {
    const defaults = defaultResumeFormatting();
    const [pageSize, setPageSize] = useState<PageSize>(defaults.pageSize);
    const [zoomMode, setZoomMode] = useState<ZoomMode>("manual");
    const [manualZoom, setManualZoom] = useState(1);
    const [titleFontSize, setTitleFontSize] = useState(defaults.titleFontSize);
    const [headerFontSize, setHeaderFontSize] = useState(defaults.headerFontSize);
    const [subHeaderFontSize, setSubHeaderFontSize] = useState(defaults.subHeaderFontSize);
    const [bodyFontSize, setBodyFontSize] = useState(defaults.bodyFontSize);
    const [pageMarginPt, setPageMarginPt] = useState(defaults.pageMarginPt);
    const [paperLayoutFormat, setPaperLayoutFormat] = useState<PaperLayoutFormat>(defaults.paperLayoutFormat);
    const [innerSectionGapFormat, setInnerSectionGapFormat] = useState<PaperLayoutFormat>(defaults.innerSectionGapFormat);
    const [fontPreviewTarget, setFontPreviewTarget] = useState<FontPreviewTarget | null>(null);
    const [isMarginPreviewVisible, setIsMarginPreviewVisible] = useState(false);
    const [isPageFormatPreviewVisible, setIsPageFormatPreviewVisible] = useState(false);
    const [gapPreviewTarget, setGapPreviewTarget] = useState<"section" | "inner" | null>(null);

    useEffect(() => {
        setInnerSectionGapFormat(paperLayoutFormat);
    }, [paperLayoutFormat]);

    const getCurrentResumeFormatting = (): ResumeFormatting => ({
        pageSize,
        titleFontSize,
        headerFontSize,
        subHeaderFontSize,
        bodyFontSize,
        pageMarginPt,
        paperLayoutFormat,
        innerSectionGapFormat
    });

    const applyResumeFormatting = (formatting?: Partial<ResumeFormatting> | null) => {
        const normalized = normalizeResumeFormatting(formatting);
        setPageSize(normalized.pageSize);
        setTitleFontSize(normalized.titleFontSize);
        setHeaderFontSize(normalized.headerFontSize);
        setSubHeaderFontSize(normalized.subHeaderFontSize);
        setBodyFontSize(normalized.bodyFontSize);
        setPageMarginPt(normalized.pageMarginPt);
        setPaperLayoutFormat(normalized.paperLayoutFormat);
        setInnerSectionGapFormat(normalized.innerSectionGapFormat);
    };

    return {
        pageSize,
        setPageSize,
        zoomMode,
        setZoomMode,
        manualZoom,
        setManualZoom,
        titleFontSize,
        setTitleFontSize,
        headerFontSize,
        setHeaderFontSize,
        subHeaderFontSize,
        setSubHeaderFontSize,
        bodyFontSize,
        setBodyFontSize,
        pageMarginPt,
        setPageMarginPt,
        paperLayoutFormat,
        setPaperLayoutFormat,
        innerSectionGapFormat,
        setInnerSectionGapFormat,
        fontPreviewTarget,
        setFontPreviewTarget,
        isMarginPreviewVisible,
        setIsMarginPreviewVisible,
        isPageFormatPreviewVisible,
        setIsPageFormatPreviewVisible,
        gapPreviewTarget,
        setGapPreviewTarget,
        getCurrentResumeFormatting,
        applyResumeFormatting
    };
};
