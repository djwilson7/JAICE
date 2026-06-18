import React from "react";
import type { PaperMetrics, ResumeData, ResumeFormatting } from "../types";

type UseResumePagePreviewLayoutParams = {
    resumeData: ResumeData;
    formatting: ResumeFormatting;
    paperMetrics: PaperMetrics;
    resumePageCount: number;
    viewableCanvasWidth: number;
    animatedCanvasZoom: number;
};

export const useResumePagePreviewLayout = ({
    resumeData,
    formatting,
    paperMetrics,
    resumePageCount,
    viewableCanvasWidth,
    animatedCanvasZoom
}: UseResumePagePreviewLayoutParams) => {
    const layoutKey = JSON.stringify({
        resumeData,
        formatting,
        paperWidth: paperMetrics.width,
        paperHeight: paperMetrics.height
    });
    const [renderedPageState, setRenderedPageState] = React.useState({
        layoutKey,
        pageCount: resumePageCount
    });
    const renderedPageCount = renderedPageState.layoutKey === layoutKey
        ? renderedPageState.pageCount
        : resumePageCount;
    const onRenderedPageCountChange = React.useCallback((nextPageCount: number) => {
        setRenderedPageState((currentState) => {
            if (currentState.layoutKey === layoutKey && currentState.pageCount === nextPageCount) {
                return currentState;
            }
            return { layoutKey, pageCount: nextPageCount };
        });
    }, [layoutKey]);
    const pageGapPx = 32;
    const pageCount = Math.max(resumePageCount, renderedPageCount);
    const columnCount = viewableCanvasWidth / Math.max(animatedCanvasZoom, 0.01) >= paperMetrics.width * 2 + pageGapPx
        ? Math.min(2, Math.max(1, pageCount))
        : 1;
    const rowCount = Math.ceil(pageCount / columnCount);

    return {
        layoutKey,
        pageGapPx,
        columnCount,
        slotWidth: columnCount * paperMetrics.width + Math.max(0, columnCount - 1) * pageGapPx,
        slotHeight: rowCount * paperMetrics.height + Math.max(0, rowCount - 1) * pageGapPx,
        onRenderedPageCountChange
    };
};
