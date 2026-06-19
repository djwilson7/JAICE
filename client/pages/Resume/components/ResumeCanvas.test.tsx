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
        window.HTMLElement.prototype.scrollBy = vi.fn();
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
        expect(container.querySelector('.resume-canvas-document-content')).toHaveClass('resume-page-content');
    });

    it('places a page divider between the retained and reflowed editor segments', () => {
        const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
        HTMLElement.prototype.getBoundingClientRect = function () {
            const segmentId = (this as HTMLElement).dataset.resumeSegmentId;
            const top = segmentId === 'segment-a' ? 100 : segmentId === 'segment-b' ? 200 : 0;
            const height = segmentId ? 20 : 0;
            return {
                x: 0,
                y: top,
                width: 800,
                height,
                top,
                right: 800,
                bottom: top + height,
                left: 0,
                toJSON: () => ({})
            } as DOMRect;
        };
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
            pageBreakAnchors: [{ pageNumber: 2, segmentId: 'segment-b' }],
            isPageFormatPreviewVisible: false,
            isMarginPreviewVisible: false,
            children: (
                <>
                    <div data-resume-segment-id="segment-a">First segment</div>
                    <div data-resume-segment-id="segment-b">Second segment</div>
                </>
            ),
        };

        try {
            render(<ResumeCanvas {...props} />);
            expect(screen.getByText('Page 2').closest('.resume-canvas-page-break')).toHaveStyle({
                top: '160px'
            });
        } finally {
            HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
        }
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

    it('routes wheel input over document fields to the canvas viewport', () => {
        const ref = { current: null };
        const props = {
            canvasViewportRef: ref,
            resumeDocumentContentRef: { current: null },
            registerResumeDocumentContentElement: vi.fn(),
            canvasNeedsHorizontalScroll: false,
            canvasNeedsVerticalScroll: true,
            canvasViewportStyle: {},
            canvasHorizontalOverflow: 0,
            scaledCanvasWidth: 800,
            scaledCanvasHeight: 1600,
            paperMetrics: { width: 800, height: 1000, dimensionLabel: { width: '8.5in', height: '11in' } } as any,
            resumeCanvasHeight: 1600,
            animatedCanvasZoom: 1,
            fontPreviewTarget: null,
            documentCssVariables,
            resumePageCount: 2,
            resumePageStride: 1000,
            isPageFormatPreviewVisible: false,
            isMarginPreviewVisible: false,
            children: <textarea aria-label="Resume field" />,
        };

        render(<ResumeCanvas {...props} />);
        const viewport = ref.current as unknown as HTMLDivElement;
        const scrollBy = vi.spyOn(viewport, 'scrollBy');

        fireEvent.wheel(screen.getByLabelText('Resume field'), {
            deltaX: 3,
            deltaY: 40,
            deltaMode: WheelEvent.DOM_DELTA_PIXEL
        });

        expect(scrollBy).toHaveBeenCalledWith({
            left: 3,
            top: 40,
            behavior: 'auto'
        });
    });
});
