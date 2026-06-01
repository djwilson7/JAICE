import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FontPreviewTarget, PageSize, PaperLayoutFormat, ResumeFormatting, ZoomMode } from "../types";
import {
    PAPER_SIZES,
    SECTION_GAP_PX,
    clampFitZoom,
    defaultResumeFormatting,
    normalizeResumeFormatting
} from "../formatting";

export const useResumeFormatting = (isLightMode: boolean) => {
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
    const fitZoom = useMemo(() => {
        if (!canvasViewportSize.width || !canvasViewportSize.height) return 1;

        const closedToolbarChromeHeight = 88;
        const openShelfChromeHeight = 200;
        const availableWidth = Math.max(0, canvasViewportSize.width - 64);
        const availableHeight = Math.max(
            0,
            canvasViewportSize.height - (isPageStyleShelfOpen ? openShelfChromeHeight : closedToolbarChromeHeight)
        );
        return clampFitZoom(Math.min(availableWidth / paperMetrics.width, availableHeight / paperMetrics.height));
    }, [canvasViewportSize.height, canvasViewportSize.width, isPageStyleShelfOpen, paperMetrics.height, paperMetrics.width]);
    const canvasZoom = zoomMode === "fit" ? fitZoom : manualZoom;
    const zoomPercent = Math.round(animatedCanvasZoom * 100);
    const scaledCanvasWidth = paperMetrics.width * animatedCanvasZoom;
    const scaledCanvasHeight = resumeCanvasHeight * animatedCanvasZoom;
    const canvasHorizontalPadding = 64;
    const canvasVerticalPadding = 80;
    const canvasNeedsHorizontalScroll = scaledCanvasWidth + canvasHorizontalPadding > canvasViewportSize.width + 1;
    const canvasNeedsVerticalScroll = scaledCanvasHeight + canvasVerticalPadding > canvasViewportSize.height + 1;
    const isPageStyleShelfCompact = canvasViewportSize.width > 0 && canvasViewportSize.width <= 1000;
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

    const resumeChromeRootClass = isLightMode
        ? "flex h-full min-h-0 w-full flex-col text-slate-900 relative overflow-hidden select-none"
        : "flex h-full min-h-0 w-full flex-col text-slate-100 relative overflow-hidden select-none";
    const resumeChromeBackground = isLightMode
        ? "radial-gradient(circle at 45% 0%, rgba(14, 116, 144, 0.10), transparent 34%), linear-gradient(135deg, #e5e7eb, #d1d5db 48%, #e2e8f0)"
        : "radial-gradient(circle at 45% 0%, rgba(14, 116, 144, 0.18), transparent 34%), linear-gradient(135deg, rgba(2, 6, 23, 0.94), rgba(15, 23, 42, 0.98) 46%, rgba(2, 6, 23, 0.96))";
    const headerShellStyle: React.CSSProperties = {
        background: isLightMode ? "rgba(248, 250, 252, 0.86)" : "rgba(2, 6, 23, 0.72)",
        borderColor: isLightMode ? "rgba(100, 116, 139, 0.24)" : "rgba(148, 163, 184, 0.14)",
        backdropFilter: "blur(18px)",
        fontFamily: "var(--font-body)"
    };
    const railShellStyle: React.CSSProperties = {
        background: isLightMode
            ? "linear-gradient(180deg, rgba(248, 250, 252, 0.92), rgba(226, 232, 240, 0.82))"
            : "linear-gradient(180deg, rgba(2, 6, 23, 0.84), rgba(15, 23, 42, 0.72))",
        borderColor: isLightMode ? "rgba(100, 116, 139, 0.24)" : "rgba(148, 163, 184, 0.14)",
        backdropFilter: "blur(18px)"
    };
    const rightRailShellStyle: React.CSSProperties = {
        background: isLightMode
            ? "linear-gradient(180deg, rgba(248, 250, 252, 0.94), rgba(226, 232, 240, 0.86))"
            : "linear-gradient(180deg, rgba(2, 6, 23, 0.9), rgba(15, 23, 42, 0.78))",
        borderColor: isLightMode ? "rgba(100, 116, 139, 0.24)" : "rgba(148, 163, 184, 0.14)",
        backdropFilter: "blur(18px)",
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
    const headerActionButtonClass = `!inline-flex h-8 !h-8 w-8 !w-8 shrink-0 items-center justify-center rounded-lg border border-transparent !bg-transparent !p-0 transition-colors duration-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
        isLightMode ? "hover:border-slate-300/70 hover:!bg-slate-900/[0.055]" : "hover:border-white/10 hover:!bg-white/[0.055]"
    }`;
    const headerActionIconClass = "h-4 w-4";
    const documentToolButtonClass = `resume-edit-control !inline-flex h-5 !h-5 w-7 !w-7 min-w-7 shrink-0 items-center justify-center rounded-none border border-transparent !bg-transparent !p-0 shadow-none transition-[background,border-color,color,transform] active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 ${
        isLightMode ? "text-slate-600 hover:border-slate-300 hover:!bg-slate-900/[0.06] hover:text-slate-950" : "text-slate-400 hover:border-white/14 hover:!bg-white/[0.08] hover:text-slate-100"
    }`;
    const shelfSectionClass = "flex h-full w-fit min-w-max flex-col justify-between py-3";
    const shelfSectionTitleClass = `resume-page-style-shelf-title self-center text-center !text-[10px] font-semibold leading-none ${isLightMode ? "text-slate-800" : "text-slate-200/95"}`;
    const shelfControlLabelClass = `!text-[10px] font-medium leading-none ${isLightMode ? "text-slate-500" : "text-slate-400"}`;
    const shelfDividerClass = `my-3 w-px bg-gradient-to-b from-transparent ${isLightMode ? "via-slate-300" : "via-white/16"} to-transparent`;
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
        isPageStyleShelfCompact,
        printWidth,
        printHeight,
        documentSectionGapPx,
        documentSectionGapStyle,
        currentResumeFormatting,
        handleFitZoom,
        handleTogglePageStyleShelf,
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
        shelfSectionClass,
        shelfSectionTitleClass,
        shelfControlLabelClass,
        shelfDividerClass,
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
