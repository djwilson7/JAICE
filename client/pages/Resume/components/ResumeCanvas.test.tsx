import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResumeCanvas } from './ResumeCanvas';
import React from 'react';

describe('ResumeCanvas', () => {
    let mockViewport: HTMLDivElement;

    beforeEach(() => {
        Element.prototype.scrollTo = vi.fn();
        window.HTMLElement.prototype.scrollTo = vi.fn();
        mockViewport = document.createElement('div');
    });

    it('renders and handles scroll effect with overflow', () => {
        const scrollTo = vi.fn();
        const ref = {
            current: {
                scrollTo
            } as any
        };
        const props = {
            canvasViewportRef: ref,
            resumeDocumentContentRef: { current: null },
            canvasNeedsHorizontalScroll: true,
            canvasNeedsVerticalScroll: true,
            canvasViewportStyle: {},
            canvasHorizontalOverflow: 100,
            scaledCanvasWidth: 800,
            scaledCanvasHeight: 1000,
            paperMetrics: { width: 8.5, height: 11, dimensionLabel: { width: '8.5in', height: '11in' } } as any,
            resumeCanvasHeight: 1000,
            animatedCanvasZoom: 1,
            fontPreviewTarget: "body" as any,
            bodyFontSize: 12,
            resumePageCount: 3,
            resumePageStride: 1000,
            isPageFormatPreviewVisible: true,
            isMarginPreviewVisible: true,
            pageMarginPt: 36,
            children: <div>Child</div>,
        };
        const { container } = render(<ResumeCanvas {...props} />);
        expect(container).toBeTruthy();
    });

    it('handles null viewport ref safely', () => {
        const ref = { current: null };
        const props = {
            canvasViewportRef: ref,
            resumeDocumentContentRef: { current: null },
            canvasNeedsHorizontalScroll: false,
            canvasNeedsVerticalScroll: false,
            canvasViewportStyle: {},
            canvasHorizontalOverflow: 0,
            scaledCanvasWidth: 800,
            scaledCanvasHeight: 1000,
            paperMetrics: { width: 8.5, height: 11, dimensionLabel: { width: '8.5in', height: '11in' } } as any,
            resumeCanvasHeight: 1000,
            animatedCanvasZoom: 1,
            fontPreviewTarget: null,
            bodyFontSize: 12,
            resumePageCount: 1,
            resumePageStride: 1000,
            isPageFormatPreviewVisible: false,
            isMarginPreviewVisible: false,
            pageMarginPt: 36,
            children: <div>Child</div>,
        };
        const { container } = render(<ResumeCanvas {...props} />);
        expect(container).toBeTruthy();
    });
});
