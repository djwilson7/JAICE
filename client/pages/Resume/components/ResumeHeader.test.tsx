import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ResumeHeader } from './ResumeHeader';

describe('ResumeHeader', () => {
    const defaultProps: any = {
        isLightMode: true,
        isLeftRailCollapsed: false,
        onToggleLeftRail: vi.fn(),
        isRightRailCollapsed: false,
        onToggleRightRail: vi.fn(),
        isMaster: false,
        setIsMaster: vi.fn(),
        resumeName: 'Test Resume',
        setResumeName: vi.fn(),
        isDirty: false,
        setIsDirty: vi.fn(),
        activeResumeId: '1',
        isDraft: false,
        loadingSave: false,
        autoSaveEnabled: true,
        setAutoSaveEnabled: vi.fn(),
        isPdfPreviewOpen: false,
        isGeneratingPdfPreview: false,
        handleSaveResume: vi.fn(),
        togglePdfPreview: vi.fn(),
        openPdfPreview: vi.fn(),
        documentTextStats: { chars: 420, words: 72 },
        activeFieldTextStats: null
    };

    it('renders and handles interactions', () => {
        const { rerender } = render(<ResumeHeader {...defaultProps} />);

        // Name input
        const nameInput = screen.getByDisplayValue('Test Resume');
        fireEvent.change(nameInput, { target: { value: 'New Name' } });
        expect(defaultProps.setResumeName).toHaveBeenCalledWith('New Name');
        expect(defaultProps.setIsDirty).toHaveBeenCalledWith(true);

        fireEvent.keyDown(nameInput, { key: 'Enter' });

        // Left rail toggle
        const leftRailBtn = screen.getByLabelText('Close resume drawer');
        fireEvent.click(leftRailBtn);
        expect(defaultProps.onToggleLeftRail).toHaveBeenCalled();

        // Right rail toggle
        const rightRailBtn = screen.getByLabelText('Close Jaice drawer');
        fireEvent.click(rightRailBtn);
        expect(defaultProps.onToggleRightRail).toHaveBeenCalled();

        // Master toggle
        const masterBtn = screen.getByTitle('Set as Master Profile');
        fireEvent.click(masterBtn);
        expect(defaultProps.setIsMaster).toHaveBeenCalledWith(true);

        // Save (need to make sure it's not disabled)
        // It's currently disabled because isDirty=false and activeResumeId='1', let's click on it when it's re-rendered with isDirty=true
        rerender(<ResumeHeader {...defaultProps} isDirty={true} />);
        const saveBtnEnabled = screen.getByLabelText('Save current resume changes'); 
        fireEvent.click(saveBtnEnabled);
        expect(defaultProps.handleSaveResume).toHaveBeenCalled();

        // PDF Preview toggle
        const pdfToggleBtn = screen.getByLabelText('Preview PDF');
        fireEvent.click(pdfToggleBtn);
        expect(defaultProps.togglePdfPreview).toHaveBeenCalled();

        // Open PDF Preview
        const pdfOpenBtn = screen.getByLabelText('Preview PDF before download');
        fireEvent.click(pdfOpenBtn);
        expect(defaultProps.openPdfPreview).toHaveBeenCalled();

        fireEvent.click(screen.getByLabelText('Disable auto-save'));
        expect(defaultProps.setAutoSaveEnabled).toHaveBeenCalled();
        expect(screen.getByLabelText('Disable auto-save')).toHaveClass('resume-auto-save-button--active');
    });

    it('renders with collapsed rails and master mode', () => {
        render(<ResumeHeader {...defaultProps} isLeftRailCollapsed={true} isRightRailCollapsed={true} isMaster={true} isDirty={true} />);
        
        expect(screen.getByLabelText('Open resume drawer')).toBeTruthy();
        expect(screen.getByLabelText('Open Jaice drawer')).toBeTruthy();
        expect(screen.getByTitle('Active Master Profile (Click to unset)')).toBeTruthy();
        expect(screen.getByText('Unsaved changes')).toBeTruthy();
    });

    it('renders in draft mode', () => {
        render(<ResumeHeader {...defaultProps} isDraft={true} />);
        expect(screen.getByText('Unsaved AI draft')).toBeTruthy();
    });

    it('handles loading states', () => {
        render(<ResumeHeader {...defaultProps} loadingSave={true} isGeneratingPdfPreview={true} isPdfPreviewOpen={true} />);
        expect(screen.getByLabelText('Back to editing')).toBeTruthy();
    });

    it('replaces document totals with hovered-field statistics at the save-status font size', () => {
        const { rerender } = render(<ResumeHeader {...defaultProps} />);
        const statistics = screen.getByLabelText('Resume text statistics');

        expect(statistics).toHaveTextContent('72 words · 420 characters');
        expect(statistics).toHaveClass('resume-header-status-text');

        rerender(
            <ResumeHeader
                {...defaultProps}
                activeFieldTextStats={{ label: 'Summary', chars: 85, words: 14 }}
            />
        );

        expect(statistics).toHaveTextContent('14/72 words · 85/420 characters');
        expect(statistics).toHaveClass('resume-header-status-text');
    });

    it('uses singular labels for one character and one word', () => {
        render(
            <ResumeHeader
                {...defaultProps}
                documentTextStats={{ chars: 1, words: 1 }}
            />
        );

        expect(screen.getByLabelText('Resume text statistics')).toHaveTextContent(
            '1 word · 1 character'
        );
    });
});
