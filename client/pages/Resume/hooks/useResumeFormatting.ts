import { buildResumeRenderTokens, PAPER_SIZES } from "../formatting";
import { useResumeFormatState } from "./useResumeFormatState";
import { useResumeViewportLayout } from "./useResumeViewportLayout";

type UseResumeFormattingParams = {
    isLightMode: boolean;
    isLeftRailCollapsed: boolean;
    isRightRailCollapsed: boolean;
};

export const useResumeFormatting = ({
    isLeftRailCollapsed,
    isRightRailCollapsed
}: UseResumeFormattingParams) => {
    const formatState = useResumeFormatState();
    const currentResumeFormatting = formatState.getCurrentResumeFormatting();
    const paperMetrics = PAPER_SIZES[formatState.pageSize];
    const viewport = useResumeViewportLayout({
        paperMetrics,
        pageMarginPt: formatState.pageMarginPt,
        isLeftRailCollapsed,
        isRightRailCollapsed,
        zoomMode: formatState.zoomMode,
        setZoomMode: formatState.setZoomMode,
        manualZoom: formatState.manualZoom
    });
    const renderTokens = buildResumeRenderTokens(currentResumeFormatting, paperMetrics);

    return {
        ...formatState,
        ...viewport,
        printWidth: renderTokens.pageWidth,
        printHeight: renderTokens.pageHeight,
        documentSectionGapPx: renderTokens.sectionGapPx,
        documentInnerSectionGapPx: renderTokens.innerSectionGapPx,
        documentCssVariables: renderTokens.documentCssVariables,
        currentResumeFormatting
    };
};
