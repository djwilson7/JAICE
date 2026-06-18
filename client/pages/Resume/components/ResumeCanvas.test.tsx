import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResumeCanvas } from './ResumeCanvas';
import React from 'react';

describe('ResumeCanvas', () => {
    let mockViewport: HTMLDivElement;
    const documentCssVariables = {
        "--resume-title-font-size": "24pt",
        "--resume-header-font-size": "16pt",
        "--resume-subheader-font-size": "14pt",
        "--resume-body-font-size": "12pt",
        "--resume-section-gap": "12pt",
        "--resume-inner-section-gap": "8pt",
        "--resume-title-line-height": 1.05,
        "--resume-header-line-height": 1.1,
        "--resume-subheader-line-height": 1.15,
        "--resume-body-line-height": 1.2,
        "--resume-line-height": 1.2,
        "--resume-page-margin": "36pt",
        "--resume-font-family": "Inter, sans-serif"
    } as React.CSSProperties;

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
            registerResumeDocumentContentElement: vi.fn(),
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
            documentCssVariables,
            resumePageCount: 3,
            resumePageStride: 1000,
            isPageFormatPreviewVisible: true,
            isMarginPreviewVisible: true,
            children: <div>Child</div>,
        };
        const { container } = render(<ResumeCanvas {...props} />);
        expect(container).toBeTruthy();
    });

    it('renders page split guides at physical page-height intervals', () => {
        const ref = { current: null };
        const props = {
            canvasViewportRef: ref,
            resumeDocumentContentRef: { current: null },
            registerResumeDocumentContentElement: vi.fn(),
            canvasNeedsHorizontalScroll: false,
            canvasNeedsVerticalScroll: true,
            canvasViewportStyle: {},
            canvasHorizontalOverflow: 0,
            scaledCanvasWidth: 794,
            scaledCanvasHeight: 3369,
            paperMetrics: { width: 794, height: 1123, dimensionLabel: { width: '210 mm', height: '297 mm' } } as any,
            resumeCanvasHeight: 3369,
            animatedCanvasZoom: 1,
            fontPreviewTarget: null,
            documentCssVariables,
            resumePageCount: 3,
            resumePageStride: 1123,
            isPageFormatPreviewVisible: false,
            isMarginPreviewVisible: false,
            children: <div>Child</div>,
        };

        render(<ResumeCanvas {...props} />);

        const firstGuide = screen.getByText('Page 2').closest('.resume-canvas-page-guide');
        const secondGuide = screen.getByText('Page 3').closest('.resume-canvas-page-guide');

        expect(firstGuide).toHaveStyle({ top: '1123px' });
        expect(secondGuide).toHaveStyle({ top: '2246px' });
    });

    it('hides page number labels while hovering the canvas', () => {
        const ref = { current: null };
        const props = {
            canvasViewportRef: ref,
            resumeDocumentContentRef: { current: null },
            registerResumeDocumentContentElement: vi.fn(),
            canvasNeedsHorizontalScroll: false,
            canvasNeedsVerticalScroll: true,
            canvasViewportStyle: {},
            canvasHorizontalOverflow: 0,
            scaledCanvasWidth: 816,
            scaledCanvasHeight: 2112,
            paperMetrics: { width: 816, height: 1056, dimensionLabel: { width: '8.5 in', height: '11 in' } } as any,
            resumeCanvasHeight: 2112,
            animatedCanvasZoom: 1,
            fontPreviewTarget: null,
            documentCssVariables,
            resumePageCount: 2,
            resumePageStride: 1056,
            isPageFormatPreviewVisible: false,
            isMarginPreviewVisible: false,
            children: <div>Child</div>,
        };

        const { container } = render(<ResumeCanvas {...props} />);
        const canvasScale = container.querySelector('#resume-canvas-scale') as HTMLElement;
        const label = screen.getByText('Page 2');

        expect(label).not.toHaveClass('resume-canvas-page-guide-label-hidden');

        fireEvent.mouseEnter(canvasScale);
        expect(label).toHaveClass('resume-canvas-page-guide-label-hidden');

        fireEvent.mouseLeave(canvasScale);
        expect(label).not.toHaveClass('resume-canvas-page-guide-label-hidden');
    });

    it('handles null viewport ref safely', () => {
        const ref = { current: null };
        const props = {
            canvasViewportRef: ref,
            resumeDocumentContentRef: { current: null },
            registerResumeDocumentContentElement: vi.fn(),
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
            documentCssVariables,
            resumePageCount: 1,
            resumePageStride: 1000,
            isPageFormatPreviewVisible: false,
            isMarginPreviewVisible: false,
            children: <div>Child</div>,
        };
        const { container } = render(<ResumeCanvas {...props} />);
        expect(container).toBeTruthy();
    });
});
