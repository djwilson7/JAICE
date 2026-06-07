import { useState } from "react";
import { useSettings } from "@/pages/settings/provider/settingsContext";
import { normalizeResumeDataForPayload } from "./resumeData";
import { ResumeGlobalStyles } from "./components/ResumeGlobalStyles";
import { ResumePrintDocument } from "./components/ResumePrintDocument";
import { ResumeDocumentSurface } from "./components/ResumeDocumentSurface";
import { CloneResumeModal } from "./components/CloneResumeModal";
import { DeleteResumeModal } from "./components/DeleteResumeModal";
import { ResumeHeader } from "./components/ResumeHeader";
import { ResumeSwitcherRail } from "./components/ResumeSwitcherRail";
import { ResumeChatRail } from "./components/ResumeChatRail";
import { ResumeWorkspace } from "./components/ResumeWorkspace";
import { useResumeDocumentEditing } from "./hooks/useResumeDocumentEditing";
import { useResumeFormatting } from "./hooks/useResumeFormatting";
import { useResumePersistence } from "./hooks/useResumePersistence";
import { useResumeChat } from "./hooks/useResumeChat";
import { useResumeRewriteSuggestions } from "./hooks/useResumeRewriteSuggestions";
import { useResumePdfPreview } from "./hooks/useResumePdfPreview";
import { useResumeDocumentViewModel } from "./documentViewModel";
import { isResumeDebugEnabled } from "./resumeDiagnostics";

export function Resume() {
    const { theme } = useSettings();
    const isLightMode = theme === "light";
    const resumeDebugEnabled = isResumeDebugEnabled();
    const [isLeftRailCollapsed, setIsLeftRailCollapsed] = useState(false);
    const [isRightRailCollapsed, setIsRightRailCollapsed] = useState(true);

    const formatting = useResumeFormatting({
        isLightMode,
        isLeftRailCollapsed,
        isRightRailCollapsed
    });
    const {
        canvasViewportRef,
        resumeDocumentContentRef,
        pageSize,
        setPageSize,
        zoomMode,
        setZoomMode,
        manualZoom,
        setManualZoom,
        animatedCanvasZoom,
        isPageStyleShelfOpen,
        titleFontSize,
        setTitleFontSize,
        headerFontSize,
        setHeaderFontSize,
        bodyFontSize,
        setBodyFontSize,
        pageMarginPt,
        setPageMarginPt,
        paperLayoutFormat,
        setPaperLayoutFormat,
        fontPreviewTarget,
        setFontPreviewTarget,
        isMarginPreviewVisible,
        setIsMarginPreviewVisible,
        isPageFormatPreviewVisible,
        setIsPageFormatPreviewVisible,
        isSectionGapPreviewVisible,
        setIsSectionGapPreviewVisible,
        applyResumeFormatting,
        paperMetrics,
        resumePageCount,
        resumePageStride,
        resumeCanvasHeight,
        zoomPercent,
        scaledCanvasWidth,
        scaledCanvasHeight,
        canvasNeedsHorizontalScroll,
        canvasNeedsVerticalScroll,
        canvasViewportStyle,
        pdfPreviewViewportStyle,
        bottomControlsViewportStyle,
        canvasHorizontalOverflow,
        isPageStyleShelfCompact,
        printWidth,
        printHeight,
        documentSectionGapPx,
        documentSectionGapStyle,
        currentResumeFormatting,
        handleFitZoom,
        handleTogglePageStyleShelf,
        closePageStyleShelf,
        resumeChromeRootClass,
        resumeChromeBackground,
        headerShellStyle,
        railShellStyle,
        rightRailShellStyle,
        toolbarSurfaceStyle,
        shelfSurfaceStyle,
        railTitleClass,
        railTitleStyle,
        railHeaderRowClass,
        headerActionButtonClass,
        headerActionIconClass,
        documentToolButtonClass,
        shelfControlLabelClass,
        shelfSegmentGroupClass,
        shelfSegmentButtonClass,
        shelfSegmentIndicatorClass,
        shelfStepperButtonClass,
        shelfStepperControlClass,
        shelfStepperLabelClass,
        shelfStepperValueClass,
        shelfStepperRowClass
    } = formatting;

    const documentEditing = useResumeDocumentEditing();
    const {
        resumeData,
        setResumeData,
        hoveredDeleteIndex,
        setHoveredDeleteIndex,
        hoveredContactField,
        setHoveredContactField,
        focusedContactField,
        setFocusedContactField,
        hoveredNameSection,
        setHoveredNameSection,
        focusedNameSection,
        setFocusedNameSection,
        hoveredSummary,
        setHoveredSummary,
        focusedSummary,
        setFocusedSummary,
        isSummaryImproveHovered,
        setIsSummaryImproveHovered,
        hoveredField,
        setHoveredField,
        focusedField,
        setFocusedField,
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
        activeDocumentSection,
        setActiveDocumentSection,
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
        removeSkillCategory
    } = documentEditing;

    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const rewrite = useResumeRewriteSuggestions({
        resumeData,
        setResumeData,
        currentResumeFormatting,
        setError,
        setSuccessMessage
    });
    const {
        isDraft,
        originalResumeDataBeforeDraft,
        changeMetadata,
        setChangeMetadata,
        loadingSummaryImprove,
        loadingExperienceImproveId,
        summaryRewriteSuggestion,
        experienceRewriteSuggestions,
        rewriteActionHover,
        setRewriteActionHover,
        handleImproveSummary,
        handleImproveExperience,
        acceptSummaryRewriteSuggestion,
        rejectSummaryRewriteSuggestion,
        acceptExperienceRewriteSuggestion,
        rejectExperienceRewriteSuggestion
    } = rewrite;

    const persistence = useResumePersistence({
        resumeData,
        setResumeData,
        currentResumeFormatting,
        applyResumeFormatting,
        resetDraftState: rewrite.resetDraftState,
        error,
        setError,
        successMessage,
        setSuccessMessage
    });
    const {
        activeResumeId,
        resumeName,
        setResumeName,
        isMaster,
        setIsMaster,
        showCloneModal,
        setShowCloneModal,
        dontAskClone,
        setDontAskClone,
        loadingList,
        loadingSave,
        isDirty,
        setIsDirty,
        searchQuery,
        setSearchQuery,
        resumeSearchFocusSignal,
        filteredResumes,
        pendingDeleteResume,
        isDeletingResume,
        loadResumeIntoWorkspace,
        handleCreateNewClick,
        handleCreateResume,
        handleSaveResume,
        handleDeleteResume,
        cancelDeleteResume,
        confirmDeleteResume
    } = persistence;

    const pdfPreview = useResumePdfPreview({
        resumeData,
        resumeName,
        currentResumeFormatting,
        setError,
        setSuccessMessage,
        clearFormatPreviews: () => {
            setFontPreviewTarget(null);
            setIsMarginPreviewVisible(false);
            setIsPageFormatPreviewVisible(false);
            setIsSectionGapPreviewVisible(false);
        }
    });
    const {
        isPdfPreviewOpen,
        isGeneratingPdfPreview,
        pdfPreviewUrl,
        openPdfPreview,
        togglePdfPreview,
        closePdfPreview
    } = pdfPreview;

    const handleOpenPdfPreview = () => {
        setIsLeftRailCollapsed(true);
        setIsRightRailCollapsed(true);
        closePageStyleShelf();
        return openPdfPreview();
    };


    const chat = useResumeChat({
        resumeData,
        currentResumeFormatting,
        setError,
        openChatRail: () => setIsRightRailCollapsed(false)
    });
    const {
        chatInput,
        setChatInput,
        chatMessages,
        chatContainerRef,
        chatInputRef,
        isChatInputCollapsed,
        setIsChatInputCollapsed,
        showBackToBottom,
        chatScrollShadow,
        isChatResponding,
        copiedChatMessageIndex,
        isAssistantGenerating,
        scrollChatToBottom,
        handleSendChatMessage,
        handleStopChatMessage,
        handleCopyAssistantMessage,
        handleAnalyzeSummary: handleAnalyzeSummaryPrompt
    } = chat;
    const handleAnalyzeSummary = () => handleAnalyzeSummaryPrompt(resumeData.summary);

    const documentViewModel = useResumeDocumentViewModel({
        resumeData,
        changeMetadata,
        bodyFontSize,
        headerFontSize,
        pageMarginPt,
        activeDocumentSection,
        hoveredSummary,
        focusedSummary,
        hoveredContactField,
        focusedContactField,
        hoveredField,
        setHoveredField,
        focusedField,
        setFocusedField,
        rewriteActionHover
    });
    const {
        isFieldChanged,
        renderOverlayInput,
        inputStyleClass,
        boldInputClass,
        documentTextStyle,
        sectionHeadingClass,
        sectionHeadingStyle,
        compactFitMetaInputClass,
        compactFitDateInputClass,
        contactInputClass,
        resumeDividerClass,
        getDynamicInputStyle,
        contactFieldStyle,
        headerMarginAddClass,
        isExperienceSectionActive,
        experienceMarginAddClass,
        experienceMarginImproveClass,
        experienceMarginClearClass,
        experienceMarginDeleteClass,
        isSummarySectionActive,
        summaryMarginImproveClass,
        summaryRewriteHoverAction,
        summaryCurrentRewriteClass,
        showHeaderContactEditors,
        headerContactRows,
        getSuggestionReviewClass,
        renderRewriteActionButtons
    } = documentViewModel;

    const printResumeData = normalizeResumeDataForPayload({
        ...resumeData,
        formatting: currentResumeFormatting
    });

    return (
        <div
            className={resumeChromeRootClass}
            style={{
                background: resumeChromeBackground
            }}
        >
            
            <ResumeGlobalStyles paperMetrics={paperMetrics} printWidth={printWidth} printHeight={printHeight} pageMarginPt={pageMarginPt} />
            <ResumePrintDocument
                resumeData={printResumeData}
                formatting={currentResumeFormatting}
            />
            <div
                id="resume-print-comparison-harness"
                aria-hidden="true"
                data-comparison="ResumePrintDocument vs ResumeDocumentSurface"
                style={resumeDebugEnabled ? {
                    position: "absolute",
                    left: "-10000px",
                    top: 0,
                    opacity: 0,
                    pointerEvents: "none",
                    zIndex: -1
                } : { display: "none" }}
            >
                <ResumeDocumentSurface
                    rootId="resume-document-surface-print-comparison"
                    resumeData={printResumeData}
                    formatting={currentResumeFormatting}
                    mode="print"
                />
            </div>

            {showCloneModal && (
                <CloneResumeModal
                    isLightMode={isLightMode}
                    dontAskClone={dontAskClone}
                    setDontAskClone={setDontAskClone}
                    setShowCloneModal={setShowCloneModal}
                    handleCreateResume={handleCreateResume}
                    headerActionButtonClass={headerActionButtonClass}
                    headerActionIconClass={headerActionIconClass}
                />
            )}

            <DeleteResumeModal
                resume={pendingDeleteResume}
                isDeleting={isDeletingResume}
                onCancel={cancelDeleteResume}
                onConfirm={confirmDeleteResume}
            />

            {!isPdfPreviewOpen && <ResumeHeader
                isLightMode={isLightMode}
                headerShellStyle={headerShellStyle}
                headerActionButtonClass={headerActionButtonClass}
                headerActionIconClass={headerActionIconClass}
                isLeftRailCollapsed={isLeftRailCollapsed}
                setIsLeftRailCollapsed={setIsLeftRailCollapsed}
                isRightRailCollapsed={isRightRailCollapsed}
                setIsRightRailCollapsed={setIsRightRailCollapsed}
                isMaster={isMaster}
                setIsMaster={setIsMaster}
                resumeName={resumeName}
                setResumeName={setResumeName}
                isDirty={isDirty}
                setIsDirty={setIsDirty}
                activeResumeId={activeResumeId}
                isDraft={isDraft}
                loadingSave={loadingSave}
                handleSaveResume={handleSaveResume}
                isPdfPreviewOpen={isPdfPreviewOpen}
                isGeneratingPdfPreview={isGeneratingPdfPreview}
                togglePdfPreview={togglePdfPreview}
                openPdfPreview={handleOpenPdfPreview}
            />}

            <div className="absolute inset-0">

            <ResumeSwitcherRail
                isLightMode={isLightMode}
                isLeftRailCollapsed={isLeftRailCollapsed}
                railShellStyle={railShellStyle}
                railHeaderRowClass={railHeaderRowClass}
                railTitleClass={railTitleClass}
                railTitleStyle={railTitleStyle}
                headerActionButtonClass={headerActionButtonClass}
                headerActionIconClass={headerActionIconClass}
                handleCreateNewClick={handleCreateNewClick}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                resumeSearchFocusSignal={resumeSearchFocusSignal}
                loadingList={loadingList}
                filteredResumes={filteredResumes}
                activeResumeId={activeResumeId}
                loadResumeIntoWorkspace={loadResumeIntoWorkspace}
                handleDeleteResume={handleDeleteResume}
            />

            {/* CENTRAL WORKSPACE */}
            <ResumeWorkspace
                isLightMode={isLightMode}
                error={error}
                successMessage={successMessage}
                setError={setError}
                setSuccessMessage={setSuccessMessage}
                headerActionButtonClass={headerActionButtonClass}
                headerActionIconClass={headerActionIconClass}
                canvasViewportRef={canvasViewportRef}
                resumeDocumentContentRef={resumeDocumentContentRef}
                canvasNeedsHorizontalScroll={canvasNeedsHorizontalScroll}
                canvasNeedsVerticalScroll={canvasNeedsVerticalScroll}
                canvasViewportStyle={canvasViewportStyle}
                pdfPreviewViewportStyle={pdfPreviewViewportStyle}
                bottomControlsViewportStyle={bottomControlsViewportStyle}
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
                resumeData={resumeData}
                headerContactRows={headerContactRows}
                showHeaderContactEditors={showHeaderContactEditors}
                changeMetadata={changeMetadata}
                originalResumeDataBeforeDraft={originalResumeDataBeforeDraft}
                summaryRewriteSuggestion={summaryRewriteSuggestion}
                experienceRewriteSuggestions={experienceRewriteSuggestions}
                titleFontSize={titleFontSize}
                documentSectionGapStyle={documentSectionGapStyle}
                documentSectionGapPx={documentSectionGapPx}
                documentTextStyle={documentTextStyle}
                sectionHeadingClass={sectionHeadingClass}
                sectionHeadingStyle={sectionHeadingStyle}
                inputStyleClass={inputStyleClass}
                boldInputClass={boldInputClass}
                compactFitMetaInputClass={compactFitMetaInputClass}
                compactFitDateInputClass={compactFitDateInputClass}
                contactInputClass={contactInputClass}
                resumeDividerClass={resumeDividerClass}
                headerMarginAddClass={headerMarginAddClass}
                experienceMarginAddClass={experienceMarginAddClass}
                experienceMarginImproveClass={experienceMarginImproveClass}
                experienceMarginClearClass={experienceMarginClearClass}
                experienceMarginDeleteClass={experienceMarginDeleteClass}
                summaryMarginImproveClass={summaryMarginImproveClass}
                activeDocumentSection={activeDocumentSection}
                setActiveDocumentSection={setActiveDocumentSection}
                hoveredNameSection={hoveredNameSection}
                setHoveredNameSection={setHoveredNameSection}
                focusedNameSection={focusedNameSection}
                setFocusedNameSection={setFocusedNameSection}
                hoveredContactField={hoveredContactField}
                setHoveredContactField={setHoveredContactField}
                focusedContactField={focusedContactField}
                setFocusedContactField={setFocusedContactField}
                hoveredDeleteIndex={hoveredDeleteIndex}
                setHoveredDeleteIndex={setHoveredDeleteIndex}
                hoveredSummary={hoveredSummary}
                setHoveredSummary={setHoveredSummary}
                focusedSummary={focusedSummary}
                setFocusedSummary={setFocusedSummary}
                isSummaryImproveHovered={isSummaryImproveHovered}
                setIsSummaryImproveHovered={setIsSummaryImproveHovered}
                hoveredJobId={hoveredJobId}
                setHoveredJobId={setHoveredJobId}
                hoveredExperienceImproveId={hoveredExperienceImproveId}
                setHoveredExperienceImproveId={setHoveredExperienceImproveId}
                hoveredExperienceClearId={hoveredExperienceClearId}
                setHoveredExperienceClearId={setHoveredExperienceClearId}
                hoveredExperienceDeleteId={hoveredExperienceDeleteId}
                setHoveredExperienceDeleteId={setHoveredExperienceDeleteId}
                hoveredEducationDeleteId={hoveredEducationDeleteId}
                setHoveredEducationDeleteId={setHoveredEducationDeleteId}
                hoveredSkillDeleteId={hoveredSkillDeleteId}
                setHoveredSkillDeleteId={setHoveredSkillDeleteId}
                rewriteActionHover={rewriteActionHover}
                setRewriteActionHover={setRewriteActionHover}
                isExperienceSectionActive={isExperienceSectionActive}
                isSummarySectionActive={isSummarySectionActive}
                summaryRewriteHoverAction={summaryRewriteHoverAction}
                summaryCurrentRewriteClass={summaryCurrentRewriteClass}
                isSectionGapPreviewVisible={isSectionGapPreviewVisible}
                loadingSummaryImprove={loadingSummaryImprove}
                loadingExperienceImproveId={loadingExperienceImproveId}
                renderOverlayInput={renderOverlayInput}
                renderRewriteActionButtons={renderRewriteActionButtons}
                getDynamicInputStyle={getDynamicInputStyle}
                contactFieldStyle={contactFieldStyle}
                isFieldChanged={isFieldChanged}
                getSuggestionReviewClass={getSuggestionReviewClass}
                updateField={updateField}
                addCustomContactField={addCustomContactField}
                updateCustomContactField={updateCustomContactField}
                removeCustomContactField={removeCustomContactField}
                removeStandardContactField={removeStandardContactField}
                updateExperienceField={updateExperienceField}
                insertExperienceAt={insertExperienceAt}
                removeExperience={removeExperience}
                clearExperience={clearExperience}
                addBulletWithText={addBulletWithText}
                updateBulletText={updateBulletText}
                removeBullet={removeBullet}
                updateEducationField={updateEducationField}
                addEducation={addEducation}
                removeEducation={removeEducation}
                addEducationDetailWithText={addEducationDetailWithText}
                updateEducationDetailText={updateEducationDetailText}
                addSkillCategory={addSkillCategory}
                updateSkillCategoryName={updateSkillCategoryName}
                updateSkillCategoryItems={updateSkillCategoryItems}
                removeSkillCategory={removeSkillCategory}
                handleAnalyzeSummary={handleAnalyzeSummary}
                handleImproveSummary={handleImproveSummary}
                handleImproveExperience={handleImproveExperience}
                acceptSummaryRewriteSuggestion={acceptSummaryRewriteSuggestion}
                rejectSummaryRewriteSuggestion={rejectSummaryRewriteSuggestion}
                acceptExperienceRewriteSuggestion={acceptExperienceRewriteSuggestion}
                rejectExperienceRewriteSuggestion={rejectExperienceRewriteSuggestion}
                setResumeData={setResumeData}
                setChangeMetadata={setChangeMetadata}
                isPageStyleShelfOpen={isPageStyleShelfOpen}
                isPageStyleShelfCompact={isPageStyleShelfCompact}
                shelfSurfaceStyle={shelfSurfaceStyle}
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
                setTitleFontSize={setTitleFontSize}
                headerFontSize={headerFontSize}
                setHeaderFontSize={setHeaderFontSize}
                setBodyFontSize={setBodyFontSize}
                setPageMarginPt={setPageMarginPt}
                paperLayoutFormat={paperLayoutFormat}
                setPaperLayoutFormat={setPaperLayoutFormat}
                setFontPreviewTarget={setFontPreviewTarget}
                setIsMarginPreviewVisible={setIsMarginPreviewVisible}
                setIsPageFormatPreviewVisible={setIsPageFormatPreviewVisible}
                setIsSectionGapPreviewVisible={setIsSectionGapPreviewVisible}
                toolbarSurfaceStyle={toolbarSurfaceStyle}
                documentToolButtonClass={documentToolButtonClass}
                handleTogglePageStyleShelf={handleTogglePageStyleShelf}
                handleFitZoom={handleFitZoom}
                zoomMode={zoomMode}
                manualZoom={manualZoom}
                setZoomMode={setZoomMode}
                setManualZoom={setManualZoom}
                zoomPercent={zoomPercent}
                isPdfPreviewOpen={isPdfPreviewOpen}
                pdfPreviewUrl={pdfPreviewUrl}
                resumeName={resumeName}
                isGeneratingPdfPreview={isGeneratingPdfPreview}
                closePdfPreview={closePdfPreview}
                loadingList={loadingList}
            />
            <ResumeChatRail
                isLightMode={isLightMode}
                isRightRailCollapsed={isRightRailCollapsed}
                rightRailShellStyle={rightRailShellStyle}
                railHeaderRowClass={railHeaderRowClass}
                railTitleClass={railTitleClass}
                railTitleStyle={railTitleStyle}
                headerActionButtonClass={headerActionButtonClass}
                headerActionIconClass={headerActionIconClass}
                chatContainerRef={chatContainerRef}
                chatInputRef={chatInputRef}
                chatMessages={chatMessages}
                copiedChatMessageIndex={copiedChatMessageIndex}
                handleCopyAssistantMessage={handleCopyAssistantMessage}
                isChatResponding={isChatResponding}
                isAssistantGenerating={isAssistantGenerating}
                showBackToBottom={showBackToBottom}
                chatScrollShadow={chatScrollShadow}
                scrollChatToBottom={scrollChatToBottom}
                isChatInputCollapsed={isChatInputCollapsed}
                setIsChatInputCollapsed={setIsChatInputCollapsed}
                chatInput={chatInput}
                setChatInput={setChatInput}
                handleSendChatMessage={handleSendChatMessage}
                handleStopChatMessage={handleStopChatMessage}
            />
            </div>
        </div>
    );
}

export default Resume;
