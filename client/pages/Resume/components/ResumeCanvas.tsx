import React from "react";
import type { FontPreviewTarget, PaperMetrics } from "../types";
import type { PageBreakAnchor } from "./ResumePagedPreview";

type ResumeCanvasProps = {
    canvasViewportRef: React.RefObject<HTMLDivElement | null>;
    registerCanvasViewportElement: (element: HTMLDivElement | null) => void;
    resumeDocumentContentRef: React.RefObject<HTMLDivElement | null>;
    registerResumeDocumentContentElement: (element: HTMLDivElement | null) => void;
    canvasNeedsHorizontalScroll: boolean;
    canvasNeedsVerticalScroll: boolean;
    canvasViewportStyle: React.CSSProperties;
    canvasHorizontalOverflow: number;
    scaledCanvasWidth: number;
    scaledCanvasHeight: number;
    paperMetrics: PaperMetrics;
    resumeCanvasHeight: number;
    animatedCanvasZoom: number;
    fontPreviewTarget: FontPreviewTarget | null;
    documentCssVariables: React.CSSProperties;
    pageBreakAnchors?: PageBreakAnchor[];
    isPageFormatPreviewVisible: boolean;
    isMarginPreviewVisible: boolean;
    isPagePreviewMode?: boolean;
    pagePreviewSlotWidth?: number;
    pagePreviewSlotHeight?: number;
    pagePreviewContent?: React.ReactNode;
    children: React.ReactNode;
};

export const ResumeCanvas: React.FC<ResumeCanvasProps> = ({
    canvasViewportRef,
    registerCanvasViewportElement,
    resumeDocumentContentRef,
    registerResumeDocumentContentElement,
    canvasNeedsHorizontalScroll,
    canvasNeedsVerticalScroll,
    canvasViewportStyle,
    canvasHorizontalOverflow,
    scaledCanvasWidth,
    scaledCanvasHeight,
    paperMetrics,
    resumeCanvasHeight,
    animatedCanvasZoom,
    fontPreviewTarget,
    documentCssVariables,
    pageBreakAnchors = [],
    isPageFormatPreviewVisible,
    isMarginPreviewVisible,
    isPagePreviewMode = false,
    pagePreviewSlotWidth,
    pagePreviewSlotHeight,
    pagePreviewContent,
    children
}) => {
    const canvasDocumentRef = React.useRef<HTMLDivElement | null>(null);
    const [pageBreakPositions, setPageBreakPositions] = React.useState<Array<{
        pageNumber: number;
        top: number;
    }>>([]);
    const canvasWidth = isPagePreviewMode && pagePreviewSlotWidth ? pagePreviewSlotWidth : paperMetrics.width;
    const canvasHeight = isPagePreviewMode && pagePreviewSlotHeight ? pagePreviewSlotHeight : resumeCanvasHeight;
    const scaledSlotWidth = canvasWidth * animatedCanvasZoom;
    const scaledSlotHeight = canvasHeight * animatedCanvasZoom;
    const handleContentRef = React.useCallback((element: HTMLDivElement | null) => {
        resumeDocumentContentRef.current = element;
        registerResumeDocumentContentElement(element);
    }, [registerResumeDocumentContentElement, resumeDocumentContentRef]);
    const measurePageBreakPositions = React.useCallback(() => {
        const canvasDocument = canvasDocumentRef.current;
        const content = resumeDocumentContentRef.current;
        if (!canvasDocument || !content || isPagePreviewMode) {
            setPageBreakPositions([]);
            return;
        }

        const segmentElements = Array.from(
            content.querySelectorAll<HTMLElement>("[data-resume-segment-id]")
        );
        const canvasRect = canvasDocument.getBoundingClientRect();
        const zoom = Math.max(animatedCanvasZoom, 0.01);
        const nextPositions = pageBreakAnchors.flatMap((anchor) => {
            const targetIndex = segmentElements.findIndex(
                (element) => element.dataset.resumeSegmentId === anchor.segmentId
            );
            if (targetIndex < 0) return [];

            const targetRect = segmentElements[targetIndex].getBoundingClientRect();
            const previousRect = targetIndex > 0
                ? segmentElements[targetIndex - 1].getBoundingClientRect()
                : null;
            const targetTop = (targetRect.top - canvasRect.top) / zoom;
            const previousBottom = previousRect
                ? (previousRect.bottom - canvasRect.top) / zoom
                : targetTop;

            return [{
                pageNumber: anchor.pageNumber,
                top: Math.max(0, (previousBottom + targetTop) / 2)
            }];
        });

        setPageBreakPositions((current) => (
            current.length === nextPositions.length
            && current.every((position, index) => (
                position.pageNumber === nextPositions[index].pageNumber
                && Math.abs(position.top - nextPositions[index].top) < 0.5
            ))
                ? current
                : nextPositions
        ));
    }, [animatedCanvasZoom, isPagePreviewMode, pageBreakAnchors, resumeDocumentContentRef]);

    React.useLayoutEffect(() => {
        if (isPagePreviewMode) return;
        measurePageBreakPositions();
        const content = resumeDocumentContentRef.current;
        if (!content || typeof ResizeObserver === "undefined") return;

        const observer = new ResizeObserver(measurePageBreakPositions);
        observer.observe(content);
        content
            .querySelectorAll<HTMLElement>("[data-resume-segment-id]")
            .forEach((element) => observer.observe(element));
        const frameId = window.requestAnimationFrame(measurePageBreakPositions);

        return () => {
            window.cancelAnimationFrame(frameId);
            observer.disconnect();
        };
    }, [isPagePreviewMode, measurePageBreakPositions, resumeDocumentContentRef]);
    const handleDocumentFieldWheel = React.useCallback((event: React.WheelEvent<HTMLDivElement>) => {
        if (event.ctrlKey || event.metaKey) return;
        const target = event.target;
        if (!(target instanceof Element) || !target.matches("input, textarea")) return;

        const deltaScale = event.deltaMode === WheelEvent.DOM_DELTA_LINE
            ? 16
            : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? event.currentTarget.clientHeight
            : 1;

        event.preventDefault();
        event.currentTarget.scrollBy({
            left: event.deltaX * deltaScale,
            top: event.deltaY * deltaScale,
            behavior: "auto"
        });
    }, []);

    React.useEffect(() => {
        const viewport = canvasViewportRef.current;
        if (!viewport) return;

        viewport.scrollTo({
            left: canvasHorizontalOverflow / 2,
            behavior: "auto"
        });
    }, [canvasHorizontalOverflow, canvasViewportRef]);

    return (
                <div
                    ref={registerCanvasViewportElement}
                    onWheelCapture={handleDocumentFieldWheel}
                    className="no-scrollbar relative box-border min-h-0 flex-1 overscroll-contain print:p-0"
                    style={{
                        ...canvasViewportStyle,
                        overflowX: isPagePreviewMode || canvasNeedsHorizontalScroll ? "auto" : "hidden",
                        overflowY: isPagePreviewMode || canvasNeedsVerticalScroll ? "auto" : "hidden"
                    }}
                >
                    <div
                        id="resume-canvas-slot"
                        className="relative mx-auto print:m-0"
                        style={{
                            width: `${isPagePreviewMode ? scaledSlotWidth : scaledCanvasWidth}px`,
                            height: `${isPagePreviewMode ? scaledSlotHeight : scaledCanvasHeight}px`
                        }}
                    >
                        <div
                        id="resume-canvas-scale"
                        className="absolute left-0 top-0 origin-top-left print:origin-top-left"
                        style={{
                            width: `${canvasWidth}px`,
                            height: `${canvasHeight}px`,
                                transform: `scale(${animatedCanvasZoom})`,
                                transformOrigin: "top left"
                            }}
                        >
                        <div
                            ref={canvasDocumentRef}
                            id="print-canvas"
                            className={`resume-formatting-context resume-canvas-document text-[#0f172a] box-border relative z-10 transition-shadow duration-300 ${
                                isPagePreviewMode
                                    ? "bg-transparent shadow-none border-none rounded-none"
                                    : "flex flex-col bg-white shadow-[0_26px_70px_rgba(0,0,0,0.48),0_0_0_1px_rgba(255,255,255,0.08)] border border-white/80 rounded-sm print:h-auto"
                            }`}
                            data-font-preview={fontPreviewTarget || undefined}
                            data-page-preview={isPagePreviewMode || undefined}
                            style={{
                                ...documentCssVariables,
                                width: `${canvasWidth}px`,
                                minHeight: `${canvasHeight}px`,
                            }}
                        >
                            {isPagePreviewMode ? pagePreviewContent : (
                            <>
                            <div
                                className="resume-canvas-page-break-layer pointer-events-none absolute inset-0 z-[5] print:hidden"
                                aria-hidden="true"
                            >
                                {pageBreakPositions.map((position) => (
                                    <div
                                        key={position.pageNumber}
                                        className="resume-canvas-page-break"
                                        style={{ top: `${position.top}px` }}
                                    >
                                        <span className="resume-canvas-page-break__label">
                                            Page {position.pageNumber}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {isPageFormatPreviewVisible && (
                                <div className="resume-page-format-preview">
                                    <span className="resume-page-format-dimension resume-page-format-dimension-width">
                                        {paperMetrics.dimensionLabel.width}
                                    </span>
                                    <span className="resume-page-format-dimension resume-page-format-dimension-height">
                                        {paperMetrics.dimensionLabel.height}
                                    </span>
                                </div>
                            )}
                            {isMarginPreviewVisible && (
                                <div className="resume-margin-preview">
                                    <div className="resume-margin-preview-band resume-margin-preview-band--top" />
                                    <div className="resume-margin-preview-band resume-margin-preview-band--bottom" />
                                    <div className="resume-margin-preview-band resume-margin-preview-band--left" />
                                    <div className="resume-margin-preview-band resume-margin-preview-band--right" />
                                    <div className="resume-margin-preview-content" />
                                </div>
                            )}
                            <div
                                ref={handleContentRef}
                                className="resume-page-content resume-canvas-document-content relative z-10"
                            >
                            {children}                            </div>
                            </>
                            )}
                        </div>
                        </div>
                    </div>

                </div>

    );
};
