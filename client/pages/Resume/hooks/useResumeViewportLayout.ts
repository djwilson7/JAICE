import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import type { PaperMetrics, ZoomMode } from "../types";
import { clampFitZoom } from "../formatting";
import { ptToPx } from "../utils/documentUnits";

const CANVAS_EDGE_GUTTER = 32;
const OVERLAY_EDGE_INSET = 12;
const CANVAS_HEADER_INSET = 80;
const CANVAS_TOOLBAR_INSET = 88;
const CANVAS_OPEN_SHELF_FULL_INSET = 146;
const CANVAS_OPEN_SHELF_COMPACT_INSET = 200;
const CANVAS_RAIL_INSET = 300;
const PAGE_STYLE_SHELF_EXPANDED_MIN_WIDTH = 860;

type UseResumeViewportLayoutParams = {
    paperMetrics: PaperMetrics;
    pageMarginPt: number;
    isLeftRailCollapsed: boolean;
    isRightRailCollapsed: boolean;
    zoomMode: ZoomMode;
    setZoomMode: React.Dispatch<React.SetStateAction<ZoomMode>>;
    manualZoom: number;
};

export const useResumeViewportLayout = ({
    paperMetrics,
    pageMarginPt,
    isLeftRailCollapsed,
    isRightRailCollapsed,
    zoomMode,
    setZoomMode,
    manualZoom
}: UseResumeViewportLayoutParams) => {
    const canvasViewportRef = useRef<HTMLDivElement>(null);
    const resumeDocumentContentRef = useRef<HTMLDivElement>(null);
    const [resumeDocumentContentElement, setResumeDocumentContentElement] = useState<HTMLDivElement | null>(null);
    const [canvasViewportSize, setCanvasViewportSize] = useState({ width: 0, height: 0 });
    const [resumeDocumentContentHeight, setResumeDocumentContentHeight] = useState(0);
    const [animatedCanvasZoom, setAnimatedCanvasZoom] = useState(1);
    const animatedCanvasZoomRef = useRef(animatedCanvasZoom);
    const [isPageStyleShelfOpen, setIsPageStyleShelfOpen] = useState(false);

    const measureCanvasViewport = useCallback(() => {
        const container = canvasViewportRef.current;
        if (!container) return;
        setCanvasViewportSize({
            width: container.clientWidth,
            height: container.clientHeight
        });
    }, []);

    const registerResumeDocumentContentElement = useCallback((element: HTMLDivElement | null) => {
        resumeDocumentContentRef.current = element;
        setResumeDocumentContentElement(element);
    }, []);

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
        const content = resumeDocumentContentElement;
        if (!content) return;
        const updateContentHeight = () => setResumeDocumentContentHeight(content.scrollHeight);
        updateContentHeight();
        const observer = new ResizeObserver(updateContentHeight);
        observer.observe(content);
        return () => observer.disconnect();
    }, [resumeDocumentContentElement]);

    const pageMarginPx = ptToPx(pageMarginPt);
    const paperWidthPx = ptToPx(paperMetrics.widthPt);
    const paperHeightPx = ptToPx(paperMetrics.heightPt);
    const resumePageContentHeight = Math.max(1, paperHeightPx - pageMarginPx * 2);
    const resumeDocumentBodyHeight = Math.max(0, resumeDocumentContentHeight - pageMarginPx * 2);
    const resumePageCount = Math.max(1, Math.ceil(resumeDocumentBodyHeight / resumePageContentHeight));
    const resumePageStride = resumePageContentHeight;
    const resumePageBreakOffset = pageMarginPx;
    const resumeCanvasHeight = resumePageCount * paperHeightPx;
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
            viewableCanvasHeight / paperHeightPx
        ));
    }, [paperHeightPx, paperMetrics.width, viewableCanvasHeight, viewableCanvasWidth]);
    const canvasZoom = zoomMode === "fit" ? fitZoom : manualZoom;
    const zoomPercent = Math.round(animatedCanvasZoom * 100);
    const scaledCanvasWidth = paperWidthPx * animatedCanvasZoom;
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
            if (progress < 1) frameId = requestAnimationFrame(animateZoom);
            else setAnimatedCanvasZoom(canvasZoom);
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

    return {
        canvasViewportRef,
        resumeDocumentContentRef,
        registerResumeDocumentContentElement,
        animatedCanvasZoom,
        isPageStyleShelfOpen,
        setIsPageStyleShelfOpen,
        paperMetrics,
        resumePageCount,
        resumePageStride,
        resumePageBreakOffset,
        resumeCanvasHeight,
        zoomPercent,
        scaledCanvasWidth,
        scaledCanvasHeight,
        canvasNeedsHorizontalScroll,
        canvasNeedsVerticalScroll,
        canvasViewportStyle,
        pdfPreviewViewportStyle,
        bottomControlsViewportStyle,
        viewableCanvasWidth,
        viewableCanvasHeight,
        canvasHorizontalOverflow,
        isPageStyleShelfCompact,
        handleFitZoom,
        handleTogglePageStyleShelf: () => setIsPageStyleShelfOpen((isOpen) => !isOpen),
        closePageStyleShelf: () => setIsPageStyleShelfOpen(false)
    };
};
