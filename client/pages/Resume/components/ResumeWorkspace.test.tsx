import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResumeWorkspace } from './ResumeWorkspace';

const mockResumeDocumentEditor = vi.hoisted(() => vi.fn());

vi.mock('./ResumeAlerts', () => ({
    ResumeAlerts: () => <div data-testid="resume-alerts" />
}));
vi.mock('./ResumeCanvas', () => ({
    ResumeCanvas: ({ children, isPagePreviewMode, pagePreviewContent }: any) => (
        <div data-testid="resume-canvas">{isPagePreviewMode ? pagePreviewContent : children}</div>
    )
}));
vi.mock('./ResumeDocumentEditor', () => ({
    ResumeDocumentEditor: (props: any) => {
        mockResumeDocumentEditor(props);
        return <div data-testid="resume-document-editor" />;
    }
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
    beforeEach(() => {
        mockResumeDocumentEditor.mockClear();
    });

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
        registerResumeDocumentContentElement: vi.fn(),
        canvasNeedsHorizontalScroll: false,
        canvasNeedsVerticalScroll: false,
        canvasViewportStyle: {},
        pdfPreviewViewportStyle: {},
        bottomControlsViewportStyle: {},
        viewableCanvasWidth: 900,
        canvasHorizontalOverflow: 0,
        scaledCanvasWidth: 800,
        scaledCanvasHeight: 1100,
        paperMetrics: { width: 800, height: 1100 },
        resumeCanvasHeight: 1100,
        animatedCanvasZoom: 1,
        fontPreviewTarget: null,
        bodyFontSize: 12,
        subHeaderFontSize: 14,
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
        documentInnerSectionGapStyle: {},
        documentInnerSectionGapPx: 8,
        documentCssVariables: {},
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
        gapPreviewTarget: null, loadingSummaryImprove: false, loadingExperienceImproveId: null,
        renderOverlayInput: vi.fn(),
        renderRewriteActionButtons: vi.fn(),
        getDynamicInputStyle: vi.fn(),
        contactFieldStyle: vi.fn(),
        subHeaderFieldStyle: vi.fn(),
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
        pageSize: 'letter', setPageSize: vi.fn(), setTitleFontSize: vi.fn(), headerFontSize: 16, setHeaderFontSize: vi.fn(), setSubHeaderFontSize: vi.fn(), setBodyFontSize: vi.fn(), setPageMarginPt: vi.fn(), paperLayoutFormat: 'standard', setPaperLayoutFormat: vi.fn(), innerSectionGapFormat: 'standard', setInnerSectionGapFormat: vi.fn(), setFontPreviewTarget: vi.fn(), setIsMarginPreviewVisible: vi.fn(), setIsPageFormatPreviewVisible: vi.fn(), setGapPreviewTarget: vi.fn(),
        toolbarSurfaceStyle: {}, documentToolButtonClass: '', handleTogglePageStyleShelf: vi.fn(), handleFitZoom: vi.fn(), zoomMode: 'manual', manualZoom: 1, setZoomMode: vi.fn(), setManualZoom: vi.fn(), zoomPercent: 100,
        isPdfPreviewOpen: false, pdfPreviewUrl: null, resumeName: 'Test', isGeneratingPdfPreview: false, closePdfPreview: vi.fn(),
        loadingList: false
    };

    const renderWorkspace = (overrides: Record<string, unknown> = {}) => {
        const contract = { ...defaultProps, ...overrides };
        return render(
            <ResumeWorkspace
                theme={{ isLightMode: contract.isLightMode }}
                alerts={contract}
                formatting={contract}
                editing={contract}
                rewrite={contract}
                viewModel={contract}
                pdfPreview={contract}
                persistence={contract}
                onAnalyzeSummary={contract.handleAnalyzeSummary}
            />
        );
    };

    it('renders normal edit mode and handles zoom/shelf toggles', () => {
        renderWorkspace();

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

    it('renders fit mode as clean paged preview instead of the editable canvas', () => {
        renderWorkspace({ zoomMode: 'fit' });

        expect(screen.getByTestId('resume-canvas')).toBeTruthy();
        expect(screen.queryByTestId('resume-document-editor')).toBeNull();
        expect(screen.getByLabelText('Page 1')).toBeTruthy();
    });

    it('keeps 1:1 editor mounted but suppresses canvas hover controls while the shelf is open', () => {
        renderWorkspace({
            isPageStyleShelfOpen: true,
            activeDocumentSection: 'experience',
            focusedDocumentSection: 'summary',
            hoveredJobId: 'exp-1',
            hoveredSummary: true,
            isExperienceSectionActive: true,
            isSummarySectionActive: true
        });

        expect(screen.getByTestId('resume-document-editor')).toBeTruthy();
        const editorProps = mockResumeDocumentEditor.mock.calls[0][0];
        expect(editorProps.interaction.activeDocumentSection).toBeNull();
        expect(editorProps.interaction.focusedDocumentSection).toBeNull();
        expect(editorProps.interaction.hoveredJobId).toBeNull();
        expect(editorProps.interaction.hoveredSummary).toBe(false);
        expect(editorProps.interaction.isExperienceSectionActive).toBe(false);
        expect(editorProps.interaction.isSummarySectionActive).toBe(false);
        expect(editorProps.interaction.gapPreviewTarget).toBeNull();
    });

    it('renders pdf preview mode', () => {
        renderWorkspace({ isPdfPreviewOpen: true });
        
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

        renderWorkspace({ resumeDocumentContentRef: { current: editorElement } });

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
        const { unmount } = renderWorkspace();
        
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
        renderWorkspace({ resumeDocumentContentRef: { current: editorElement } });

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

        renderWorkspace({ resumeDocumentContentRef: { current: editorElement } });

        await vi.runAllTimersAsync();

        expect(warnSpy).toHaveBeenCalledWith("[resumeDebug] failed to save frontend render diagnostics", expect.any(Error));

        document.body.removeChild(canvasElement);
        document.body.removeChild(surfaceElement);
        warnSpy.mockRestore();
        (isResumeDebugEnabled as any).mockReturnValue(false);
        vi.useRealTimers();
    });
});
