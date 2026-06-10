import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ResumeWorkspace } from './ResumeWorkspace';

vi.mock('./ResumeAlerts', () => ({
    ResumeAlerts: () => <div data-testid="resume-alerts" />
}));
vi.mock('./ResumeCanvas', () => ({
    ResumeCanvas: ({ children }: any) => <div data-testid="resume-canvas">{children}</div>
}));
vi.mock('./ResumeDocumentEditor', () => ({
    ResumeDocumentEditor: () => <div data-testid="resume-document-editor" />
}));
vi.mock('./ResumePdfPreview', () => ({
    ResumePdfPreview: ({ onBackToEdit }: any) => <div data-testid="resume-pdf-preview"><button onClick={onBackToEdit}>Back to edit</button></div>
}));
vi.mock('./PageStyleShelf', () => ({
    PageStyleShelf: () => <div data-testid="page-style-shelf" />
}));
vi.mock('framer-motion', () => ({
    motion: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> }
}));

vi.mock('../resumeApi', () => ({
    saveResumeRenderDiagnostics: vi.fn()
}));
vi.mock('../resumeDiagnostics', () => ({
    RESUME_RENDER_DIAGNOSTICS_VERSION: 1,
    buildResumeRenderDiagnostics: vi.fn().mockReturnValue({}),
    isResumeDebugEnabled: vi.fn().mockReturnValue(false)
}));

import { isResumeDebugEnabled, buildResumeRenderDiagnostics } from '../resumeDiagnostics';
import { saveResumeRenderDiagnostics } from '../resumeApi';

describe('ResumeWorkspace', () => {
    const defaultProps: any = {
        isLightMode: true,
        error: null,
        successMessage: null,
        setError: vi.fn(),
        setSuccessMessage: vi.fn(),
        headerActionButtonClass: '',
        headerActionIconClass: '',
        canvasViewportRef: { current: null },
        resumeDocumentContentRef: { current: null },
        canvasNeedsHorizontalScroll: false,
        canvasNeedsVerticalScroll: false,
        canvasViewportStyle: {},
        pdfPreviewViewportStyle: {},
        bottomControlsViewportStyle: {},
        canvasHorizontalOverflow: 0,
        scaledCanvasWidth: 800,
        scaledCanvasHeight: 1100,
        paperMetrics: { width: 800, height: 1100 },
        resumeCanvasHeight: 1100,
        animatedCanvasZoom: 1,
        fontPreviewTarget: null,
        bodyFontSize: 12,
        resumePageCount: 1,
        resumePageStride: 1100,
        isPageFormatPreviewVisible: false,
        isMarginPreviewVisible: false,
        pageMarginPt: 36,
        resumeData: { contact: {}, summary: '', experience: [], education: [], skills: [] },
        headerContactRows: [],
        showHeaderContactEditors: false,
        changeMetadata: [],
        originalResumeDataBeforeDraft: null,
        summaryRewriteSuggestion: null,
        experienceRewriteSuggestions: {},
        titleFontSize: 24,
        documentSectionGapStyle: {},
        documentSectionGapPx: 10,
        documentTextStyle: {},
        sectionHeadingClass: '',
        sectionHeadingStyle: {},
        inputStyleClass: '',
        boldInputClass: '',
        compactFitMetaInputClass: '',
        compactFitDateInputClass: '',
        contactInputClass: '',
        resumeDividerClass: '',
        headerMarginAddClass: '',
        experienceMarginAddClass: '',
        experienceMarginImproveClass: '',
        experienceMarginClearClass: '',
        experienceMarginDeleteClass: '',
        summaryMarginImproveClass: '',
        activeDocumentSection: null,
        setActiveDocumentSection: vi.fn(),
        hoveredNameSection: false, setHoveredNameSection: vi.fn(),
        focusedNameSection: false, setFocusedNameSection: vi.fn(),
        hoveredContactField: null, setHoveredContactField: vi.fn(),
        focusedContactField: null, setFocusedContactField: vi.fn(),
        hoveredDeleteIndex: null, setHoveredDeleteIndex: vi.fn(),
        hoveredSummary: false, setHoveredSummary: vi.fn(),
        focusedSummary: false, setFocusedSummary: vi.fn(),
        isSummaryImproveHovered: false, setIsSummaryImproveHovered: vi.fn(),
        hoveredJobId: null, setHoveredJobId: vi.fn(),
        hoveredExperienceImproveId: null, setHoveredExperienceImproveId: vi.fn(),
        hoveredExperienceClearId: null, setHoveredExperienceClearId: vi.fn(),
        hoveredExperienceDeleteId: null, setHoveredExperienceDeleteId: vi.fn(),
        hoveredEducationDeleteId: null, setHoveredEducationDeleteId: vi.fn(),
        hoveredSkillDeleteId: null, setHoveredSkillDeleteId: vi.fn(),
        rewriteActionHover: null, setRewriteActionHover: vi.fn(),
        isExperienceSectionActive: false, isSummarySectionActive: false, summaryRewriteHoverAction: null, summaryCurrentRewriteClass: '',
        isSectionGapPreviewVisible: false, loadingSummaryImprove: false, loadingExperienceImproveId: null,
        renderOverlayInput: vi.fn(),
        renderRewriteActionButtons: vi.fn(),
        getDynamicInputStyle: vi.fn(),
        contactFieldStyle: vi.fn(),
        isFieldChanged: vi.fn(),
        getSuggestionReviewClass: vi.fn(),
        updateField: vi.fn(),
        addCustomContactField: vi.fn(), updateCustomContactField: vi.fn(), removeCustomContactField: vi.fn(), removeStandardContactField: vi.fn(),
        updateExperienceField: vi.fn(), insertExperienceAt: vi.fn(), removeExperience: vi.fn(), clearExperience: vi.fn(), addBulletWithText: vi.fn(), updateBulletText: vi.fn(), removeBullet: vi.fn(),
        updateEducationField: vi.fn(), addEducation: vi.fn(), removeEducation: vi.fn(), addEducationDetailWithText: vi.fn(), updateEducationDetailText: vi.fn(),
        addSkillCategory: vi.fn(), updateSkillCategoryName: vi.fn(), updateSkillCategoryItems: vi.fn(), removeSkillCategory: vi.fn(),
        handleAnalyzeSummary: vi.fn(), handleImproveSummary: vi.fn(), handleImproveExperience: vi.fn(), acceptSummaryRewriteSuggestion: vi.fn(), rejectSummaryRewriteSuggestion: vi.fn(), acceptExperienceRewriteSuggestion: vi.fn(), rejectExperienceRewriteSuggestion: vi.fn(),
        setResumeData: vi.fn(), setChangeMetadata: vi.fn(),
        isPageStyleShelfOpen: false, isPageStyleShelfCompact: false, shelfSurfaceStyle: {}, shelfControlLabelClass: '', shelfSegmentGroupClass: '', shelfSegmentButtonClass: '', shelfSegmentIndicatorClass: '', shelfStepperControlClass: '', shelfStepperLabelClass: '', shelfStepperRowClass: '', shelfStepperButtonClass: '', shelfStepperValueClass: '',
        pageSize: 'letter', setPageSize: vi.fn(), setTitleFontSize: vi.fn(), headerFontSize: 16, setHeaderFontSize: vi.fn(), setBodyFontSize: vi.fn(), setPageMarginPt: vi.fn(), paperLayoutFormat: 'standard', setPaperLayoutFormat: vi.fn(), setFontPreviewTarget: vi.fn(), setIsMarginPreviewVisible: vi.fn(), setIsPageFormatPreviewVisible: vi.fn(), setIsSectionGapPreviewVisible: vi.fn(),
        toolbarSurfaceStyle: {}, documentToolButtonClass: '', handleTogglePageStyleShelf: vi.fn(), handleFitZoom: vi.fn(), zoomMode: 'fit', manualZoom: 1, setZoomMode: vi.fn(), setManualZoom: vi.fn(), zoomPercent: 100,
        isPdfPreviewOpen: false, pdfPreviewUrl: null, resumeName: 'Test', isGeneratingPdfPreview: false, closePdfPreview: vi.fn(),
        loadingList: false
    };

    it('renders normal edit mode and handles zoom/shelf toggles', () => {
        render(<ResumeWorkspace {...defaultProps} />);

        expect(screen.getByTestId('resume-alerts')).toBeTruthy();
        expect(screen.getByTestId('resume-canvas')).toBeTruthy();
        expect(screen.getByTestId('resume-document-editor')).toBeTruthy();

        const toggleShelfBtn = screen.getByLabelText('Open page style shelf');
        fireEvent.click(toggleShelfBtn);
        expect(defaultProps.handleTogglePageStyleShelf).toHaveBeenCalled();

        const fitZoomBtn = screen.getByLabelText('Fit page to available workspace');
        fireEvent.click(fitZoomBtn);
        expect(defaultProps.handleFitZoom).toHaveBeenCalled();

        const zoom100Btn = screen.getByLabelText('Set zoom to 100%');
        fireEvent.click(zoom100Btn);
        expect(defaultProps.setZoomMode).toHaveBeenCalledWith('manual');
        expect(defaultProps.setManualZoom).toHaveBeenCalledWith(1);

        const zoomOutBtn = screen.getByLabelText('Zoom out');
        fireEvent.click(zoomOutBtn);
        expect(defaultProps.setZoomMode).toHaveBeenCalledWith('manual');
        expect(defaultProps.setManualZoom).toHaveBeenCalled();

        const zoomInBtn = screen.getByLabelText('Zoom in');
        fireEvent.click(zoomInBtn);
        expect(defaultProps.setZoomMode).toHaveBeenCalledWith('manual');
        expect(defaultProps.setManualZoom).toHaveBeenCalled();
    });

    it('renders pdf preview mode', () => {
        render(<ResumeWorkspace {...defaultProps} isPdfPreviewOpen={true} />);
        
        expect(screen.getByTestId('resume-pdf-preview')).toBeTruthy();
        expect(screen.queryByTestId('resume-canvas')).toBeNull();

        const backBtn = screen.getByText('Back to edit');
        fireEvent.click(backBtn);
        expect(defaultProps.closePdfPreview).toHaveBeenCalled();
    });

    it('captures render diagnostics when debug is enabled', async () => {
        vi.useFakeTimers();
        (isResumeDebugEnabled as any).mockReturnValue(true);
        (buildResumeRenderDiagnostics as any).mockReturnValue({ dummy: true });

        // Provide dummy DOM elements so captureAndSave finds them
        const editorElement = document.createElement('div');
        const canvasElement = document.createElement('div');
        canvasElement.id = 'print-canvas';
        const surfaceElement = document.createElement('div');
        surfaceElement.id = 'resume-document-surface-print-comparison';

        document.body.appendChild(canvasElement);
        document.body.appendChild(surfaceElement);

        render(<ResumeWorkspace {...defaultProps} resumeDocumentContentRef={{ current: editorElement }} />);

        await vi.runAllTimersAsync();

        expect(buildResumeRenderDiagnostics).toHaveBeenCalled();
        expect(saveResumeRenderDiagnostics).toHaveBeenCalled();

        document.body.removeChild(canvasElement);
        document.body.removeChild(surfaceElement);
        (isResumeDebugEnabled as any).mockReturnValue(false);
        vi.useRealTimers();
    });

    it('cancels diagnostic capture if unmounted early', async () => {
        vi.useFakeTimers();
        (buildResumeRenderDiagnostics as any).mockClear();
        (isResumeDebugEnabled as any).mockReturnValue(true);
        const { unmount } = render(<ResumeWorkspace {...defaultProps} />);
        
        // Unmount immediately to set cancelled = true
        unmount();
        
        // Wait past 750ms
        await vi.runAllTimersAsync();
        
        // buildResumeRenderDiagnostics should not be called because it was cancelled
        expect(buildResumeRenderDiagnostics).not.toHaveBeenCalled();
        (isResumeDebugEnabled as any).mockReturnValue(false);
        vi.useRealTimers();
    });

    it('retries diagnostic capture if elements are missing', async () => {
        vi.useFakeTimers();
        (buildResumeRenderDiagnostics as any).mockClear();
        (isResumeDebugEnabled as any).mockReturnValue(true);
        (buildResumeRenderDiagnostics as any).mockReturnValue({ dummy: true });
        
        // Mock getElementById to return null for 'print-canvas' so it forces a retry
        const getElementByIdSpy = vi.spyOn(document, 'getElementById').mockImplementation((id: string) => null);

        const editorElement = document.createElement('div');
        render(<ResumeWorkspace {...defaultProps} resumeDocumentContentRef={{ current: editorElement }} />);

        // Let it retry multiple times (750ms initial + 8 * 200ms)
        await vi.runAllTimersAsync();
        
        // It should have retried but never called buildResumeRenderDiagnostics because elements are still missing
        expect(buildResumeRenderDiagnostics).not.toHaveBeenCalled();
        
        getElementByIdSpy.mockRestore();
        (isResumeDebugEnabled as any).mockReturnValue(false);
        vi.useRealTimers();
    });

    it('catches and logs errors during diagnostic save', async () => {
        vi.useFakeTimers();
        (buildResumeRenderDiagnostics as any).mockClear();
        (isResumeDebugEnabled as any).mockReturnValue(true);
        (buildResumeRenderDiagnostics as any).mockReturnValue({ dummy: true });
        
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        // Force save to fail
        (saveResumeRenderDiagnostics as any).mockRejectedValueOnce(new Error('Save failed'));

        const editorElement = document.createElement('div');
        const canvasElement = document.createElement('div');
        canvasElement.id = 'print-canvas';
        const surfaceElement = document.createElement('div');
        surfaceElement.id = 'resume-document-surface-print-comparison';

        document.body.appendChild(canvasElement);
        document.body.appendChild(surfaceElement);

        render(<ResumeWorkspace {...defaultProps} resumeDocumentContentRef={{ current: editorElement }} />);

        await vi.runAllTimersAsync();

        expect(warnSpy).toHaveBeenCalledWith("[resumeDebug] failed to save frontend render diagnostics", expect.any(Error));

        document.body.removeChild(canvasElement);
        document.body.removeChild(surfaceElement);
        warnSpy.mockRestore();
        (isResumeDebugEnabled as any).mockReturnValue(false);
        vi.useRealTimers();
    });
});
