import React from "react";
import { motion } from "framer-motion";
import { AutoResizeTextarea } from "../AutoResizeTextarea";
import { DocumentSection } from "../DocumentSection";
import type { ResumeEditorSectionProps } from "./types";

export const ResumeSummarySection: React.FC<ResumeEditorSectionProps> = ({
    data,
    formatting,
    interaction,
    handlers,
    renderSectionTitle
}) => {
    const { resumeData, summaryRewriteSuggestion } = data;
    const {
        documentSectionGapPx,
        inputStyleClass,
        summaryMarginImproveClass
    } = formatting;
    const {
        activeDocumentSection,
        focusedDocumentSection,
        setActiveDocumentSection,
        hoveredSummary,
        setHoveredSummary,
        focusedSummary,
        setFocusedSummary,
        setHoveredField = () => undefined,
        isSummaryImproveHovered,
        setIsSummaryImproveHovered,
        setRewriteActionHover,
        isSummarySectionActive,
        summaryRewriteHoverAction,
        summaryCurrentRewriteClass,
        gapPreviewTarget,
        loadingSummaryImprove
    } = interaction;
    const {
        renderRewriteActionButtons,
        getSuggestionReviewClass,
        updateField,
        handleImproveSummary,
        acceptSummaryRewriteSuggestion,
        rejectSummaryRewriteSuggestion
    } = handlers;
    const isOpen = hoveredSummary || focusedSummary;
    const isExpanded = isOpen || isSummarySectionActive;

    return (
        <DocumentSection
            id="summary"
            activeSection={activeDocumentSection}
            focusedSection={focusedDocumentSection}
            setActiveSection={setActiveDocumentSection}
            className="group/summary"
            showGapPreview={gapPreviewTarget === "section"}
            gapPreviewHeight={documentSectionGapPx}
        >
            {renderSectionTitle("summary")}
            <button
                type="button"
                onMouseEnter={() => setIsSummaryImproveHovered(true)}
                onMouseLeave={() => setIsSummaryImproveHovered(false)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleImproveSummary}
                disabled={Boolean(summaryRewriteSuggestion?.isStreaming) || !resumeData.summary}
                className={summaryMarginImproveClass}
                style={{ top: "28px" }}
                title="AI Rewrite Summary"
                aria-label="AI Rewrite Summary"
            >
                {loadingSummaryImprove ? (
                    <div className="resume-editor-spinner" />
                ) : (
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                    </svg>
                )}
            </button>
            <motion.div
                className={`summary-meta-field resume-editor-summary${isSummaryImproveHovered ? " experience-ai-hover" : ""}`}
                data-resume-segment-id="summary-body"
                data-open={isOpen}
                onHoverStart={() => {
                    setHoveredSummary(true);
                    setHoveredField("summary");
                }}
                onHoverEnd={() => {
                    setHoveredSummary(false);
                    setHoveredField((current) => current === "summary" ? null : current);
                }}
                animate={{
                    paddingTop: isExpanded ? 2 : 0,
                    paddingRight: isExpanded ? 2 : 0,
                    paddingBottom: isExpanded ? 1 : 0,
                    paddingLeft: isExpanded ? 2 : 0,
                    marginTop: isExpanded ? -2 : 0,
                    marginRight: isExpanded ? -2 : 0,
                    marginBottom: isExpanded ? -1 : 0,
                    marginLeft: isExpanded ? -2 : 0,
                    backgroundColor: isOpen
                        ? "rgba(255, 255, 255, 0.94)"
                        : isSummarySectionActive
                        ? "rgba(255, 255, 255, 1)"
                        : "rgba(255, 255, 255, 0)",
                    borderColor: summaryRewriteHoverAction || isOpen || isSummaryImproveHovered
                        ? "transparent"
                        : isSummarySectionActive
                        ? "rgba(30, 64, 175, 0.52)"
                        : "transparent",
                    borderTopLeftRadius: isExpanded ? 5 : 4,
                    borderTopRightRadius: isExpanded ? 5 : 4,
                    borderBottomLeftRadius: isExpanded ? 5 : 4,
                    borderBottomRightRadius: isExpanded ? 5 : 4,
                    boxShadow: summaryRewriteHoverAction
                        ? "0 0px 0px rgba(0,0,0,0), inset 0 0 0 rgba(255,255,255,0)"
                        : isOpen
                        ? "0 10px 30px rgba(15, 23, 42, 0.15), 0 0 0 1px #38bdf8"
                        : "0 0px 0px rgba(0,0,0,0), inset 0 0 0 rgba(255,255,255,0)"
                }}
                transition={{ duration: 0.28, ease: [0.32, 0.72, 0.32, 1] }}
                style={{
                    transformOrigin: "center",
                    zIndex: isOpen ? 80 : 0,
                    backdropFilter: isOpen ? "blur(22px) saturate(160%)" : "none",
                    WebkitBackdropFilter: isOpen ? "blur(22px) saturate(160%)" : "none",
                    border: "1px solid"
                }}
            >
                <div className="resume-editor-summary__input">
                    <AutoResizeTextarea
                        className={`${inputStyleClass} resume-body-font-target summary-item-input resume-editor-summary__textarea ${summaryCurrentRewriteClass}`}
                        value={resumeData.summary || ""}
                        onChange={(event) => updateField("summary", event.target.value)}
                        onFocus={() => setFocusedSummary(true)}
                        onBlur={() => setFocusedSummary(false)}
                        placeholder="Brief professional profile summary emphasizing key skills..."
                        style={{
                            borderRadius: isOpen ? 4 : undefined,
                            transition: "color 150ms ease, opacity 150ms ease, text-decoration-color 150ms ease"
                        }}
                    />
                </div>
            </motion.div>
            {(loadingSummaryImprove || summaryRewriteSuggestion) && (
                <div
                    className="experience-ai-hover resume-editor-rewrite-suggestion"
                    style={{
                        lineHeight: "var(--resume-body-line-height)",
                        fontFamily: "var(--font-body)",
                        textAlign: "left"
                    }}
                >
                    {summaryRewriteSuggestion ? (
                        <>
                            {!summaryRewriteSuggestion.isStreaming && renderRewriteActionButtons({
                                onAccept: acceptSummaryRewriteSuggestion,
                                onReject: rejectSummaryRewriteSuggestion,
                                onAcceptHover: () =>
                                    setRewriteActionHover({ target: "summary", action: "accept" }),
                                onRejectHover: () =>
                                    setRewriteActionHover({ target: "summary", action: "reject" }),
                                onClearHover: () => setRewriteActionHover(null)
                            })}
                            <div className={`resume-rewrite-suggestion-text ${getSuggestionReviewClass(summaryRewriteHoverAction || undefined)}`}>
                                {summaryRewriteSuggestion.suggestedText
                                    || (summaryRewriteSuggestion.isQueued
                                        ? "Queued summary rewrite..."
                                        : "Generating summary rewrite...")}
                            </div>
                            {summaryRewriteSuggestion.reason && !summaryRewriteSuggestion.isStreaming && (
                                <div className="resume-editor-rewrite-reason">
                                    {summaryRewriteSuggestion.reason}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="resume-editor-rewrite-loading text-shimmer-light">
                            Generating summary rewrite...
                        </div>
                    )}
                </div>
            )}
        </DocumentSection>
    );
};
