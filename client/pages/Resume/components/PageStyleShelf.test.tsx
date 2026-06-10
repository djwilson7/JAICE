import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PageStyleShelf } from './PageStyleShelf';

vi.mock('framer-motion', () => {
    return {
        motion: {
            div: ({ children, onMouseEnter, onMouseLeave, ...props }: any) => (
                <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} {...props}>{children}</div>
            ),
            span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
        },
        AnimatePresence: ({ children }: any) => <>{children}</>,
    };
});

describe('PageStyleShelf', () => {
    const defaultProps = {
        isLightMode: true,
        isPageStyleShelfOpen: true,
        isPageStyleShelfCompact: false,
        shelfControlLabelClass: '',
        shelfSegmentGroupClass: '',
        shelfSegmentButtonClass: '',
        shelfSegmentIndicatorClass: '',
        shelfStepperControlClass: '',
        shelfStepperLabelClass: '',
        shelfStepperRowClass: '',
        shelfStepperButtonClass: '',
        shelfStepperValueClass: '',
        pageSize: 'letter' as const,
        setPageSize: vi.fn(),
        titleFontSize: 24,
        setTitleFontSize: vi.fn(),
        headerFontSize: 16,
        setHeaderFontSize: vi.fn(),
        bodyFontSize: 12,
        setBodyFontSize: vi.fn(),
        pageMarginPt: 36,
        setPageMarginPt: vi.fn(),
        paperLayoutFormat: 'standard' as const,
        setPaperLayoutFormat: vi.fn(),
        setFontPreviewTarget: vi.fn(),
        setIsMarginPreviewVisible: vi.fn(),
        setIsPageFormatPreviewVisible: vi.fn(),
        setIsSectionGapPreviewVisible: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders null when closed', () => {
        const { container } = render(<PageStyleShelf {...defaultProps} isPageStyleShelfOpen={false} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders when open', () => {
        const { container } = render(<PageStyleShelf {...defaultProps} isPageStyleShelfCompact={true} />);
        expect(container.textContent).toContain('Title');
    });

    it('handles title font size changes', () => {
        render(<PageStyleShelf {...defaultProps} />);
        const decTitle = screen.getByLabelText('Decrease title font size');
        const incTitle = screen.getByLabelText('Increase title font size');
        
        fireEvent.click(decTitle);
        const decTitleFn = vi.mocked(defaultProps.setTitleFontSize).mock.calls[0][0] as Function;
        expect(decTitleFn(20)).toBe(19);
        expect(decTitleFn(18)).toBe(18); // clamp
        
        fireEvent.click(incTitle);
        const incTitleFn = vi.mocked(defaultProps.setTitleFontSize).mock.calls[1][0] as Function;
        expect(incTitleFn(20)).toBe(21);
        expect(incTitleFn(34)).toBe(34); // clamp
    });

    it('handles header font size changes', () => {
        render(<PageStyleShelf {...defaultProps} />);
        const decHeader = screen.getByLabelText('Decrease header font size');
        const incHeader = screen.getByLabelText('Increase header font size');
        
        fireEvent.click(decHeader);
        const decHeaderFn = vi.mocked(defaultProps.setHeaderFontSize).mock.calls[0][0] as Function;
        expect(decHeaderFn(14)).toBe(13);
        expect(decHeaderFn(12)).toBe(12); // clamp
        
        fireEvent.click(incHeader);
        const incHeaderFn = vi.mocked(defaultProps.setHeaderFontSize).mock.calls[1][0] as Function;
        expect(incHeaderFn(14)).toBe(15);
        expect(incHeaderFn(22)).toBe(22); // clamp
    });

    it('handles body font size changes', () => {
        render(<PageStyleShelf {...defaultProps} />);
        const decBody = screen.getByLabelText('Decrease body font size');
        const incBody = screen.getByLabelText('Increase body font size');
        
        fireEvent.click(decBody);
        const decBodyFn = vi.mocked(defaultProps.setBodyFontSize).mock.calls[0][0] as Function;
        expect(decBodyFn(11)).toBe(10.5);
        expect(decBodyFn(9)).toBe(9); // clamp
        
        fireEvent.click(incBody);
        const incBodyFn = vi.mocked(defaultProps.setBodyFontSize).mock.calls[1][0] as Function;
        expect(incBodyFn(11)).toBe(11.5);
        expect(incBodyFn(15)).toBe(15); // clamp
    });

    it('handles page margin changes', () => {
        render(<PageStyleShelf {...defaultProps} />);
        const decMargin = screen.getByLabelText('Decrease page margins');
        const incMargin = screen.getByLabelText('Increase page margins');
        
        fireEvent.click(decMargin);
        const decMarginFn = vi.mocked(defaultProps.setPageMarginPt).mock.calls[0][0] as Function;
        expect(decMarginFn(36)).toBe(34);
        expect(decMarginFn(24)).toBe(24); // clamp
        
        fireEvent.click(incMargin);
        const incMarginFn = vi.mocked(defaultProps.setPageMarginPt).mock.calls[1][0] as Function;
        expect(incMarginFn(36)).toBe(38);
        expect(incMarginFn(60)).toBe(60); // clamp
    });

    it('handles format changes', () => {
        render(<PageStyleShelf {...defaultProps} isLightMode={false} pageSize="a4" paperLayoutFormat="compact" />);
        const letterBtn = screen.getByLabelText('Use US & Canada page size');
        fireEvent.click(letterBtn);
        expect(defaultProps.setPageSize).toHaveBeenCalledWith('letter');

        const relaxedBtn = screen.getByLabelText('Relaxed layout spacing');
        fireEvent.click(relaxedBtn);
        expect(defaultProps.setPaperLayoutFormat).toHaveBeenCalledWith('relaxed');
    });

    it('handles section gap preview mouse events', () => {
        render(<PageStyleShelf {...defaultProps} />);
        const sectionGapControl = screen.getByText('Section Gap').parentElement!;
        fireEvent.mouseEnter(sectionGapControl);
        expect(defaultProps.setIsSectionGapPreviewVisible).toHaveBeenCalledWith(true);
        fireEvent.mouseLeave(sectionGapControl);
        expect(defaultProps.setIsSectionGapPreviewVisible).toHaveBeenCalledWith(false);
    });

    it('handles mouse enter/leave on sections', () => {
        const { container } = render(<PageStyleShelf {...defaultProps} />);
        const controls = container.querySelectorAll('.resume-page-style-shelf-control');
        
        // title
        fireEvent.mouseEnter(controls[0]);
        expect(defaultProps.setFontPreviewTarget).toHaveBeenCalledWith('title');
        fireEvent.mouseLeave(controls[0]);
        expect(defaultProps.setFontPreviewTarget).toHaveBeenCalledWith(null);
        
        // header
        fireEvent.mouseEnter(controls[1]);
        expect(defaultProps.setFontPreviewTarget).toHaveBeenCalledWith('header');
        fireEvent.mouseLeave(controls[1]);
        expect(defaultProps.setFontPreviewTarget).toHaveBeenCalledWith(null);

        // body
        fireEvent.mouseEnter(controls[2]);
        expect(defaultProps.setFontPreviewTarget).toHaveBeenCalledWith('body');
        fireEvent.mouseLeave(controls[2]);
        expect(defaultProps.setFontPreviewTarget).toHaveBeenCalledWith(null);

        // margin
        fireEvent.mouseEnter(controls[3]);
        expect(defaultProps.setIsMarginPreviewVisible).toHaveBeenCalledWith(true);
        fireEvent.mouseLeave(controls[3]);
        expect(defaultProps.setIsMarginPreviewVisible).toHaveBeenCalledWith(false);

        // format
        fireEvent.mouseEnter(controls[4]);
        expect(defaultProps.setIsPageFormatPreviewVisible).toHaveBeenCalledWith(true);
        fireEvent.mouseLeave(controls[4]);
        expect(defaultProps.setIsPageFormatPreviewVisible).toHaveBeenCalledWith(false);
    });

    it('handles setter implementations', () => {
        const { container } = render(<PageStyleShelf {...defaultProps} />);
        expect(container).toBeTruthy();
    });
});
