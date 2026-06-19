import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useResumeViewportLayout } from "./useResumeViewportLayout";

const makeViewport = (width: number, height: number) => {
    const element = document.createElement("div");
    Object.defineProperties(element, {
        clientWidth: { configurable: true, value: width },
        clientHeight: { configurable: true, value: height }
    });
    element.scrollTo = vi.fn();
    return element;
};

describe("useResumeViewportLayout", () => {
    it("remeasures and reobserves a replacement canvas viewport after PDF preview unmounts it", () => {
        const observe = vi.fn();
        const disconnect = vi.fn();
        const originalResizeObserver = globalThis.ResizeObserver;
        globalThis.ResizeObserver = class {
            observe = observe;
            unobserve = vi.fn();
            disconnect = disconnect;
        } as unknown as typeof ResizeObserver;

        try {
            const { result } = renderHook(() => useResumeViewportLayout({
                paperMetrics: {
                    width: 816,
                    height: 1056,
                    widthPt: 612,
                    heightPt: 792,
                    printName: "Letter",
                    label: "Letter",
                    standardLabel: "US & Canada",
                    dimensionLabel: { width: "8.5 in", height: "11 in" }
                },
                pageMarginPt: 54,
                isLeftRailCollapsed: true,
                isRightRailCollapsed: true,
                zoomMode: "fit",
                setZoomMode: vi.fn(),
                manualZoom: 1
            }));
            const initialViewport = makeViewport(1000, 800);
            const restoredViewport = makeViewport(900, 700);

            act(() => result.current.registerCanvasViewportElement(initialViewport));
            expect(result.current.viewableCanvasWidth).toBe(936);
            expect(observe).toHaveBeenCalledWith(initialViewport);

            act(() => result.current.registerCanvasViewportElement(null));
            expect(disconnect).toHaveBeenCalled();

            act(() => result.current.registerCanvasViewportElement(restoredViewport));
            expect(result.current.viewableCanvasWidth).toBe(836);
            expect(observe).toHaveBeenCalledWith(restoredViewport);
        } finally {
            globalThis.ResizeObserver = originalResizeObserver;
        }
    });
});
