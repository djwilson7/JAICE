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
        act(() => { result.setIsSectionGapPreviewVisible(true); });

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

        expect(result.resumeChromeRootClass).toBeDefined();
        
        rerender(<TestComponent p={{ ...mockProps, isLeftRailCollapsed: true }} />);
    });
});
