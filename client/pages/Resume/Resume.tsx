import { useMemo, useState } from "react";
import { useSettings } from "@/pages/settings/provider/settingsContext";
import { normalizeResumeDataForPayload } from "./resumeData";
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
import { getResumeDocumentTextStats, getResumeFieldTextStats } from "./resumeTextStats";
import "./resume.css";
import "./resume-editor.css";
import "./resume-preview.css";

export function Resume() {
    const { theme } = useSettings();
    const isLightMode = theme === "light";
    const resumeDebugEnabled = isResumeDebugEnabled();
    const [isLeftRailCollapsed, setIsLeftRailCollapsed] = useState(true);
    const [isRightRailCollapsed, setIsRightRailCollapsed] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleToggleLeftRail = () => {
        const isOpeningLeftRail = isLeftRailCollapsed;
        setIsLeftRailCollapsed(!isLeftRailCollapsed);
        if (isOpeningLeftRail) setIsRightRailCollapsed(true);
    };

    const handleToggleRightRail = () => {
        const isOpeningRightRail = isRightRailCollapsed;
        setIsRightRailCollapsed(!isRightRailCollapsed);
        if (isOpeningRightRail) setIsLeftRailCollapsed(true);
    };

    const handleOpenRightRail = () => {
        setIsLeftRailCollapsed(true);
        setIsRightRailCollapsed(false);
    };

    const formatting = useResumeFormatting({
        isLightMode,
        isLeftRailCollapsed,
        isRightRailCollapsed
    });
    const documentEditing = useResumeDocumentEditing();
    const { resumeData, setResumeData } = documentEditing;

    const rewrite = useResumeRewriteSuggestions({
        resumeData,
        setResumeData,
        currentResumeFormatting: formatting.currentResumeFormatting,
        setError,
        setSuccessMessage
    });

    const persistence = useResumePersistence({
        resumeData,
        setResumeData,
        currentResumeFormatting: formatting.currentResumeFormatting,
        applyResumeFormatting: formatting.applyResumeFormatting,
        resetDraftState: rewrite.resetDraftState,
        error,
        setError,
        successMessage,
        setSuccessMessage
    });

    const pdfPreview = useResumePdfPreview({
        resumeData,
        resumeName: persistence.resumeName,
        currentResumeFormatting: formatting.currentResumeFormatting,
        setError,
        setSuccessMessage,
        clearFormatPreviews: () => {
            formatting.setFontPreviewTarget(null);
            formatting.setIsMarginPreviewVisible(false);
            formatting.setIsPageFormatPreviewVisible(false);
            formatting.setGapPreviewTarget(null);
        }
    });

    const handleOpenPdfPreview = () => {
        setIsLeftRailCollapsed(true);
        setIsRightRailCollapsed(true);
        formatting.closePageStyleShelf();
        return pdfPreview.openPdfPreview();
    };

    const handleTogglePdfPreview = () =>
        pdfPreview.isPdfPreviewOpen
            ? pdfPreview.togglePdfPreview()
            : handleOpenPdfPreview();

    const chat = useResumeChat({
        resumeData,
        currentResumeFormatting: formatting.currentResumeFormatting,
        setError,
        openChatRail: handleOpenRightRail
    });

    const documentViewModel = useResumeDocumentViewModel({
        resumeData,
        changeMetadata: rewrite.changeMetadata,
        bodyFontSize: formatting.bodyFontSize,
        headerFontSize: formatting.headerFontSize,
        subHeaderFontSize: formatting.subHeaderFontSize,
        pageMarginPt: formatting.pageMarginPt,
        activeDocumentSection: documentEditing.activeDocumentSection,
        hoveredSummary: documentEditing.hoveredSummary,
        focusedSummary: documentEditing.focusedSummary,
        hoveredContactField: documentEditing.hoveredContactField,
        focusedContactField: documentEditing.focusedContactField,
        hoveredField: documentEditing.hoveredField,
        setHoveredField: documentEditing.setHoveredField,
        focusedField: documentEditing.focusedField,
        setFocusedField: documentEditing.setFocusedField,
        rewriteActionHover: rewrite.rewriteActionHover
    });

    const handleAnalyzeSummary = () => chat.handleAnalyzeSummary(resumeData.summary);
    const documentTextStats = useMemo(
        () => getResumeDocumentTextStats(resumeData),
        [resumeData]
    );
    const activeFieldTextStats = useMemo(
        () => getResumeFieldTextStats(resumeData, documentEditing.hoveredField),
        [documentEditing.hoveredField, resumeData]
    );
    const printResumeData = normalizeResumeDataForPayload({
        ...resumeData,
        formatting: formatting.currentResumeFormatting
    });

    return (
        <div className="resume-page">
            <ResumePrintDocument
                resumeData={printResumeData}
                formatting={formatting.currentResumeFormatting}
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
                    formatting={formatting.currentResumeFormatting}
                    mode="print"
                />
            </div>

            {persistence.showCloneModal && (
                <CloneResumeModal
                    isLightMode={isLightMode}
                    dontAskClone={persistence.dontAskClone}
                    setDontAskClone={persistence.setDontAskClone}
                    setShowCloneModal={persistence.setShowCloneModal}
                    handleCreateResume={persistence.handleCreateResume}
                    headerActionButtonClass="resume-action-button"
                    headerActionIconClass="resume-action-button__icon"
                />
            )}

            <DeleteResumeModal
                resume={persistence.pendingDeleteResume}
                isDeleting={persistence.isDeletingResume}
                onCancel={persistence.cancelDeleteResume}
                onConfirm={persistence.confirmDeleteResume}
            />

            {!pdfPreview.isPdfPreviewOpen && (
                <ResumeHeader
                    isLightMode={isLightMode}
                    isLeftRailCollapsed={isLeftRailCollapsed}
                    onToggleLeftRail={handleToggleLeftRail}
                    isRightRailCollapsed={isRightRailCollapsed}
                    onToggleRightRail={handleToggleRightRail}
                    isMaster={persistence.isMaster}
                    setIsMaster={persistence.setIsMaster}
                    resumeName={persistence.resumeName}
                    setResumeName={persistence.setResumeName}
                    isDirty={persistence.isDirty}
                    setIsDirty={persistence.setIsDirty}
                    isDraft={rewrite.isDraft}
                    loadingSave={persistence.loadingSave}
                    autoSaveEnabled={persistence.autoSaveEnabled}
                    setAutoSaveEnabled={persistence.setAutoSaveEnabled}
                    handleSaveResume={persistence.handleSaveResume}
                    isPdfPreviewOpen={pdfPreview.isPdfPreviewOpen}
                    isGeneratingPdfPreview={pdfPreview.isGeneratingPdfPreview}
                    togglePdfPreview={handleTogglePdfPreview}
                    openPdfPreview={handleOpenPdfPreview}
                    documentTextStats={documentTextStats}
                    activeFieldTextStats={activeFieldTextStats}
                />
            )}

            <div className="resume-page__layers">
                <ResumeSwitcherRail
                    isLightMode={isLightMode}
                    isLeftRailCollapsed={isLeftRailCollapsed}
                    handleCreateNewClick={persistence.handleCreateNewClick}
                    searchQuery={persistence.searchQuery}
                    setSearchQuery={persistence.setSearchQuery}
                    resumeSearchFocusSignal={persistence.resumeSearchFocusSignal}
                    loadingList={persistence.loadingList}
                    filteredResumes={persistence.filteredResumes}
                    activeResumeId={persistence.activeResumeId}
                    loadResumeIntoWorkspace={persistence.loadResumeIntoWorkspace}
                    handleDeleteResume={persistence.handleDeleteResume}
                />

                <ResumeWorkspace
                    theme={{ isLightMode }}
                    alerts={{ error, successMessage, setError, setSuccessMessage }}
                    formatting={formatting}
                    editing={documentEditing}
                    rewrite={rewrite}
                    viewModel={documentViewModel}
                    pdfPreview={pdfPreview}
                    persistence={{
                        resumeName: persistence.resumeName,
                        loadingList: persistence.loadingList,
                        initialLoadState: persistence.initialLoadState
                    }}
                    onAnalyzeSummary={handleAnalyzeSummary}
                />

                <ResumeChatRail
                    isLightMode={isLightMode}
                    isRightRailCollapsed={isRightRailCollapsed}
                    chatContainerRef={chat.chatContainerRef}
                    chatInputRef={chat.chatInputRef}
                    chatMessages={chat.chatMessages}
                    copiedChatMessageIndex={chat.copiedChatMessageIndex}
                    handleCopyAssistantMessage={chat.handleCopyAssistantMessage}
                    isChatResponding={chat.isChatResponding}
                    isAssistantGenerating={chat.isAssistantGenerating}
                    showBackToBottom={chat.showBackToBottom}
                    chatScrollShadow={chat.chatScrollShadow}
                    scrollChatToBottom={chat.scrollChatToBottom}
                    isChatInputCollapsed={chat.isChatInputCollapsed}
                    setIsChatInputCollapsed={chat.setIsChatInputCollapsed}
                    chatInput={chat.chatInput}
                    setChatInput={chat.setChatInput}
                    handleSendChatMessage={chat.handleSendChatMessage}
                    handleStopChatMessage={chat.handleStopChatMessage}
                />
            </div>
        </div>
    );
}

export default Resume;
