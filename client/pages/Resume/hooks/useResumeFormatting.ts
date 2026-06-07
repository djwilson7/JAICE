import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FontPreviewTarget, PageSize, PaperLayoutFormat, ResumeFormatting, ZoomMode } from "../types";
import {
    PAPER_SIZES,
    SECTION_GAP_PX,
    clampFitZoom,
    defaultResumeFormatting,
    normalizeResumeFormatting
} from "../formatting";

type UseResumeFormattingParams = {
    isLightMode: boolean;
    isLeftRailCollapsed: boolean;
    isRightRailCollapsed: boolean;
};

const CANVAS_EDGE_GUTTER = 32;
const OVERLAY_EDGE_INSET = 12;
const CANVAS_HEADER_INSET = 80;
const CANVAS_TOOLBAR_INSET = 88;
const CANVAS_OPEN_SHELF_FULL_INSET = 146;
const CANVAS_OPEN_SHELF_COMPACT_INSET = 200;
const CANVAS_RAIL_INSET = 300;
const PAGE_STYLE_SHELF_EXPANDED_MIN_WIDTH = 860;

export const useResumeFormatting = ({
    isLightMode,
    isLeftRailCollapsed,
    isRightRailCollapsed
}: UseResumeFormattingParams) => {
    const canvasViewportRef = useRef<HTMLDivElement>(null);
    const resumeDocumentContentRef = useRef<HTMLDivElement>(null);
    const [canvasViewportSize, setCanvasViewportSize] = useState({ width: 0, height: 0 });
    const [resumeDocumentContentHeight, setResumeDocumentContentHeight] = useState(0);
    const [pageSize, setPageSize] = useState<PageSize>(defaultResumeFormatting().pageSize);
    const [zoomMode, setZoomMode] = useState<ZoomMode>("manual");
    const [manualZoom, setManualZoom] = useState(1);
    const [animatedCanvasZoom, setAnimatedCanvasZoom] = useState(1);
    const animatedCanvasZoomRef = useRef(animatedCanvasZoom);
    const [isPageStyleShelfOpen, setIsPageStyleShelfOpen] = useState(false);
    const [titleFontSize, setTitleFontSize] = useState(defaultResumeFormatting().titleFontSize);
    const [headerFontSize, setHeaderFontSize] = useState(defaultResumeFormatting().headerFontSize);
    const [bodyFontSize, setBodyFontSize] = useState(defaultResumeFormatting().bodyFontSize);
    const [pageMarginPt, setPageMarginPt] = useState(defaultResumeFormatting().pageMarginPt);
    const [paperLayoutFormat, setPaperLayoutFormat] = useState<PaperLayoutFormat>(defaultResumeFormatting().paperLayoutFormat);
    const [fontPreviewTarget, setFontPreviewTarget] = useState<FontPreviewTarget | null>(null);
    const [isMarginPreviewVisible, setIsMarginPreviewVisible] = useState(false);
    const [isPageFormatPreviewVisible, setIsPageFormatPreviewVisible] = useState(false);
    const [isSectionGapPreviewVisible, setIsSectionGapPreviewVisible] = useState(false);

    const measureCanvasViewport = useCallback(() => {
        const container = canvasViewportRef.current;
        if (!container) return;

        setCanvasViewportSize({
            width: container.clientWidth,
            height: container.clientHeight
        });
    }, []);

    const getCurrentResumeFormatting = (): ResumeFormatting => ({
        pageSize,
        titleFontSize,
        headerFontSize,
        bodyFontSize,
        pageMarginPt,
        paperLayoutFormat
    });

    const applyResumeFormatting = (formatting?: Partial<ResumeFormatting> | null) => {
        const normalizedFormatting = normalizeResumeFormatting(formatting);
        setPageSize(normalizedFormatting.pageSize);
        setTitleFontSize(normalizedFormatting.titleFontSize);
        setHeaderFontSize(normalizedFormatting.headerFontSize);
        setBodyFontSize(normalizedFormatting.bodyFontSize);
        setPageMarginPt(normalizedFormatting.pageMarginPt);
        setPaperLayoutFormat(normalizedFormatting.paperLayoutFormat);
    };

    useEffect(() => {
        const container = canvasViewportRef.current;
        if (!container) return;

        measureCanvasViewport();

        const observer = new ResizeObserver(measureCanvasViewport);
        observer.observe(container);
        window.addEventListener("resize", measureCanvasViewport);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", measureCanvasViewport);
        };
    }, [measureCanvasViewport]);

    useEffect(() => {
        const content = resumeDocumentContentRef.current;
        if (!content) return;

        const updateContentHeight = () => {
            setResumeDocumentContentHeight(content.scrollHeight);
        };

        updateContentHeight();

        const observer = new ResizeObserver(updateContentHeight);
        observer.observe(content);
        return () => observer.disconnect();
    }, []);

    const paperMetrics = PAPER_SIZES[pageSize];
    const pageMarginPx = pageMarginPt * (4 / 3);
    const resumePageContentHeight = Math.max(1, paperMetrics.height - pageMarginPx * 2);
    const resumeDocumentBodyHeight = Math.max(0, resumeDocumentContentHeight - pageMarginPx * 2);
    const resumePageCount = Math.max(1, Math.ceil(resumeDocumentBodyHeight / resumePageContentHeight));
    const resumePageStride = paperMetrics.height;
    const resumeCanvasHeight = resumePageCount * paperMetrics.height;
    const canvasHorizontalInsets = {
        right: isRightRailCollapsed ? CANVAS_EDGE_GUTTER : CANVAS_RAIL_INSET,
        left: isLeftRailCollapsed ? CANVAS_EDGE_GUTTER : CANVAS_RAIL_INSET
    };
    const viewableCanvasWidth = Math.max(
        0,
        canvasViewportSize.width - canvasHorizontalInsets.left - canvasHorizontalInsets.right
    );
    const isPageStyleShelfCompact =
        viewableCanvasWidth > 0 &&
        viewableCanvasWidth < PAGE_STYLE_SHELF_EXPANDED_MIN_WIDTH;
    const openShelfBottomInset = isPageStyleShelfCompact
        ? CANVAS_OPEN_SHELF_COMPACT_INSET
        : CANVAS_OPEN_SHELF_FULL_INSET;
    const canvasInsets = {
        top: CANVAS_HEADER_INSET,
        right: canvasHorizontalInsets.right,
        bottom: isPageStyleShelfOpen ? openShelfBottomInset : CANVAS_TOOLBAR_INSET,
        left: canvasHorizontalInsets.left
    };
    const viewableCanvasHeight = Math.max(
        0,
        canvasViewportSize.height - canvasInsets.top - canvasInsets.bottom
    );
    const fitZoom = useMemo(() => {
        if (!viewableCanvasWidth || !viewableCanvasHeight) return 1;
        return clampFitZoom(Math.min(
            viewableCanvasWidth / paperMetrics.width,
            viewableCanvasHeight / paperMetrics.height
        ));
    }, [
        paperMetrics.height,
        paperMetrics.width,
        viewableCanvasHeight,
        viewableCanvasWidth
    ]);
    const canvasZoom = zoomMode === "fit" ? fitZoom : manualZoom;
    const zoomPercent = Math.round(animatedCanvasZoom * 100);
    const scaledCanvasWidth = paperMetrics.width * animatedCanvasZoom;
    const scaledCanvasHeight = resumeCanvasHeight * animatedCanvasZoom;
    const canvasHorizontalOverflow = Math.max(0, scaledCanvasWidth - viewableCanvasWidth);
    const canvasVerticalPadding = canvasInsets.top + canvasInsets.bottom;
    const canvasNeedsHorizontalScroll = canvasHorizontalOverflow > 1;
    const canvasNeedsVerticalScroll = scaledCanvasHeight + canvasVerticalPadding > canvasViewportSize.height + 1;
    const canvasViewportStyle: React.CSSProperties = {
        paddingTop: `${canvasInsets.top}px`,
        paddingRight: `${canvasInsets.right}px`,
        paddingBottom: `${canvasInsets.bottom}px`,
        paddingLeft: `${canvasInsets.left}px`
    };
    const pdfPreviewViewportStyle: React.CSSProperties = {
        padding: `${OVERLAY_EDGE_INSET}px`
    };
    const bottomControlsViewportStyle: React.CSSProperties = {
        paddingRight: `${canvasInsets.right}px`,
        paddingLeft: `${canvasInsets.left}px`
    };
    const printWidth = pageSize === "a4" ? "210mm" : "8.5in";
    const printHeight = pageSize === "a4" ? "297mm" : "11in";
    const documentSectionGapPx = SECTION_GAP_PX[paperLayoutFormat] ?? SECTION_GAP_PX.standard;
    const documentSectionGapStyle: React.CSSProperties = { marginBottom: `${documentSectionGapPx}px` };
    const currentResumeFormatting = getCurrentResumeFormatting();

    useEffect(() => {
        let frameId = 0;
        let startTime: number | null = null;
        const startZoom = animatedCanvasZoomRef.current;
        const zoomDelta = canvasZoom - startZoom;
        const duration = 260;

        if (Math.abs(zoomDelta) < 0.001) {
            setAnimatedCanvasZoom(canvasZoom);
            return;
        }

        const animateZoom = (timestamp: number) => {
            if (startTime === null) startTime = timestamp;
            const progress = Math.min(1, (timestamp - startTime) / duration);
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            setAnimatedCanvasZoom(startZoom + zoomDelta * easedProgress);

            if (progress < 1) {
                frameId = requestAnimationFrame(animateZoom);
            } else {
                setAnimatedCanvasZoom(canvasZoom);
            }
        };

        frameId = requestAnimationFrame(animateZoom);
        return () => cancelAnimationFrame(frameId);
    }, [canvasZoom]);

    useEffect(() => {
        animatedCanvasZoomRef.current = animatedCanvasZoom;
    }, [animatedCanvasZoom]);

    const handleFitZoom = () => {
        measureCanvasViewport();
        setZoomMode("fit");
        requestAnimationFrame(() => {
            measureCanvasViewport();
            canvasViewportRef.current?.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        });
    };

    const handleTogglePageStyleShelf = () => {
        setIsPageStyleShelfOpen((isOpen) => {
            if (!isOpen) {
                handleFitZoom();
            }
            return !isOpen;
        });
    };

    const closePageStyleShelf = () => {
        setIsPageStyleShelfOpen(false);
    };

    const resumeChromeRootClass = isLightMode
        ? "flex h-full min-h-0 w-full flex-col text-slate-900 relative overflow-hidden select-none"
        : "flex h-full min-h-0 w-full flex-col text-slate-100 relative overflow-hidden select-none";
    const resumeChromeBackground = "var(--page-gradient)";
    const headerShellStyle: React.CSSProperties = {
        background: "rgba(var(--primary-one-rgb), 1)",
        borderColor: "rgba(var(--primary-five-rgb), 0.14)",
        borderTopColor: "rgba(var(--primary-five-rgb), 0.22)",
        borderLeftColor: "rgba(var(--primary-five-rgb), 0.18)",
        boxShadow: "none",
        backdropFilter: "blur(22px) saturate(145%)",
        WebkitBackdropFilter: "blur(22px) saturate(145%)",
        fontFamily: "var(--font-body)"
    };
    const railShellStyle: React.CSSProperties = {
        background: "rgba(var(--primary-one-rgb), 1)",
        borderColor: "rgba(var(--primary-five-rgb), 0.14)",
        borderTopColor: "rgba(var(--primary-five-rgb), 0.22)",
        borderLeftColor: "rgba(var(--primary-five-rgb), 0.18)",
        boxShadow: "none",
        backdropFilter: "blur(22px) saturate(145%)",
        WebkitBackdropFilter: "blur(22px) saturate(145%)"
    };
    const rightRailShellStyle: React.CSSProperties = {
        background: "rgba(var(--primary-one-rgb), 1)",
        borderColor: "rgba(var(--primary-five-rgb), 0.14)",
        borderTopColor: "rgba(var(--primary-five-rgb), 0.22)",
        borderLeftColor: "rgba(var(--primary-five-rgb), 0.18)",
        boxShadow: "none",
        backdropFilter: "blur(22px) saturate(145%)",
        WebkitBackdropFilter: "blur(22px) saturate(145%)",
        fontFamily: "var(--font-body)"
    };
    const toolbarSurfaceStyle: React.CSSProperties = {
        fontFamily: "var(--font-body)",
        backdropFilter: "blur(22px) saturate(160%)",
        WebkitBackdropFilter: "blur(22px) saturate(160%)"
    };
    const shelfSurfaceStyle: React.CSSProperties = {
        fontFamily: "var(--font-body)",
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)"
    };
    const railTitleClass = `whitespace-nowrap ${isLightMode ? "text-slate-700" : "text-slate-300"} font-semibold transition-opacity duration-150`;
    const railTitleStyle = { fontSize: "14px", letterSpacing: "0.025em", fontFamily: "var(--font-body)" };
    const railHeaderRowClass = "flex h-9 shrink-0 items-center";
    const headerActionButtonClass = `!inline-flex h-8 !h-8 w-8 !w-8 shrink-0 items-center justify-center !rounded-md border border-transparent !bg-transparent !p-0 !text-[var(--text-primary)] !shadow-none transition-[background,border-color,color] duration-200 hover:!rounded-md hover:border-[rgba(var(--primary-five-rgb),0.14)] hover:!bg-[rgba(var(--primary-five-rgb),0.08)] hover:!text-[var(--text-primary)] hover:!shadow-none hover:!transform-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-30`;
    const headerActionIconClass = "h-4 w-4";
    const documentToolButtonClass = `resume-edit-control !inline-flex h-5 !h-5 w-7 !w-7 min-w-7 shrink-0 items-center justify-center rounded-none border border-transparent !bg-transparent !p-0 shadow-none transition-[background,border-color,color,transform] active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 ${
        isLightMode ? "text-slate-600 hover:border-slate-300 hover:!bg-slate-900/[0.06] hover:text-slate-950" : "text-slate-400 hover:border-white/14 hover:!bg-white/[0.08] hover:text-slate-100"
    }`;
    const shelfControlLabelClass = `!text-[10px] font-medium leading-none ${isLightMode ? "text-slate-500" : "text-slate-400"}`;
    const shelfSegmentGroupClass = `flex !h-7 !max-h-none items-center gap-0.5 rounded-md border p-0.5 ${
        isLightMode ? "border-slate-300/80 bg-slate-100/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]" : "border-white/10 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
    }`;
    const shelfSegmentButtonClass = `relative !inline-flex !h-6 !max-h-none min-h-0 !w-auto !min-w-0 shrink-0 items-center justify-center rounded-none border border-transparent !bg-transparent !px-2 !py-0 !text-[10px] font-semibold leading-none !shadow-none transition-[background,border-color,color,transform] active:scale-95 ${
        isLightMode ? "text-slate-600 hover:border-slate-300 hover:!bg-white/85 hover:text-slate-950" : "text-slate-400 hover:border-white/12 hover:!bg-white/[0.07] hover:text-slate-100"
    }`;
    const shelfSegmentIndicatorClass = `pointer-events-none absolute bottom-0.5 left-1.5 right-1.5 h-px rounded-full ${isLightMode ? "bg-sky-600 shadow-[0_0_10px_rgba(2,132,199,0.38)]" : "bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.65)]"}`;
    const shelfStepperButtonClass = `resume-edit-control !inline-flex !h-6 !max-h-none !w-6 min-h-0 !min-w-0 shrink-0 items-center justify-center rounded-none border border-transparent !bg-transparent !p-0 !text-[11px] font-medium leading-none !shadow-none transition-[background,border-color,color,transform] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 ${
        isLightMode ? "text-slate-600 hover:border-slate-300 hover:!bg-white/85 hover:text-slate-950" : "text-slate-400 hover:border-white/12 hover:!bg-white/[0.08] hover:text-slate-100"
    }`;
    const shelfStepperControlClass = "flex w-fit min-w-0 flex-col items-center gap-1.5";
    const shelfStepperLabelClass = "w-full text-center";
    const shelfStepperValueClass = `min-w-10 text-center !text-[13px] font-semibold leading-none ${isLightMode ? "text-slate-800" : "text-slate-200"}`;
    const shelfStepperRowClass = `grid grid-cols-[24px_44px_24px] items-center rounded-md border p-0.5 ${
        isLightMode ? "border-slate-300/80 bg-slate-100/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]" : "border-white/10 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
    }`;

    return {
        canvasViewportRef,
        resumeDocumentContentRef,
        pageSize,
        setPageSize,
        zoomMode,
        setZoomMode,
        manualZoom,
        setManualZoom,
        animatedCanvasZoom,
        isPageStyleShelfOpen,
        titleFontSize,
        setTitleFontSize,
        headerFontSize,
        setHeaderFontSize,
        bodyFontSize,
        setBodyFontSize,
        pageMarginPt,
        setPageMarginPt,
        paperLayoutFormat,
        setPaperLayoutFormat,
        fontPreviewTarget,
        setFontPreviewTarget,
        isMarginPreviewVisible,
        setIsMarginPreviewVisible,
        isPageFormatPreviewVisible,
        setIsPageFormatPreviewVisible,
        isSectionGapPreviewVisible,
        setIsSectionGapPreviewVisible,
        getCurrentResumeFormatting,
        applyResumeFormatting,
        paperMetrics,
        resumePageCount,
        resumePageStride,
        resumeCanvasHeight,
        zoomPercent,
        scaledCanvasWidth,
        scaledCanvasHeight,
        canvasNeedsHorizontalScroll,
        canvasNeedsVerticalScroll,
        canvasViewportStyle,
        pdfPreviewViewportStyle,
        bottomControlsViewportStyle,
        canvasHorizontalOverflow,
        isPageStyleShelfCompact,
        printWidth,
        printHeight,
        documentSectionGapPx,
        documentSectionGapStyle,
        currentResumeFormatting,
        handleFitZoom,
        handleTogglePageStyleShelf,
        closePageStyleShelf,
        resumeChromeRootClass,
        resumeChromeBackground,
        headerShellStyle,
        railShellStyle,
        rightRailShellStyle,
        toolbarSurfaceStyle,
        shelfSurfaceStyle,
        railTitleClass,
        railTitleStyle,
        railHeaderRowClass,
        headerActionButtonClass,
        headerActionIconClass,
        documentToolButtonClass,
        shelfControlLabelClass,
        shelfSegmentGroupClass,
        shelfSegmentButtonClass,
        shelfSegmentIndicatorClass,
        shelfStepperButtonClass,
        shelfStepperControlClass,
        shelfStepperLabelClass,
        shelfStepperValueClass,
        shelfStepperRowClass
    };
};
