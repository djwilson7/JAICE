import React from "react";
import type { FontPreviewTarget, PaperMetrics } from "../types";
import { RESUME_DOCUMENT_TYPOGRAPHY } from "../resumeTypography";

type ResumeCanvasProps = {
    canvasViewportRef: React.RefObject<HTMLDivElement | null>;
    resumeDocumentContentRef: React.RefObject<HTMLDivElement | null>;
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
    bodyFontSize: number;
    resumePageCount: number;
    resumePageStride: number;
    isPageFormatPreviewVisible: boolean;
    isMarginPreviewVisible: boolean;
    pageMarginPt: number;
    children: React.ReactNode;
};

export const ResumeCanvas: React.FC<ResumeCanvasProps> = ({
    canvasViewportRef,
    resumeDocumentContentRef,
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
    bodyFontSize,
    resumePageCount,
    resumePageStride,
    isPageFormatPreviewVisible,
    isMarginPreviewVisible,
    pageMarginPt,
    children
}) => {
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
                        overflowX: canvasNeedsHorizontalScroll ? "auto" : "hidden",
                        overflowY: canvasNeedsVerticalScroll ? "auto" : "hidden"
                    }}
                >
                    <div
                        id="resume-canvas-slot"
                        className="relative mx-auto print:m-0"
                        style={{
                            width: `${scaledCanvasWidth}px`,
                            height: `${scaledCanvasHeight}px`
                        }}
                    >
                        <div
                            id="resume-canvas-scale"
                            className="absolute left-0 top-0 origin-top-left print:origin-top-left"
                            style={{
                                width: `${paperMetrics.width}px`,
                                height: `${resumeCanvasHeight}px`,
                                transform: `scale(${animatedCanvasZoom})`,
                                transformOrigin: "top left"
                            }}
                        >
                        <div
                            id="print-canvas"
                            className="text-[#0f172a] box-border relative transition-shadow duration-300 flex flex-col bg-white shadow-[0_26px_70px_rgba(0,0,0,0.48),0_0_0_1px_rgba(255,255,255,0.08)] border border-white/80 rounded-sm print:h-auto"
                            data-font-preview={fontPreviewTarget || undefined}
                            style={{
                                width: `${paperMetrics.width}px`,
                                minHeight: `${resumeCanvasHeight}px`,
                                fontFamily: RESUME_DOCUMENT_TYPOGRAPHY.canvasFamily,
                                fontSize: `${bodyFontSize}px`,
                                padding: 0
                            }}
                        >
                            <div className="pointer-events-none absolute inset-0 z-0 print:hidden" aria-hidden="true">
                                {Array.from({ length: Math.max(0, resumePageCount - 1) }).map((_, guideIndex) => (
                                    <div
                                        key={guideIndex}
                                        className="absolute left-0 right-0"
                                        style={{
                                            top: `${(guideIndex + 1) * resumePageStride}px`
                                        }}
                                    >
                                        <div className="h-px w-full bg-sky-500/35" />
                                        <div className="absolute right-3 top-1 rounded-sm bg-slate-100/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-normal text-slate-500 shadow-sm">
                                            Page {guideIndex + 2}
                                        </div>
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
                                    <div className="resume-margin-preview-band" style={{ left: 0, right: 0, top: 0, height: `${pageMarginPt}pt` }} />
                                    <div className="resume-margin-preview-band" style={{ left: 0, right: 0, bottom: 0, height: `${pageMarginPt}pt` }} />
                                    <div className="resume-margin-preview-band" style={{ left: 0, top: `${pageMarginPt}pt`, bottom: `${pageMarginPt}pt`, width: `${pageMarginPt}pt` }} />
                                    <div className="resume-margin-preview-band" style={{ right: 0, top: `${pageMarginPt}pt`, bottom: `${pageMarginPt}pt`, width: `${pageMarginPt}pt` }} />
                                    <div className="resume-margin-preview-content" style={{ inset: `${pageMarginPt}pt` }} />
                                </div>
                            )}
                            <div ref={resumeDocumentContentRef} className="relative z-10" style={{ padding: `${pageMarginPt}pt` }}>
                            {children}                            </div>
                        </div>
                        </div>
                    </div>

                </div>

    );
};
