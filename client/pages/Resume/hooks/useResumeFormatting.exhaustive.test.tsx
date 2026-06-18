import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useResumeFormatting } from './useResumeFormatting';
import { defaultResumeFormatting } from '../formatting';
import React, { useLayoutEffect } from 'react';

vi.mock('../resumeDiagnostics', () => ({ isResumeDebugEnabled: () => false }));

const mockProps = {
    isLightMode: true,
    isLeftRailCollapsed: false,
    isRightRailCollapsed: false,
} as any;

describe('useResumeFormatting final', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('covers all paths with real mount', async () => {
        const mockViewport = document.createElement('div');
        Object.defineProperty(mockViewport, 'clientWidth', { value: 1000, configurable: true });
        Object.defineProperty(mockViewport, 'clientHeight', { value: 800, configurable: true });
        mockViewport.scrollTo = vi.fn();

        const mockContent = document.createElement('div');
        Object.defineProperty(mockContent, 'scrollHeight', { value: 1500, configurable: true });

        let resizeCb: any;
        vi.stubGlobal('ResizeObserver', class {
            constructor(cb: any) { resizeCb = cb; }
            observe() {}
            unobserve() {}
            disconnect() {}
        });
        vi.stubGlobal('requestAnimationFrame', vi.fn(cb => cb()));

        let result: any;
        const TestComponent = ({ p }: any) => {
            result = useResumeFormatting(p);
            useLayoutEffect(() => {
                (result.canvasViewportRef as any).current = mockViewport;
                (result.resumeDocumentContentRef as any).current = mockContent;
            }, []);
            return null;
        };

        const { rerender } = render(<TestComponent p={mockProps} />);

        // Call functions
        act(() => { result.handleFitZoom(); });
        act(() => { result.handleTogglePageStyleShelf(); });
        act(() => { result.handleTogglePageStyleShelf(); });
        act(() => { result.closePageStyleShelf(); });

        act(() => { result.setZoomMode('manual'); });
        act(() => { result.setManualZoom(1.5); });
        
        act(() => { result.applyResumeFormatting(defaultResumeFormatting()); });
        act(() => { result.applyResumeFormatting(null as any); });

        act(() => { result.setFontPreviewTarget('title'); });
        act(() => { result.setIsMarginPreviewVisible(true); });
        act(() => { result.setIsPageFormatPreviewVisible(true); });
        act(() => { result.setGapPreviewTarget('section'); });

        act(() => { result.setPageSize('letter'); });
        expect(result.printWidth).toBe('8.5in');
        act(() => { result.setPageSize('a4'); });
        expect(result.printWidth).toBe('210mm');

        // Trigger observers
        act(() => { if (resizeCb) resizeCb(); });
        act(() => { window.dispatchEvent(new Event('resize')); });

        // Zoom animation
        vi.useFakeTimers();
        let rafCb: any;
        vi.stubGlobal('requestAnimationFrame', vi.fn(cb => { rafCb = cb; return 1; }));
        act(() => { result.setManualZoom(2); });
        act(() => { vi.advanceTimersByTime(100); });
        if (rafCb) act(() => { rafCb(performance.now()); });

        expect(result.documentCssVariables).toBeDefined();
        
        rerender(<TestComponent p={{ ...mockProps, isLeftRailCollapsed: true }} />);
    });

    it('reattaches content measurement when the resume canvas remounts', async () => {
        const observedElements: Element[] = [];
        vi.stubGlobal('ResizeObserver', class {
            cb: ResizeObserverCallback;
            constructor(cb: ResizeObserverCallback) {
                this.cb = cb;
            }
            observe(element: Element) {
                observedElements.push(element);
                this.cb([], this as unknown as ResizeObserver);
            }
            unobserve() {}
            disconnect() {}
        });
        vi.stubGlobal('requestAnimationFrame', vi.fn(cb => cb(0)));

        let result: ReturnType<typeof useResumeFormatting>;
        const TestComponent = () => {
            result = useResumeFormatting(mockProps);
            return null;
        };

        render(<TestComponent />);

        const shortContent = document.createElement('div');
        Object.defineProperty(shortContent, 'scrollHeight', { value: 900, configurable: true });
        const tallContent = document.createElement('div');
        Object.defineProperty(tallContent, 'scrollHeight', { value: 2600, configurable: true });

        await act(async () => {
            result.registerResumeDocumentContentElement(shortContent);
        });
        expect(result.resumePageCount).toBe(1);

        await act(async () => {
            result.registerResumeDocumentContentElement(null);
        });
        await act(async () => {
            result.registerResumeDocumentContentElement(tallContent);
        });

        expect(observedElements).toContain(shortContent);
        expect(observedElements).toContain(tallContent);
        expect(result.resumePageCount).toBeGreaterThan(1);
    });

    it('keeps fit zoom separate from document formatting values', async () => {
        const mockViewport = document.createElement('div');
        Object.defineProperty(mockViewport, 'clientWidth', { value: 1200, configurable: true });
        Object.defineProperty(mockViewport, 'clientHeight', { value: 900, configurable: true });
        mockViewport.scrollTo = vi.fn();

        vi.stubGlobal('ResizeObserver', class {
            observe() {}
            unobserve() {}
            disconnect() {}
        });
        let rafTimestamp = 0;
        vi.stubGlobal('requestAnimationFrame', vi.fn(cb => {
            rafTimestamp += 300;
            cb(rafTimestamp);
            return 1;
        }));

        let result: ReturnType<typeof useResumeFormatting>;
        const TestComponent = () => {
            result = useResumeFormatting(mockProps);
            useLayoutEffect(() => {
                (result.canvasViewportRef as any).current = mockViewport;
            }, []);
            return null;
        };

        render(<TestComponent />);
        await act(async () => {
            result.applyResumeFormatting({
                pageSize: 'letter',
                titleFontSize: 27,
                headerFontSize: 17,
                subHeaderFontSize: 13,
                bodyFontSize: 11,
                pageMarginPt: 48,
                paperLayoutFormat: 'relaxed',
                innerSectionGapFormat: 'compact'
            });
        });
        const before = result.currentResumeFormatting;

        await act(async () => {
            result.handleFitZoom();
        });

        expect(result.zoomMode).toBe('fit');
        expect(result.currentResumeFormatting).toEqual(before);
    });

    it('opens the page style shelf without changing the current zoom mode', async () => {
        vi.stubGlobal('ResizeObserver', class {
            observe() {}
            unobserve() {}
            disconnect() {}
        });
        vi.stubGlobal('requestAnimationFrame', vi.fn(cb => {
            cb(0);
            return 1;
        }));

        let result: ReturnType<typeof useResumeFormatting>;
        const TestComponent = () => {
            result = useResumeFormatting(mockProps);
            return null;
        };

        render(<TestComponent />);

        await act(async () => {
            result.setZoomMode('manual');
            result.setManualZoom(1);
        });
        await act(async () => {
            result.handleTogglePageStyleShelf();
        });

        expect(result.isPageStyleShelfOpen).toBe(true);
        expect(result.zoomMode).toBe('manual');
    });
});
