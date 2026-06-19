import React from "react";
import { ResumeAlerts } from "./ResumeAlerts";
import { ResumeCanvas } from "./ResumeCanvas";
import { ResumeDocumentEditor } from "./ResumeDocumentEditor";
import { ResumePdfPreview } from "./ResumePdfPreview";
import { ResumePagedPreview, type PageBreakAnchor } from "./ResumePagedPreview";
import { ResumeFormattingToolbar } from "./ResumeFormattingToolbar";
import { ResumeRenderDiagnosticsBridge } from "./ResumeRenderDiagnosticsBridge";
import { useResumePagePreviewLayout } from "../hooks/useResumePagePreviewLayout";
import { ResumePageLoadingSkeleton } from "./ResumePageLoadingSkeleton";

type ResumeWorkspaceProps = {
    theme: {
        isLightMode: boolean;
    };
    alerts: {
        error: string | null;
        successMessage: string | null;
        setError: React.Dispatch<React.SetStateAction<string | null>>;
        setSuccessMessage: React.Dispatch<React.SetStateAction<string | null>>;
    };
    formatting: ReturnType<typeof import("../hooks/useResumeFormatting").useResumeFormatting>;
    editing: ReturnType<typeof import("../hooks/useResumeDocumentEditing").useResumeDocumentEditing>;
    rewrite: ReturnType<typeof import("../hooks/useResumeRewriteSuggestions").useResumeRewriteSuggestions>;
    viewModel: ReturnType<typeof import("../documentViewModel").useResumeDocumentViewModel>;
    pdfPreview: ReturnType<typeof import("../hooks/useResumePdfPreview").useResumePdfPreview>;
    persistence: Pick<
        ReturnType<typeof import("../hooks/useResumePersistence").useResumePersistence>,
        "resumeName" | "loadingList" | "initialLoadState"
    >;
    onAnalyzeSummary: () => void;
};

export const ResumeWorkspace: React.FC<ResumeWorkspaceProps> = (props) => {
    const {
        theme: { isLightMode },
        alerts: { error, successMessage, setError, setSuccessMessage },
        formatting,
        editing,
        rewrite,
        viewModel,
        pdfPreview,
        persistence: { resumeName, loadingList, initialLoadState },
        onAnalyzeSummary: handleAnalyzeSummary
    } = props;
    const {
        canvasViewportRef, resumeDocumentContentRef, registerResumeDocumentContentElement, canvasNeedsHorizontalScroll, canvasNeedsVerticalScroll, canvasViewportStyle, pdfPreviewViewportStyle, viewableCanvasWidth, canvasHorizontalOverflow, scaledCanvasWidth, scaledCanvasHeight, paperMetrics, resumeCanvasHeight, animatedCanvasZoom, fontPreviewTarget, bodyFontSize, resumePageCount, isPageFormatPreviewVisible, isMarginPreviewVisible, pageMarginPt,
        titleFontSize, documentSectionGapPx, documentInnerSectionGapPx, documentCssVariables,
        isPageStyleShelfOpen, zoomMode
    } = formatting;
    const {
        resumeData, activeDocumentSection, focusedDocumentSection, setActiveDocumentSection, setFocusedField, setHoveredField, hoveredNameSection, setHoveredNameSection, focusedNameSection, setFocusedNameSection, hoveredContactField, setHoveredContactField, focusedContactField, setFocusedContactField, hoveredSummary, setHoveredSummary, focusedSummary, setFocusedSummary, isSummaryImproveHovered, setIsSummaryImproveHovered, hoveredJobId, setHoveredJobId, hoveredEducationId, setHoveredEducationId, hoveredSkillId, setHoveredSkillId, hoveredExperienceImproveId, setHoveredExperienceImproveId, hoveredExperienceClearId, setHoveredExperienceClearId, hoveredExperienceDeleteId, setHoveredExperienceDeleteId, hoveredEducationClearId, setHoveredEducationClearId, hoveredEducationDeleteId, setHoveredEducationDeleteId, hoveredSkillClearId, setHoveredSkillClearId, hoveredSkillDeleteId, setHoveredSkillDeleteId, updateField, updateSectionTitle, addCustomContactField, updateCustomContactField, removeCustomContactField, removeStandardContactField, updateExperienceField, insertExperienceAt, removeExperience, moveExperienceUp, moveExperienceDown, clearExperience, addBulletWithText, insertBulletAfter, updateBulletText, removeBulletIfEmpty, removeBullet, toggleBulletTag, createAndAssignBulletTag, deleteBulletTag, updateEducationField, addEducation, removeEducation, moveEducationUp, moveEducationDown, clearEducation, addEducationDetailWithText, insertEducationDetailAfter, updateEducationDetailText, removeEducationDetailIfEmpty, addSkillCategory, createSkillCategory, updateSkillCategoryName, updateSkillCategoryItems, removeSkillCategory, removeSkillCategoryIfEmpty, moveSkillCategoryUp, moveSkillCategoryDown, clearSkillCategory, setResumeData
    } = editing;
    const {
        changeMetadata, originalResumeDataBeforeDraft, summaryRewriteSuggestion, experienceRewriteSuggestions, rewriteActionHover, setRewriteActionHover, loadingSummaryImprove, loadingExperienceImproveId, handleImproveSummary, handleImproveExperience, acceptSummaryRewriteSuggestion, rejectSummaryRewriteSuggestion, acceptExperienceRewriteSuggestion, rejectExperienceRewriteSuggestion, setChangeMetadata
    } = rewrite;
    const {
        headerContactRows, showHeaderContactEditors, sectionHeadingClass, inputStyleClass, boldInputClass, compactFitMetaInputClass, compactFitDateInputClass, contactInputClass, resumeDividerClass, headerMarginAddClass, experienceMarginAddClass, experienceMarginImproveClass, experienceMarginClearClass, experienceMarginDeleteClass, summaryMarginImproveClass, isExperienceSectionActive, isSummarySectionActive, summaryRewriteHoverAction, summaryCurrentRewriteClass, renderOverlayInput, renderRewriteActionButtons, getDynamicInputStyle, contactFieldStyle, subHeaderFieldStyle, isFieldChanged, getSuggestionReviewClass
    } = viewModel;
    const {
        isPdfPreviewOpen, pdfPreviewUrl, isGeneratingPdfPreview, closePdfPreview
    } = pdfPreview;
    const gapPreviewTarget = formatting.gapPreviewTarget;
    const isFitPagePreviewMode = zoomMode === "fit";
    const currentResumeFormatting = formatting.currentResumeFormatting;
    const [pageBreakAnchors, setPageBreakAnchors] = React.useState<PageBreakAnchor[]>([]);
    const pagePreviewLayout = useResumePagePreviewLayout({
        resumeData,
        formatting: currentResumeFormatting,
        paperMetrics,
        resumePageCount,
        viewableCanvasWidth,
        animatedCanvasZoom
    });
    const noopEditorDispatch = React.useCallback((value: unknown) => {
        void value;
    }, []);
    const disableCanvasHoverControls = isPageStyleShelfOpen;
    const editorActiveDocumentSection = disableCanvasHoverControls ? null : activeDocumentSection;
    const editorFocusedDocumentSection = disableCanvasHoverControls ? null : focusedDocumentSection;

    return (
            <main className="resume-workspace print:p-0">
                
                <ResumeAlerts
                    error={error}
                    successMessage={successMessage}
                    setError={setError}
                    setSuccessMessage={setSuccessMessage}
                />
                <ResumeRenderDiagnosticsBridge
                    formatting={currentResumeFormatting}
                    paperMetrics={paperMetrics}
                    resumeDocumentContentRef={resumeDocumentContentRef}
                    isPdfPreviewOpen={isPdfPreviewOpen}
                    loadingList={loadingList}
                />

                {initialLoadState === "loading" ? (
                    <div
                        className="absolute inset-0 flex items-start justify-center overflow-hidden p-20 print:hidden"
                        style={canvasViewportStyle}
                    >
                        <ResumePageLoadingSkeleton />
                    </div>
                ) : isPdfPreviewOpen ? (
                    <ResumePdfPreview
                        isLightMode={isLightMode}
                        pdfPreviewUrl={pdfPreviewUrl}
                        documentTitle={resumeName}
                        isGeneratingPdfPreview={isGeneratingPdfPreview}
                        viewportStyle={pdfPreviewViewportStyle}
                        onBackToEdit={closePdfPreview}
                    />
                ) : (
                    <>
                    <ResumeCanvas
                    canvasViewportRef={canvasViewportRef}
                    resumeDocumentContentRef={resumeDocumentContentRef}
                    registerResumeDocumentContentElement={registerResumeDocumentContentElement}
                    canvasNeedsHorizontalScroll={canvasNeedsHorizontalScroll}
                    canvasNeedsVerticalScroll={canvasNeedsVerticalScroll}
                    canvasViewportStyle={canvasViewportStyle}
                    canvasHorizontalOverflow={canvasHorizontalOverflow}
                    scaledCanvasWidth={scaledCanvasWidth}
                    scaledCanvasHeight={scaledCanvasHeight}
                    paperMetrics={paperMetrics}
                    resumeCanvasHeight={resumeCanvasHeight}
                    animatedCanvasZoom={animatedCanvasZoom}
                    fontPreviewTarget={fontPreviewTarget}
                    documentCssVariables={documentCssVariables}
                    pageBreakAnchors={pageBreakAnchors}
                    isPageFormatPreviewVisible={isPageFormatPreviewVisible}
                    isMarginPreviewVisible={isMarginPreviewVisible}
                    isPagePreviewMode={isFitPagePreviewMode}
                    pagePreviewSlotWidth={pagePreviewLayout.slotWidth}
                    pagePreviewSlotHeight={pagePreviewLayout.slotHeight}
                    pagePreviewContent={
                        <ResumePagedPreview
                            resumeData={resumeData}
                            formatting={currentResumeFormatting}
                            paperMetrics={paperMetrics}
                            layoutKey={pagePreviewLayout.layoutKey}
                            pageCount={resumePageCount}
                            pageGapPx={pagePreviewLayout.pageGapPx}
                            columnCount={pagePreviewLayout.columnCount}
                            fontPreviewTarget={fontPreviewTarget}
                            isMarginPreviewVisible={isMarginPreviewVisible}
                            isPageFormatPreviewVisible={isPageFormatPreviewVisible}
                            isSectionGapPreviewVisible={gapPreviewTarget !== null}
                            registerResumeDocumentContentElement={registerResumeDocumentContentElement}
                            onRenderedPageCountChange={pagePreviewLayout.onRenderedPageCountChange}
                            onPageBreakAnchorsChange={setPageBreakAnchors}
                        />
                    }
                >
                            {!isFitPagePreviewMode && (
                            <ResumeDocumentEditor
                                data={{
                                    resumeData,
                                    headerContactRows,
                                    showHeaderContactEditors,
                                    changeMetadata,
                                    originalResumeDataBeforeDraft,
                                    summaryRewriteSuggestion,
                                    experienceRewriteSuggestions
                                }}
                                formatting={{
                                    titleFontSize,
                                    bodyFontSize,
                                    pageMarginPt,
                                    documentSectionGapPx,
                                    documentInnerSectionGapPx,
                                    sectionHeadingClass,
                                    inputStyleClass,
                                    boldInputClass,
                                    compactFitMetaInputClass,
                                    compactFitDateInputClass,
                                    contactInputClass,
                                    resumeDividerClass,
                                    headerMarginAddClass,
                                    experienceMarginAddClass,
                                    experienceMarginImproveClass,
                                    experienceMarginClearClass,
                                    experienceMarginDeleteClass,
                                    summaryMarginImproveClass
                                }}
                                interaction={{
                                    activeDocumentSection: editorActiveDocumentSection,
                                    focusedDocumentSection: editorFocusedDocumentSection,
                                    setActiveDocumentSection: disableCanvasHoverControls ? noopEditorDispatch : setActiveDocumentSection,
                                    setFocusedField: disableCanvasHoverControls ? noopEditorDispatch : setFocusedField,
                                    setHoveredField: disableCanvasHoverControls ? noopEditorDispatch : setHoveredField,
                                    hoveredNameSection: disableCanvasHoverControls ? false : hoveredNameSection,
                                    setHoveredNameSection: disableCanvasHoverControls ? noopEditorDispatch : setHoveredNameSection,
                                    focusedNameSection: disableCanvasHoverControls ? false : focusedNameSection,
                                    setFocusedNameSection: disableCanvasHoverControls ? noopEditorDispatch : setFocusedNameSection,
                                    hoveredContactField: disableCanvasHoverControls ? null : hoveredContactField,
                                    setHoveredContactField: disableCanvasHoverControls ? noopEditorDispatch : setHoveredContactField,
                                    focusedContactField: disableCanvasHoverControls ? null : focusedContactField,
                                    setFocusedContactField: disableCanvasHoverControls ? noopEditorDispatch : setFocusedContactField,
                                    hoveredSummary: disableCanvasHoverControls ? false : hoveredSummary,
                                    setHoveredSummary: disableCanvasHoverControls ? noopEditorDispatch : setHoveredSummary,
                                    focusedSummary: disableCanvasHoverControls ? false : focusedSummary,
                                    setFocusedSummary: disableCanvasHoverControls ? noopEditorDispatch : setFocusedSummary,
                                    isSummaryImproveHovered: disableCanvasHoverControls ? false : isSummaryImproveHovered,
                                    setIsSummaryImproveHovered: disableCanvasHoverControls ? noopEditorDispatch : setIsSummaryImproveHovered,
                                    hoveredJobId: disableCanvasHoverControls ? null : hoveredJobId,
                                    setHoveredJobId: disableCanvasHoverControls ? noopEditorDispatch : setHoveredJobId,
                                    hoveredEducationId: disableCanvasHoverControls ? null : hoveredEducationId,
                                    setHoveredEducationId: disableCanvasHoverControls ? noopEditorDispatch : setHoveredEducationId,
                                    hoveredSkillId: disableCanvasHoverControls ? null : hoveredSkillId,
                                    setHoveredSkillId: disableCanvasHoverControls ? noopEditorDispatch : setHoveredSkillId,
                                    hoveredExperienceImproveId: disableCanvasHoverControls ? null : hoveredExperienceImproveId,
                                    setHoveredExperienceImproveId: disableCanvasHoverControls ? noopEditorDispatch : setHoveredExperienceImproveId,
                                    hoveredExperienceClearId: disableCanvasHoverControls ? null : hoveredExperienceClearId,
                                    setHoveredExperienceClearId: disableCanvasHoverControls ? noopEditorDispatch : setHoveredExperienceClearId,
                                    hoveredExperienceDeleteId: disableCanvasHoverControls ? null : hoveredExperienceDeleteId,
                                    setHoveredExperienceDeleteId: disableCanvasHoverControls ? noopEditorDispatch : setHoveredExperienceDeleteId,
                                    hoveredEducationClearId: disableCanvasHoverControls ? null : hoveredEducationClearId,
                                    setHoveredEducationClearId: disableCanvasHoverControls ? noopEditorDispatch : setHoveredEducationClearId,
                                    hoveredEducationDeleteId: disableCanvasHoverControls ? null : hoveredEducationDeleteId,
                                    setHoveredEducationDeleteId: disableCanvasHoverControls ? noopEditorDispatch : setHoveredEducationDeleteId,
                                    hoveredSkillClearId: disableCanvasHoverControls ? null : hoveredSkillClearId,
                                    setHoveredSkillClearId: disableCanvasHoverControls ? noopEditorDispatch : setHoveredSkillClearId,
                                    hoveredSkillDeleteId: disableCanvasHoverControls ? null : hoveredSkillDeleteId,
                                    setHoveredSkillDeleteId: disableCanvasHoverControls ? noopEditorDispatch : setHoveredSkillDeleteId,
                                    rewriteActionHover,
                                    setRewriteActionHover,
                                    isExperienceSectionActive: disableCanvasHoverControls ? false : isExperienceSectionActive,
                                    isSummarySectionActive: disableCanvasHoverControls ? false : isSummarySectionActive,
                                    summaryRewriteHoverAction,
                                    summaryCurrentRewriteClass,
                                    gapPreviewTarget,
                                    loadingSummaryImprove,
                                    loadingExperienceImproveId
                                }}
                                handlers={{
                                    renderOverlayInput,
                                    renderRewriteActionButtons,
                                    getDynamicInputStyle,
                                    contactFieldStyle,
                                    subHeaderFieldStyle,
                                    isFieldChanged,
                                    getSuggestionReviewClass,
                                    updateField,
                                    updateSectionTitle,
                                    addCustomContactField,
                                    updateCustomContactField,
                                    removeCustomContactField,
                                    removeStandardContactField,
                                    updateExperienceField,
                                    insertExperienceAt,
                                    removeExperience,
                                    moveExperienceUp,
                                    moveExperienceDown,
                                    clearExperience,
                                    addBulletWithText,
                                    insertBulletAfter,
                                    updateBulletText,
                                    removeBulletIfEmpty,
                                    removeBullet,
                                    toggleBulletTag,
                                    createAndAssignBulletTag,
                                    deleteBulletTag,
                                    updateEducationField,
                                    addEducation,
                                    removeEducation,
                                    moveEducationUp,
                                    moveEducationDown,
                                    clearEducation,
                                    addEducationDetailWithText,
                                    insertEducationDetailAfter,
                                    updateEducationDetailText,
                                    removeEducationDetailIfEmpty,
                                    addSkillCategory,
                                    createSkillCategory,
                                    updateSkillCategoryName,
                                    updateSkillCategoryItems,
                                    removeSkillCategory,
                                    removeSkillCategoryIfEmpty,
                                    moveSkillCategoryUp,
                                    moveSkillCategoryDown,
                                    clearSkillCategory,
                                    handleAnalyzeSummary,
                                    handleImproveSummary,
                                    handleImproveExperience,
                                    acceptSummaryRewriteSuggestion,
                                    rejectSummaryRewriteSuggestion,
                                    acceptExperienceRewriteSuggestion,
                                    rejectExperienceRewriteSuggestion,
                                    setResumeData,
                                    setChangeMetadata,
                                    setSuccessMessage
                                }}
                            />
                            )}
                    </ResumeCanvas>
                    {!isFitPagePreviewMode && (
                        <ResumePagedPreview
                            resumeData={resumeData}
                            formatting={currentResumeFormatting}
                            paperMetrics={paperMetrics}
                            layoutKey={pagePreviewLayout.layoutKey}
                            pageCount={resumePageCount}
                            pageGapPx={pagePreviewLayout.pageGapPx}
                            columnCount={1}
                            fontPreviewTarget={fontPreviewTarget}
                            isMarginPreviewVisible={false}
                            isPageFormatPreviewVisible={false}
                            isSectionGapPreviewVisible={false}
                            registerResumeDocumentContentElement={() => undefined}
                            onRenderedPageCountChange={pagePreviewLayout.onRenderedPageCountChange}
                            measurementOnly
                            onPageBreakAnchorsChange={setPageBreakAnchors}
                        />
                    )}
                    <ResumeFormattingToolbar
                        isLightMode={isLightMode}
                        formatting={formatting}
                    />
                    </>
                )}
            </main>

    );
};
