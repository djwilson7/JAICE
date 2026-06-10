import React from "react";
import { motion } from "framer-motion";
import type { ContactFieldKey, ContactRenderField, DocumentSectionId, EducationItem, ExperienceItem, ExperienceRewriteSuggestion, FontPreviewTarget, PageSize, PaperLayoutFormat, ResumeData, ResumeRewriteActionHover, SummaryRewriteSuggestion, ZoomMode } from "../types";
import { ZOOM_STEP, clampZoom } from "../formatting";
import { ResumeAlerts } from "./ResumeAlerts";
import { ResumeCanvas } from "./ResumeCanvas";
import { ResumeDocumentEditor } from "./ResumeDocumentEditor";
import { ResumePdfPreview } from "./ResumePdfPreview";
import { PageStyleShelf } from "./PageStyleShelf";
import { saveResumeRenderDiagnostics } from "../resumeApi";
import { RESUME_RENDER_DIAGNOSTICS_VERSION, buildResumeRenderDiagnostics, isResumeDebugEnabled } from "../resumeDiagnostics";

type OverlayInputParams = {
    path: string;
    label: string;
    value: string;
    placeholder: string;
    className: string;
    style?: React.CSSProperties;
    onChange: (val: string) => void;
    onDelete?: () => void;
    onCustomAction?: () => void;
    customActionTitle?: string;
    customActionIcon?: React.ReactNode;
    isAutoResize?: boolean;
    showTextStats?: boolean;
    customActionPlacement?: "tray" | "left" | "right";
    disableClear?: boolean;
    disableDelete?: boolean;
    containerClassName?: string;
    inputContainerClassName?: string;
};

type RewriteActionButtonParams = {
    onAccept: () => void;
    onReject: () => void;
    onAcceptHover: () => void;
    onRejectHover: () => void;
    onClearHover: () => void;
};

type ResumeWorkspaceProps = {
    isLightMode: boolean;
    error: string | null;
    successMessage: string | null;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    setSuccessMessage: React.Dispatch<React.SetStateAction<string | null>>;
    headerActionButtonClass: string;
    headerActionIconClass: string;
    canvasViewportRef: React.RefObject<HTMLDivElement | null>;
    resumeDocumentContentRef: React.RefObject<HTMLDivElement | null>;
    canvasNeedsHorizontalScroll: boolean;
    canvasNeedsVerticalScroll: boolean;
    canvasViewportStyle: React.CSSProperties;
    pdfPreviewViewportStyle: React.CSSProperties;
    bottomControlsViewportStyle: React.CSSProperties;
    canvasHorizontalOverflow: number;
    scaledCanvasWidth: number;
    scaledCanvasHeight: number;
    paperMetrics: import("../types").PaperMetrics;
    resumeCanvasHeight: number;
    animatedCanvasZoom: number;
    fontPreviewTarget: FontPreviewTarget | null;
    bodyFontSize: number;
    resumePageCount: number;
    resumePageStride: number;
    isPageFormatPreviewVisible: boolean;
    isMarginPreviewVisible: boolean;
    pageMarginPt: number;
    resumeData: ResumeData;
    headerContactRows: ContactRenderField[][];
    showHeaderContactEditors: boolean;
    changeMetadata: { path: string; before: string; after: string; reason: string }[];
    originalResumeDataBeforeDraft: ResumeData | null;
    summaryRewriteSuggestion: SummaryRewriteSuggestion | null;
    experienceRewriteSuggestions: Record<string, ExperienceRewriteSuggestion>;
    titleFontSize: number;
    documentSectionGapStyle: React.CSSProperties;
    documentSectionGapPx: number;
    documentTextStyle: React.CSSProperties;
    sectionHeadingClass: string;
    sectionHeadingStyle: React.CSSProperties;
    inputStyleClass: string;
    boldInputClass: string;
    compactFitMetaInputClass: string;
    compactFitDateInputClass: string;
    contactInputClass: string;
    resumeDividerClass: string;
    headerMarginAddClass: string;
    experienceMarginAddClass: string;
    experienceMarginImproveClass: string;
    experienceMarginClearClass: string;
    experienceMarginDeleteClass: string;
    summaryMarginImproveClass: string;
    activeDocumentSection: DocumentSectionId | null;
    setActiveDocumentSection: React.Dispatch<React.SetStateAction<DocumentSectionId | null>>;
    hoveredNameSection: boolean; setHoveredNameSection: React.Dispatch<React.SetStateAction<boolean>>;
    focusedNameSection: boolean; setFocusedNameSection: React.Dispatch<React.SetStateAction<boolean>>;
    hoveredContactField: string | null; setHoveredContactField: React.Dispatch<React.SetStateAction<string | null>>;
    focusedContactField: string | null; setFocusedContactField: React.Dispatch<React.SetStateAction<string | null>>;
    hoveredDeleteIndex: string | null; setHoveredDeleteIndex: React.Dispatch<React.SetStateAction<string | null>>;
    hoveredSummary: boolean; setHoveredSummary: React.Dispatch<React.SetStateAction<boolean>>;
    focusedSummary: boolean; setFocusedSummary: React.Dispatch<React.SetStateAction<boolean>>;
    isSummaryImproveHovered: boolean; setIsSummaryImproveHovered: React.Dispatch<React.SetStateAction<boolean>>;
    hoveredJobId: string | null; setHoveredJobId: React.Dispatch<React.SetStateAction<string | null>>;
    hoveredExperienceImproveId: string | null; setHoveredExperienceImproveId: React.Dispatch<React.SetStateAction<string | null>>;
    hoveredExperienceClearId: string | null; setHoveredExperienceClearId: React.Dispatch<React.SetStateAction<string | null>>;
    hoveredExperienceDeleteId: string | null; setHoveredExperienceDeleteId: React.Dispatch<React.SetStateAction<string | null>>;
    hoveredEducationDeleteId: string | null; setHoveredEducationDeleteId: React.Dispatch<React.SetStateAction<string | null>>;
    hoveredSkillDeleteId: string | null; setHoveredSkillDeleteId: React.Dispatch<React.SetStateAction<string | null>>;
    rewriteActionHover: ResumeRewriteActionHover | null; setRewriteActionHover: React.Dispatch<React.SetStateAction<ResumeRewriteActionHover | null>>;
    isExperienceSectionActive: boolean; isSummarySectionActive: boolean; summaryRewriteHoverAction: "accept" | "reject" | null; summaryCurrentRewriteClass: string;
    isSectionGapPreviewVisible: boolean; loadingSummaryImprove: boolean; loadingExperienceImproveId: string | null;
    renderOverlayInput: (params: OverlayInputParams) => React.ReactNode;
    renderRewriteActionButtons: (params: RewriteActionButtonParams) => React.ReactNode;
    getDynamicInputStyle: (value: string | undefined, placeholder: string, font?: string, extraStyles?: React.CSSProperties) => React.CSSProperties;
    contactFieldStyle: (value: string | undefined, placeholder: string) => React.CSSProperties;
    isFieldChanged: (path: string) => { changed: boolean; reason?: string };
    getSuggestionReviewClass: (action?: "accept" | "reject") => string;
    updateField: (field: keyof ResumeData, value: string) => void;
    addCustomContactField: () => void; updateCustomContactField: (index: number, field: "label" | "value", val: string) => void; removeCustomContactField: (index: number) => void; removeStandardContactField: (field: ContactFieldKey) => void;
    updateExperienceField: (id: string, field: keyof ExperienceItem, value: string) => void; insertExperienceAt: (index: number) => void; removeExperience: (id: string) => void; clearExperience: (id: string) => void; addBulletWithText: (expId: string, text: string) => void; updateBulletText: (expId: string, bulletId: string, value: string) => void; removeBullet: (expId: string, bulletId: string) => void;
    updateEducationField: (id: string, field: keyof EducationItem, value: string) => void; addEducation: () => void; removeEducation: (id: string) => void; addEducationDetailWithText: (educationId: string, text: string) => void; updateEducationDetailText: (educationId: string, detailId: string, value: string) => void;
    addSkillCategory: () => void; updateSkillCategoryName: (id: string, value: string) => void; updateSkillCategoryItems: (id: string, value: string) => void; removeSkillCategory: (id: string) => void;
    handleAnalyzeSummary: () => void; handleImproveSummary: () => void | Promise<void>; handleImproveExperience: (experience: ExperienceItem) => void | Promise<void>; acceptSummaryRewriteSuggestion: () => void; rejectSummaryRewriteSuggestion: () => void; acceptExperienceRewriteSuggestion: (experienceId: string, bulletId: string) => void; rejectExperienceRewriteSuggestion: (experienceId: string, bulletId: string) => void;
    setResumeData: React.Dispatch<React.SetStateAction<ResumeData>>; setChangeMetadata: React.Dispatch<React.SetStateAction<{ path: string; before: string; after: string; reason: string }[]>>;
    isPageStyleShelfOpen: boolean; isPageStyleShelfCompact: boolean; shelfSurfaceStyle: React.CSSProperties; shelfControlLabelClass: string; shelfSegmentGroupClass: string; shelfSegmentButtonClass: string; shelfSegmentIndicatorClass: string; shelfStepperControlClass: string; shelfStepperLabelClass: string; shelfStepperRowClass: string; shelfStepperButtonClass: string; shelfStepperValueClass: string;
    pageSize: PageSize; setPageSize: React.Dispatch<React.SetStateAction<PageSize>>; setTitleFontSize: React.Dispatch<React.SetStateAction<number>>; headerFontSize: number; setHeaderFontSize: React.Dispatch<React.SetStateAction<number>>; setBodyFontSize: React.Dispatch<React.SetStateAction<number>>; setPageMarginPt: React.Dispatch<React.SetStateAction<number>>; paperLayoutFormat: PaperLayoutFormat; setPaperLayoutFormat: React.Dispatch<React.SetStateAction<PaperLayoutFormat>>; setFontPreviewTarget: React.Dispatch<React.SetStateAction<FontPreviewTarget | null>>; setIsMarginPreviewVisible: React.Dispatch<React.SetStateAction<boolean>>; setIsPageFormatPreviewVisible: React.Dispatch<React.SetStateAction<boolean>>; setIsSectionGapPreviewVisible: React.Dispatch<React.SetStateAction<boolean>>;
    toolbarSurfaceStyle: React.CSSProperties; documentToolButtonClass: string; handleTogglePageStyleShelf: () => void; handleFitZoom: () => void; zoomMode: ZoomMode; manualZoom: number; setZoomMode: React.Dispatch<React.SetStateAction<ZoomMode>>; setManualZoom: React.Dispatch<React.SetStateAction<number>>; zoomPercent: number;
    isPdfPreviewOpen: boolean; pdfPreviewUrl: string | null; resumeName: string; isGeneratingPdfPreview: boolean; closePdfPreview: () => void;
    loadingList: boolean;
};

export const ResumeWorkspace: React.FC<ResumeWorkspaceProps> = (props) => {
    const {
        isLightMode, error, successMessage, setError, setSuccessMessage, headerActionButtonClass, headerActionIconClass,
        canvasViewportRef, resumeDocumentContentRef, canvasNeedsHorizontalScroll, canvasNeedsVerticalScroll, canvasViewportStyle, pdfPreviewViewportStyle, bottomControlsViewportStyle, canvasHorizontalOverflow, scaledCanvasWidth, scaledCanvasHeight, paperMetrics, resumeCanvasHeight, animatedCanvasZoom, fontPreviewTarget, bodyFontSize, resumePageCount, resumePageStride, isPageFormatPreviewVisible, isMarginPreviewVisible, pageMarginPt,
        resumeData, headerContactRows, showHeaderContactEditors, changeMetadata, originalResumeDataBeforeDraft, summaryRewriteSuggestion, experienceRewriteSuggestions, titleFontSize, documentSectionGapStyle, documentSectionGapPx, documentTextStyle, sectionHeadingClass, sectionHeadingStyle, inputStyleClass, boldInputClass, compactFitMetaInputClass, compactFitDateInputClass, contactInputClass, resumeDividerClass, headerMarginAddClass, experienceMarginAddClass, experienceMarginImproveClass, experienceMarginClearClass, experienceMarginDeleteClass, summaryMarginImproveClass,
        activeDocumentSection, setActiveDocumentSection, hoveredNameSection, setHoveredNameSection, focusedNameSection, setFocusedNameSection, hoveredContactField, setHoveredContactField, focusedContactField, setFocusedContactField, hoveredDeleteIndex, setHoveredDeleteIndex, hoveredSummary, setHoveredSummary, focusedSummary, setFocusedSummary, isSummaryImproveHovered, setIsSummaryImproveHovered, hoveredJobId, setHoveredJobId, hoveredExperienceImproveId, setHoveredExperienceImproveId, hoveredExperienceClearId, setHoveredExperienceClearId, hoveredExperienceDeleteId, setHoveredExperienceDeleteId, hoveredEducationDeleteId, setHoveredEducationDeleteId, hoveredSkillDeleteId, setHoveredSkillDeleteId, rewriteActionHover, setRewriteActionHover, isExperienceSectionActive, isSummarySectionActive, summaryRewriteHoverAction, summaryCurrentRewriteClass, isSectionGapPreviewVisible, loadingSummaryImprove, loadingExperienceImproveId,
        renderOverlayInput, renderRewriteActionButtons, getDynamicInputStyle, contactFieldStyle, isFieldChanged, getSuggestionReviewClass, updateField, addCustomContactField, updateCustomContactField, removeCustomContactField, removeStandardContactField, updateExperienceField, insertExperienceAt, removeExperience, clearExperience, addBulletWithText, updateBulletText, removeBullet, updateEducationField, addEducation, removeEducation, addEducationDetailWithText, updateEducationDetailText, addSkillCategory, updateSkillCategoryName, updateSkillCategoryItems, removeSkillCategory, handleAnalyzeSummary, handleImproveSummary, handleImproveExperience, acceptSummaryRewriteSuggestion, rejectSummaryRewriteSuggestion, acceptExperienceRewriteSuggestion, rejectExperienceRewriteSuggestion, setResumeData, setChangeMetadata,
        isPageStyleShelfOpen, isPageStyleShelfCompact, shelfSurfaceStyle, shelfControlLabelClass, shelfSegmentGroupClass, shelfSegmentButtonClass, shelfSegmentIndicatorClass, shelfStepperControlClass, shelfStepperLabelClass, shelfStepperRowClass, shelfStepperButtonClass, shelfStepperValueClass, pageSize, setPageSize, setTitleFontSize, headerFontSize, setHeaderFontSize, setBodyFontSize, setPageMarginPt, paperLayoutFormat, setPaperLayoutFormat, setFontPreviewTarget, setIsMarginPreviewVisible, setIsPageFormatPreviewVisible, setIsSectionGapPreviewVisible, toolbarSurfaceStyle, documentToolButtonClass, handleTogglePageStyleShelf, handleFitZoom, zoomMode, manualZoom, setZoomMode, setManualZoom, zoomPercent,
        isPdfPreviewOpen, pdfPreviewUrl, resumeName, isGeneratingPdfPreview, closePdfPreview, loadingList
    } = props;
    const lastPostedRenderDiagnosticsFingerprintRef = React.useRef<string | null>(null);
    const renderDiagnosticsFingerprint = JSON.stringify({
        diagnosticsVersion: RESUME_RENDER_DIAGNOSTICS_VERSION,
        resumeData,
        formatting: {
            pageSize,
            titleFontSize,
            headerFontSize,
            bodyFontSize,
            pageMarginPt,
            paperLayoutFormat
        },
        paperHeight: paperMetrics.height
    });

    React.useEffect(() => {
        if (!isResumeDebugEnabled() || isPdfPreviewOpen || loadingList) {
            return;
        }
        if (lastPostedRenderDiagnosticsFingerprintRef.current === renderDiagnosticsFingerprint) return;

        let attempts = 0;
        let timeoutId = 0;
        let cancelled = false;

        const captureAndSave = async () => {
            if (
                cancelled ||
                lastPostedRenderDiagnosticsFingerprintRef.current === renderDiagnosticsFingerprint
            ) {
                return;
            }

            const editorElement = resumeDocumentContentRef.current;
            const canvasElement = document.getElementById("print-canvas");
            const surfaceElement = document.getElementById("resume-document-surface-print-comparison");

            if (!editorElement || !canvasElement || !surfaceElement) {
                attempts += 1;
                if (attempts < 8) {
                    timeoutId = window.setTimeout(captureAndSave, 200);
                }
                return;
            }

            await document.fonts?.ready;
            await new Promise((resolve) => window.requestAnimationFrame(resolve));

            if (cancelled) return;

            const diagnostics = buildResumeRenderDiagnostics({
                phase: "edit-canvas",
                formatting: {
                    pageSize,
                    titleFontSize,
                    headerFontSize,
                    bodyFontSize,
                    pageMarginPt,
                    paperLayoutFormat
                },
                targets: [
                    {
                        label: "editor renderer",
                        element: editorElement,
                        intendedPageHeight: paperMetrics.height
                    },
                    {
                        label: "document surface renderer",
                        element: surfaceElement,
                        intendedPageHeight: paperMetrics.height
                    },
                    {
                        label: "canvas frame",
                        element: canvasElement,
                        intendedPageHeight: paperMetrics.height
                    }
                ]
            });

            try {
                const result = await saveResumeRenderDiagnostics(diagnostics);
                lastPostedRenderDiagnosticsFingerprintRef.current = renderDiagnosticsFingerprint;
                console.info("[resumeDebug] frontend render diagnostics saved", result);
            } catch (error) {
                console.warn("[resumeDebug] failed to save frontend render diagnostics", error);
            }
        };

        timeoutId = window.setTimeout(captureAndSave, 750);

        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [
        bodyFontSize,
        headerFontSize,
        isPdfPreviewOpen,
        loadingList,
        pageMarginPt,
        pageSize,
        paperLayoutFormat,
        paperMetrics.height,
        renderDiagnosticsFingerprint,
        resumeDocumentContentRef,
        titleFontSize
    ]);

    return (
            <main className="absolute inset-0 z-0 flex min-h-0 min-w-0 flex-col overflow-hidden print:p-0">
                
                <ResumeAlerts
                    error={error}
                    successMessage={successMessage}
                    setError={setError}
                    setSuccessMessage={setSuccessMessage}
                    headerActionButtonClass={headerActionButtonClass}
                    headerActionIconClass={headerActionIconClass}
                />

                {isPdfPreviewOpen ? (
                    <ResumePdfPreview
                        isLightMode={isLightMode}
                        pdfPreviewUrl={pdfPreviewUrl}
                        documentTitle={resumeName}
                        isGeneratingPdfPreview={isGeneratingPdfPreview}
                        viewportStyle={pdfPreviewViewportStyle}
                        headerActionButtonClass={headerActionButtonClass}
                        headerActionIconClass={headerActionIconClass}
                        onBackToEdit={closePdfPreview}
                    />
                ) : (
                    <>
                    <ResumeCanvas
                    canvasViewportRef={canvasViewportRef}
                    resumeDocumentContentRef={resumeDocumentContentRef}
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
                    bodyFontSize={bodyFontSize}
                    resumePageCount={resumePageCount}
                    resumePageStride={resumePageStride}
                    isPageFormatPreviewVisible={isPageFormatPreviewVisible}
                    isMarginPreviewVisible={isMarginPreviewVisible}
                    pageMarginPt={pageMarginPt}
                >
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
                                    documentSectionGapStyle,
                                    documentSectionGapPx,
                                    documentTextStyle,
                                    sectionHeadingClass,
                                    sectionHeadingStyle,
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
                                    activeDocumentSection,
                                    setActiveDocumentSection,
                                    hoveredNameSection,
                                    setHoveredNameSection,
                                    focusedNameSection,
                                    setFocusedNameSection,
                                    hoveredContactField,
                                    setHoveredContactField,
                                    focusedContactField,
                                    setFocusedContactField,
                                    hoveredDeleteIndex,
                                    setHoveredDeleteIndex,
                                    hoveredSummary,
                                    setHoveredSummary,
                                    focusedSummary,
                                    setFocusedSummary,
                                    isSummaryImproveHovered,
                                    setIsSummaryImproveHovered,
                                    hoveredJobId,
                                    setHoveredJobId,
                                    hoveredExperienceImproveId,
                                    setHoveredExperienceImproveId,
                                    hoveredExperienceClearId,
                                    setHoveredExperienceClearId,
                                    hoveredExperienceDeleteId,
                                    setHoveredExperienceDeleteId,
                                    hoveredEducationDeleteId,
                                    setHoveredEducationDeleteId,
                                    hoveredSkillDeleteId,
                                    setHoveredSkillDeleteId,
                                    rewriteActionHover,
                                    setRewriteActionHover,
                                    isExperienceSectionActive,
                                    isSummarySectionActive,
                                    summaryRewriteHoverAction,
                                    summaryCurrentRewriteClass,
                                    isSectionGapPreviewVisible,
                                    loadingSummaryImprove,
                                    loadingExperienceImproveId
                                }}
                                handlers={{
                                    renderOverlayInput,
                                    renderRewriteActionButtons,
                                    getDynamicInputStyle,
                                    contactFieldStyle,
                                    isFieldChanged,
                                    getSuggestionReviewClass,
                                    updateField,
                                    addCustomContactField,
                                    updateCustomContactField,
                                    removeCustomContactField,
                                    removeStandardContactField,
                                    updateExperienceField,
                                    insertExperienceAt,
                                    removeExperience,
                                    clearExperience,
                                    addBulletWithText,
                                    updateBulletText,
                                    removeBullet,
                                    updateEducationField,
                                    addEducation,
                                    removeEducation,
                                    addEducationDetailWithText,
                                    updateEducationDetailText,
                                    addSkillCategory,
                                    updateSkillCategoryName,
                                    updateSkillCategoryItems,
                                    removeSkillCategory,
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
                    </ResumeCanvas>
                    <div
                        className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center print:hidden transition-[padding] duration-300"
                        style={bottomControlsViewportStyle}
                    >
                    <motion.div
                    className={`resume-edit-control pointer-events-auto flex max-w-full flex-col items-center overflow-hidden rounded-md border ${
                        isLightMode
                            ? "border-slate-300/80 bg-white/82 shadow-[0_12px_28px_rgba(15,23,42,0.13),inset_0_1px_0_rgba(255,255,255,0.86)]"
                            : "border-white/18 bg-slate-950/58 shadow-[0_12px_28px_rgba(2,6,23,0.38),inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(15,23,42,0.56)]"
                    }`}
                    style={{ ...toolbarSurfaceStyle, ...shelfSurfaceStyle }}
                >
                    <PageStyleShelf
                    isLightMode={isLightMode}
                    isPageStyleShelfOpen={isPageStyleShelfOpen}
                    isPageStyleShelfCompact={isPageStyleShelfCompact}
                    shelfControlLabelClass={shelfControlLabelClass}
                    shelfSegmentGroupClass={shelfSegmentGroupClass}
                    shelfSegmentButtonClass={shelfSegmentButtonClass}
                    shelfSegmentIndicatorClass={shelfSegmentIndicatorClass}
                    shelfStepperControlClass={shelfStepperControlClass}
                    shelfStepperLabelClass={shelfStepperLabelClass}
                    shelfStepperRowClass={shelfStepperRowClass}
                    shelfStepperButtonClass={shelfStepperButtonClass}
                    shelfStepperValueClass={shelfStepperValueClass}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    titleFontSize={titleFontSize}
                    setTitleFontSize={setTitleFontSize}
                    headerFontSize={headerFontSize}
                    setHeaderFontSize={setHeaderFontSize}
                    bodyFontSize={bodyFontSize}
                    setBodyFontSize={setBodyFontSize}
                    pageMarginPt={pageMarginPt}
                    setPageMarginPt={setPageMarginPt}
                    paperLayoutFormat={paperLayoutFormat}
                    setPaperLayoutFormat={setPaperLayoutFormat}
                    setFontPreviewTarget={setFontPreviewTarget}
                    setIsMarginPreviewVisible={setIsMarginPreviewVisible}
                    setIsPageFormatPreviewVisible={setIsPageFormatPreviewVisible}
                    setIsSectionGapPreviewVisible={setIsSectionGapPreviewVisible}
                    />
                    {isPageStyleShelfOpen && (
                        <div className={`h-px w-full shrink-0 ${isLightMode ? "bg-slate-300/80" : "bg-white/14"}`} />
                    )}
                    <div className="flex items-center gap-px px-1.5 py-0.5">
                    <button
                        type="button"
                        onClick={handleTogglePageStyleShelf}
                        className={`${documentToolButtonClass} ${isPageStyleShelfOpen ? isLightMode ? "!text-sky-700 shadow-[inset_0_0_0_1px_rgba(2,132,199,0.22)]" : "!text-sky-200 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.28)]" : ""}`}
                        title={isPageStyleShelfOpen ? "Close page style shelf" : "Open page style shelf"}
                        aria-label={isPageStyleShelfOpen ? "Close page style shelf" : "Open page style shelf"}
                        aria-pressed={isPageStyleShelfOpen}
                    >
                        <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.9">
                            <rect x="5" y="7" width="14" height="10" rx="2.4" />
                            <path strokeLinecap="round" d="M9 15h6" />
                        </svg>
                    </button>
                    <div className={`h-3.5 w-px ${isLightMode ? "bg-slate-300" : "bg-white/12"}`} />
                    <button
                        type="button"
                        onClick={handleFitZoom}
                        className={`${documentToolButtonClass} ${zoomMode === "fit" ? isLightMode ? "!bg-sky-100 text-sky-800 shadow-[inset_0_0_0_1px_rgba(2,132,199,0.22)]" : "!bg-sky-400/18 text-sky-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.28)]" : ""}`}
                        title="Fit page to available workspace"
                        aria-label="Fit page to available workspace"
                        aria-pressed={zoomMode === "fit"}
                    >
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l6 6M21 3l-6 6M3 21l6-6M21 21l-6-6" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setZoomMode("manual");
                            setManualZoom(1);
                        }}
                        className={`${documentToolButtonClass} ${zoomMode === "manual" && manualZoom === 1 ? isLightMode ? "!bg-sky-100 text-sky-800 shadow-[inset_0_0_0_1px_rgba(2,132,199,0.22)]" : "!bg-sky-400/18 text-sky-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.28)]" : ""}`}
                        title="Set zoom to 100%"
                        aria-label="Set zoom to 100%"
                    >
                        <span className="text-[7px] font-medium leading-none tracking-normal">1:1</span>
                    </button>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => {
                                setZoomMode("manual");
                                setManualZoom((value) => clampZoom(value - ZOOM_STEP));
                            }}
                            className={documentToolButtonClass}
                            title="Zoom out"
                            aria-label="Zoom out"
                        >
                            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                            </svg>
                        </button>
                        <span className={`min-w-9 px-1 text-center text-[7px] font-medium tracking-normal ${isLightMode ? "text-slate-700" : "text-slate-300"}`}>{zoomPercent}%</span>
                        <button
                            type="button"
                            onClick={() => {
                                setZoomMode("manual");
                                setManualZoom((value) => clampZoom(value + ZOOM_STEP));
                            }}
                            className={documentToolButtonClass}
                            title="Zoom in"
                            aria-label="Zoom in"
                        >
                            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                            </svg>
                        </button>
                    </div>
                    </div>
                    </motion.div>
                    </div>
                    </>
                )}
            </main>

    );
};
