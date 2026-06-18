import React from "react";
import type { FontPreviewTarget, PaperMetrics } from "../types";

type ResumeCanvasProps = {
    canvasViewportRef: React.RefObject<HTMLDivElement | null>;
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
    resumePageCount: number;
    resumePageStride: number;
    resumePageBreakOffset?: number;
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
    resumePageCount,
    resumePageStride,
    resumePageBreakOffset = 0,
    isPageFormatPreviewVisible,
    isMarginPreviewVisible,
    isPagePreviewMode = false,
    pagePreviewSlotWidth,
    pagePreviewSlotHeight,
    pagePreviewContent,
    children
}) => {
    const [isCanvasHovered, setIsCanvasHovered] = React.useState(false);
    const canvasWidth = isPagePreviewMode && pagePreviewSlotWidth ? pagePreviewSlotWidth : paperMetrics.width;
    const canvasHeight = isPagePreviewMode && pagePreviewSlotHeight ? pagePreviewSlotHeight : resumeCanvasHeight;
    const scaledSlotWidth = canvasWidth * animatedCanvasZoom;
    const scaledSlotHeight = canvasHeight * animatedCanvasZoom;
    const handleContentRef = React.useCallback((element: HTMLDivElement | null) => {
        resumeDocumentContentRef.current = element;
        registerResumeDocumentContentElement(element);
    }, [registerResumeDocumentContentElement, resumeDocumentContentRef]);

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
                    ref={canvasViewportRef}
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
                        onMouseEnter={() => setIsCanvasHovered(true)}
                        onMouseLeave={() => setIsCanvasHovered(false)}
                        data-canvas-hovered={isCanvasHovered}
                        style={{
                            width: `${canvasWidth}px`,
                            height: `${canvasHeight}px`,
                                transform: `scale(${animatedCanvasZoom})`,
                                transformOrigin: "top left"
                            }}
                        >
                        {!isPagePreviewMode && (
                        <div className="pointer-events-none absolute inset-0 z-0 overflow-visible print:hidden" aria-hidden="true">
                            {Array.from({ length: Math.max(0, resumePageCount - 1) }).map((_, guideIndex) => (
                                <div
                                    key={guideIndex}
                                    className="resume-canvas-page-guide absolute"
                                    style={{
                                        top: `${resumePageBreakOffset + (guideIndex + 1) * resumePageStride}px`
                                    }}
                                >
                                    <div className="resume-canvas-page-guide-line" />
                                    <div
                                        className={`resume-canvas-page-guide-label ${
                                            isCanvasHovered ? "resume-canvas-page-guide-label-hidden" : ""
                                        }`}
                                    >
                                        Page {guideIndex + 2}
                                    </div>
                                </div>
                            ))}
                        </div>
                        )}
                        <div
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
