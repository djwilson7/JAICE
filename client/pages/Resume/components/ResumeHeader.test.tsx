import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ResumeHeader } from './ResumeHeader';

describe('ResumeHeader', () => {
    const defaultProps: any = {
        isLightMode: true,
        headerShellStyle: {},
        headerActionButtonClass: 'btn',
        headerActionIconClass: 'icon',
        isLeftRailCollapsed: false,
        setIsLeftRailCollapsed: vi.fn(),
        isRightRailCollapsed: false,
        setIsRightRailCollapsed: vi.fn(),
        isMaster: false,
        setIsMaster: vi.fn(),
        resumeName: 'Test Resume',
        setResumeName: vi.fn(),
        isDirty: false,
        setIsDirty: vi.fn(),
        activeResumeId: '1',
        isDraft: false,
        loadingSave: false,
        isPdfPreviewOpen: false,
        isGeneratingPdfPreview: false,
        handleSaveResume: vi.fn(),
        togglePdfPreview: vi.fn(),
        openPdfPreview: vi.fn()
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
        expect(defaultProps.setIsLeftRailCollapsed).toHaveBeenCalled();

        // Right rail toggle
        const rightRailBtn = screen.getByLabelText('Close Jaice drawer');
        fireEvent.click(rightRailBtn);
        expect(defaultProps.setIsRightRailCollapsed).toHaveBeenCalled();

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
});
