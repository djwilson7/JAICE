import React from "react";
import { motion } from "framer-motion";
import type { ContactFieldKey, ContactRenderField, DocumentSectionId, EducationItem, ExperienceItem, ExperienceRewriteSuggestion, ResumeData, ResumeRewriteActionHover, SummaryRewriteSuggestion } from "../types";
import { getSkillItemsText, hasText } from "../resumeData";
import { AutoResizeTextarea } from "./AutoResizeTextarea";
import { DocumentSection } from "./DocumentSection";

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

type ResumeDocumentEditorData = {
    resumeData: ResumeData;
    headerContactRows: ContactRenderField[][];
    showHeaderContactEditors: boolean;
    changeMetadata: { path: string; reason: string }[];
    originalResumeDataBeforeDraft: ResumeData | null;
    summaryRewriteSuggestion: SummaryRewriteSuggestion | null;
    experienceRewriteSuggestions: Record<string, ExperienceRewriteSuggestion>;
};

type ResumeDocumentEditorFormatting = {
    titleFontSize: number;
    bodyFontSize: number;
    pageMarginPt: number;
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
};

type ResumeDocumentEditorInteraction = {
    activeDocumentSection: DocumentSectionId | null;
    setActiveDocumentSection: React.Dispatch<React.SetStateAction<DocumentSectionId | null>>;
    hoveredNameSection: boolean;
    setHoveredNameSection: React.Dispatch<React.SetStateAction<boolean>>;
    focusedNameSection: boolean;
    setFocusedNameSection: React.Dispatch<React.SetStateAction<boolean>>;
    hoveredContactField: string | null;
    setHoveredContactField: React.Dispatch<React.SetStateAction<string | null>>;
    focusedContactField: string | null;
    setFocusedContactField: React.Dispatch<React.SetStateAction<string | null>>;
    hoveredDeleteIndex: string | null;
    setHoveredDeleteIndex: React.Dispatch<React.SetStateAction<string | null>>;
    hoveredSummary: boolean;
    setHoveredSummary: React.Dispatch<React.SetStateAction<boolean>>;
    focusedSummary: boolean;
    setFocusedSummary: React.Dispatch<React.SetStateAction<boolean>>;
    isSummaryImproveHovered: boolean;
    setIsSummaryImproveHovered: React.Dispatch<React.SetStateAction<boolean>>;
    hoveredJobId: string | null;
    setHoveredJobId: React.Dispatch<React.SetStateAction<string | null>>;
    hoveredExperienceImproveId: string | null;
    setHoveredExperienceImproveId: React.Dispatch<React.SetStateAction<string | null>>;
    hoveredExperienceClearId: string | null;
    setHoveredExperienceClearId: React.Dispatch<React.SetStateAction<string | null>>;
    hoveredExperienceDeleteId: string | null;
    setHoveredExperienceDeleteId: React.Dispatch<React.SetStateAction<string | null>>;
    hoveredEducationDeleteId: string | null;
    setHoveredEducationDeleteId: React.Dispatch<React.SetStateAction<string | null>>;
    hoveredSkillDeleteId: string | null;
    setHoveredSkillDeleteId: React.Dispatch<React.SetStateAction<string | null>>;
    rewriteActionHover: ResumeRewriteActionHover | null;
    setRewriteActionHover: React.Dispatch<React.SetStateAction<ResumeRewriteActionHover | null>>;
    isExperienceSectionActive: boolean;
    isSummarySectionActive: boolean;
    summaryRewriteHoverAction: "accept" | "reject" | null;
    summaryCurrentRewriteClass: string;
    isSectionGapPreviewVisible: boolean;
    loadingSummaryImprove: boolean;
    loadingExperienceImproveId: string | null;
};

type ResumeDocumentEditorHandlers = {
    renderOverlayInput: (params: OverlayInputParams) => React.ReactNode;
    renderRewriteActionButtons: (params: { onAccept: () => void; onReject: () => void; onAcceptHover: () => void; onRejectHover: () => void; onClearHover: () => void }) => React.ReactNode;
    getDynamicInputStyle: (value: string | undefined, placeholder: string, font?: string, extraStyles?: React.CSSProperties) => React.CSSProperties;
    contactFieldStyle: (value: string | undefined, placeholder: string) => React.CSSProperties;
    isFieldChanged: (path: string) => { changed: boolean; reason?: string };
    getSuggestionReviewClass: (action?: "accept" | "reject") => string;
    updateField: (field: keyof ResumeData, value: string) => void;
    addCustomContactField: () => void;
    updateCustomContactField: (index: number, field: "label" | "value", val: string) => void;
    removeCustomContactField: (index: number) => void;
    removeStandardContactField: (field: keyof Pick<ResumeData, "location" | "phone" | "email" | "linkedin" | "website" | "github">) => void;
    updateExperienceField: (id: string, field: keyof ExperienceItem, value: string) => void;
    insertExperienceAt: (index: number) => void;
    removeExperience: (id: string) => void;
    clearExperience: (id: string) => void;
    addBulletWithText: (expId: string, text: string) => void;
    updateBulletText: (expId: string, bulletId: string, value: string) => void;
    removeBullet: (expId: string, bulletId: string) => void;
    updateEducationField: (id: string, field: keyof EducationItem, value: string) => void;
    addEducation: () => void;
    removeEducation: (id: string) => void;
    addEducationDetailWithText: (educationId: string, text: string) => void;
    updateEducationDetailText: (educationId: string, detailId: string, value: string) => void;
    addSkillCategory: () => void;
    updateSkillCategoryName: (id: string, value: string) => void;
    updateSkillCategoryItems: (id: string, value: string) => void;
    removeSkillCategory: (id: string) => void;
    handleAnalyzeSummary: () => void;
    handleImproveSummary: () => void | Promise<void>;
    handleImproveExperience: (experience: ExperienceItem) => void | Promise<void>;
    acceptSummaryRewriteSuggestion: () => void;
    rejectSummaryRewriteSuggestion: () => void;
    acceptExperienceRewriteSuggestion: (experienceId: string, bulletId: string) => void;
    rejectExperienceRewriteSuggestion: (experienceId: string, bulletId: string) => void;
    setResumeData: React.Dispatch<React.SetStateAction<ResumeData>>;
    setChangeMetadata: React.Dispatch<React.SetStateAction<{ path: string; before: string; after: string; reason: string }[]>>;
    setSuccessMessage: React.Dispatch<React.SetStateAction<string | null>>;
};

type ResumeDocumentEditorProps = {
    data: ResumeDocumentEditorData;
    formatting: ResumeDocumentEditorFormatting;
    interaction: ResumeDocumentEditorInteraction;
    handlers: ResumeDocumentEditorHandlers;
};

export const ResumeDocumentEditor: React.FC<ResumeDocumentEditorProps> = ({ data, formatting, interaction, handlers }) => {
    const { resumeData, headerContactRows, showHeaderContactEditors, summaryRewriteSuggestion, experienceRewriteSuggestions } = data;
    const { titleFontSize, documentSectionGapStyle, documentSectionGapPx, documentTextStyle, sectionHeadingClass, sectionHeadingStyle, inputStyleClass, boldInputClass, compactFitMetaInputClass, compactFitDateInputClass, contactInputClass, resumeDividerClass, headerMarginAddClass, experienceMarginAddClass, experienceMarginImproveClass, experienceMarginClearClass, experienceMarginDeleteClass, summaryMarginImproveClass } = formatting;
    const { activeDocumentSection, setActiveDocumentSection, hoveredNameSection, setHoveredNameSection, focusedNameSection, setFocusedNameSection, hoveredContactField, setHoveredContactField, focusedContactField, setFocusedContactField, hoveredDeleteIndex, setHoveredDeleteIndex, hoveredSummary, setHoveredSummary, focusedSummary, setFocusedSummary, isSummaryImproveHovered, setIsSummaryImproveHovered, hoveredJobId, setHoveredJobId, hoveredExperienceImproveId, setHoveredExperienceImproveId, hoveredExperienceClearId, setHoveredExperienceClearId, hoveredExperienceDeleteId, setHoveredExperienceDeleteId, hoveredEducationDeleteId, setHoveredEducationDeleteId, hoveredSkillDeleteId, setHoveredSkillDeleteId, rewriteActionHover, setRewriteActionHover, isExperienceSectionActive, isSummarySectionActive, summaryRewriteHoverAction, summaryCurrentRewriteClass, isSectionGapPreviewVisible, loadingSummaryImprove, loadingExperienceImproveId } = interaction;
    const { renderOverlayInput, renderRewriteActionButtons, getDynamicInputStyle, contactFieldStyle, getSuggestionReviewClass, updateField, addCustomContactField, updateCustomContactField, removeCustomContactField, removeStandardContactField, updateExperienceField, insertExperienceAt, removeExperience, clearExperience, addBulletWithText, updateBulletText, removeBullet, updateEducationField, addEducation, removeEducation, addEducationDetailWithText, updateEducationDetailText, addSkillCategory, updateSkillCategoryName, updateSkillCategoryItems, removeSkillCategory, handleImproveSummary, handleImproveExperience, acceptSummaryRewriteSuggestion, rejectSummaryRewriteSuggestion, acceptExperienceRewriteSuggestion, rejectExperienceRewriteSuggestion } = handlers;

    return (
        <>
                            <DocumentSection
                                id="header"
                                activeSection={activeDocumentSection}
                                setActiveSection={setActiveDocumentSection}
                                style={documentSectionGapStyle}
                                showGapPreview={isSectionGapPreviewVisible}
                                gapPreviewHeight={documentSectionGapPx}
                            >
                            {/* --- FULL NAME --- */}
                            <div
                                className="mb-0.5 rounded-sm border border-transparent bg-transparent text-center transition-colors"
                                onMouseEnter={() => setHoveredNameSection(true)}
                                onMouseLeave={() => setHoveredNameSection(false)}
                                style={{
                                    backgroundColor: activeDocumentSection === "header" ? "#ffffff" : undefined,
                                    borderColor: (hoveredNameSection || focusedNameSection)
                                        ? "rgba(96, 165, 250, 0.78)"
                                        : activeDocumentSection === "header"
                                        ? "rgba(30, 64, 175, 0.52)"
                                        : undefined
                                }}
                            >
                                <input
                                    className={`${boldInputClass} resume-title-font-target text-center leading-none text-slate-950 py-1 hover:bg-white focus:border-transparent focus:bg-white focus:ring-0`}
                                    value={resumeData.fullName}
                                    onChange={(e) => updateField("fullName", e.target.value)}
                                    onFocus={() => setFocusedNameSection(true)}
                                    onBlur={() => setFocusedNameSection(false)}
                                    placeholder="YOUR NAME"
                                    style={getDynamicInputStyle(resumeData.fullName, "YOUR NAME", `bold ${titleFontSize}px Poppins, Arial, sans-serif`, { fontSize: `${titleFontSize}px` })}
                                />
                            </div>

                            {/* --- CONTACT STRIP --- */}
                            {(showHeaderContactEditors || headerContactRows.length > 0) && (
                            <div 
                                className="contact-strip flex flex-col items-center gap-0.5 whitespace-nowrap px-1.5 pt-0.5 pb-0 text-[#475569] border border-transparent hover:border-slate-200 hover:bg-slate-50 rounded-sm transition-colors relative group/contact z-20"
                                data-contact-open={Boolean(hoveredContactField || focusedContactField)}
                                style={{
                                    fontFamily: "var(--font-subheading)",
                                    backgroundColor: activeDocumentSection === "header" ? "#ffffff" : undefined,
                                    borderColor: activeDocumentSection === "header" ? "rgba(30, 64, 175, 0.52)" : undefined
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={addCustomContactField}
                                    className={`${headerMarginAddClass} top-0`}
                                    title="Add custom link"
                                    aria-label="Add contact metadata field"
                                >
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                                {(() => {
                                    const activeContactField = hoveredContactField || focusedContactField;
                                    const activeRowIndex = headerContactRows.findIndex((row) => row.some((field) => field.key === activeContactField));

                                    return headerContactRows.map((row, rowIdx) => {
                                        const isActiveRow = activeRowIndex === rowIdx;
                                        return (
                                        <div
                                            key={rowIdx}
                                            className="contact-row relative flex max-w-full items-center gap-1"
                                            style={{ zIndex: isActiveRow ? 70 : 0 }}
                                        >
                                            {row.map((field, fieldIdx) => (
                                                <React.Fragment key={field.key}>
                                                    {fieldIdx > 0 && (
                                                        <span className={`${resumeDividerClass} contact-divider`} style={documentTextStyle}>
                                                            &bull;
                                                        </span>
                                                    )}
                                                    {(() => {
                                                          const isOpen = hoveredContactField === field.key || focusedContactField === field.key;
                                                          const buttonsEnd = 20;
                                                          const overlayLeftPad = 2;
                                                          const overlayRightPad = buttonsEnd + 8; // 28
                                                          // Symmetric easing — same curve in/out for a smooth, balanced feel
                                                          const fluidEase = [0.32, 0.72, 0.32, 1] as [number, number, number, number];
                                                          return (
                                                              <motion.div
                                                                   className="contact-meta-field relative flex flex-col items-stretch"
                                                                   data-open={isOpen}
                                                                   onHoverStart={() => setHoveredContactField(field.key)}
                                                                   onHoverEnd={() => setHoveredContactField((current) => current === field.key ? null : current)}
                                                                   animate={{
                                                                       paddingTop: isOpen ? 2 : 0,
                                                                       paddingRight: overlayRightPad,
                                                                       paddingBottom: isOpen ? 1 : 0,
                                                                       paddingLeft: overlayLeftPad,
                                                                       marginTop: isOpen ? -2 : 0,
                                                                       marginRight: -overlayRightPad,
                                                                       marginBottom: isOpen ? -1 : 0,
                                                                       marginLeft: -overlayLeftPad,
                                                                       backgroundColor: isOpen ? "rgba(255, 255, 255, 0.94)" : "rgba(255, 255, 255, 0)",
                                                                       borderTopLeftRadius: isOpen ? 5 : 4,
                                                                       borderTopRightRadius: isOpen ? 5 : 4,
                                                                       borderBottomLeftRadius: isOpen ? 5 : 4,
                                                                       borderBottomRightRadius: isOpen ? 5 : 4,
                                                                       boxShadow: isOpen
                                                                           ? hoveredDeleteIndex === field.key
                                                                               ? "0 10px 30px rgba(15, 23, 42, 0.15), 0 0 0 1px #dc2626"
                                                                               : "0 10px 30px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(14, 165, 233, 0.35)"
                                                                           : "0 0px 0px rgba(0,0,0,0), 0 0 0 0px rgba(0,0,0,0)",
                                                                   }}
                                                                  transition={{ duration: 0.28, ease: fluidEase }}
                                                                  style={{
                                                                      transformOrigin: "center",
                                                                      zIndex: isOpen ? 80 : 0,
                                                                      backdropFilter: isOpen ? "blur(22px) saturate(160%)" : "none",
                                                                      WebkitBackdropFilter: isOpen ? "blur(22px) saturate(160%)" : "none"
                                                                  }}
                                                              >
                                                                  <div className="relative flex min-w-0 items-center">
                                                                      <input
                                                                          className={`${contactInputClass} contact-item-input placeholder:text-slate-400`}
                                                                          value={field.value || ""}
                                                                          onChange={(e) => {
                                                                              if (field.isCustom === true) {
                                                                                  updateCustomContactField(field.index, "value", e.target.value);
                                                                              } else {
                                                                                  updateField(field.key as keyof ResumeData, e.target.value);
                                                                              }
                                                                          }}
                                                                          onFocus={() => setFocusedContactField(field.key)}
                                                                          onBlur={() => setFocusedContactField((current) => current === field.key ? null : current)}
                                                                          placeholder={field.placeholder || "Add text"}
                                                                          style={{
                                                                              ...contactFieldStyle(field.value, field.placeholder || "Add text"),
                                                                              color: hoveredDeleteIndex === field.key ? "#dc2626" : isOpen ? "#0f172a" : undefined,
                                                                              textDecoration: hoveredDeleteIndex === field.key ? "line-through" : undefined,
                                                                              textDecorationColor: hoveredDeleteIndex === field.key ? "#dc2626" : undefined,
                                                                              borderRadius: isOpen ? 4 : undefined,
                                                                              transition: "color 150ms ease, text-decoration 150ms ease, text-decoration-color 150ms ease"
                                                                          }}
                                                                      />
                                                                      {isOpen && (
                                                                         <button
                                                                             type="button"
                                                                             onMouseEnter={() => setHoveredDeleteIndex(field.key)}
                                                                             onMouseLeave={() => setHoveredDeleteIndex(null)}
                                                                             onMouseDown={(e) => e.preventDefault()}
                                                                             onClick={() => {
                                                                                 if (field.isCustom === true) {
                                                                                     removeCustomContactField(field.index);
                                                                                 } else {
                                                                                     removeStandardContactField(field.key as ContactFieldKey);
                                                                                 }
                                                                             }}
                                                                             className="resume-edit-control absolute left-full top-1/2 z-10 !inline-flex !h-4 !w-4 -translate-y-1/2 items-center justify-center rounded-full border border-transparent !bg-transparent !p-0 text-[#f87171] opacity-80 shadow-none transition-[background,color,opacity] hover:!bg-red-500/15 hover:text-[#f87171] hover:opacity-100"
                                                                             style={{ marginLeft: 4 }}
                                                                             title="Delete"
                                                                             aria-label={`Delete ${field.isCustom ? "custom field" : field.placeholder}`}
                                                                         >
                                                                             <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth="2.75" aria-hidden="true">
                                                                                 <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2m-8 3 .7 9h8.6l.7-9" />
                                                                             </svg>
                                                                         </button>
                                                                     )}
                                                                 </div>
                                                              </motion.div>
                                                          );
                                                    })()}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                        );
                                    });
                                })()}
                            </div>
                            )}
                            </DocumentSection>

                            {/* --- PROFESSIONAL SUMMARY --- */}
                            <DocumentSection
                                id="summary"
                                activeSection={activeDocumentSection}
                                setActiveSection={setActiveDocumentSection}
                                className="group/summary"
                                style={documentSectionGapStyle}
                                showGapPreview={isSectionGapPreviewVisible}
                                gapPreviewHeight={documentSectionGapPx}
                            >
                                <h2 className={sectionHeadingClass} style={sectionHeadingStyle}>
                                    Professional Summary
                                </h2>
                                <button
                                    type="button"
                                    onMouseEnter={() => setIsSummaryImproveHovered(true)}
                                    onMouseLeave={() => setIsSummaryImproveHovered(false)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={handleImproveSummary}
                                    disabled={Boolean(summaryRewriteSuggestion?.isStreaming) || !resumeData.summary}
                                    className={summaryMarginImproveClass}
                                    style={{ top: "28px" }}
                                    title="AI Rewrite Summary"
                                    aria-label="AI Rewrite Summary"
                                >
                                    {loadingSummaryImprove ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-400"></div>
                                    ) : (
                                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                                        </svg>
                                    )}
                                </button>
                                <motion.div
                                    className={`summary-meta-field relative flex flex-col items-stretch ${isSummaryImproveHovered ? "experience-ai-hover" : ""}`}
                                    data-open={hoveredSummary || focusedSummary}
                                    onHoverStart={() => setHoveredSummary(true)}
                                    onHoverEnd={() => setHoveredSummary(false)}
                                    animate={{
                                        paddingTop: (hoveredSummary || focusedSummary || isSummarySectionActive) ? 2 : 0,
                                        paddingRight: (hoveredSummary || focusedSummary || isSummarySectionActive) ? 2 : 0,
                                        paddingBottom: (hoveredSummary || focusedSummary || isSummarySectionActive) ? 1 : 0,
                                        paddingLeft: (hoveredSummary || focusedSummary || isSummarySectionActive) ? 2 : 0,
                                        marginTop: (hoveredSummary || focusedSummary || isSummarySectionActive) ? -2 : 0,
                                        marginRight: (hoveredSummary || focusedSummary || isSummarySectionActive) ? -2 : 0,
                                        marginBottom: (hoveredSummary || focusedSummary || isSummarySectionActive) ? -1 : 0,
                                        marginLeft: (hoveredSummary || focusedSummary || isSummarySectionActive) ? -2 : 0,
                                        backgroundColor: (hoveredSummary || focusedSummary)
                                            ? "rgba(255, 255, 255, 0.94)"
                                            : isSummarySectionActive
                                            ? "rgba(255, 255, 255, 1)"
                                            : "rgba(255, 255, 255, 0)",
                                        borderColor: summaryRewriteHoverAction
                                            ? "transparent"
                                            : (hoveredSummary || focusedSummary)
                                            ? "transparent"
                                            : isSummaryImproveHovered
                                            ? "transparent"
                                            : isSummarySectionActive
                                            ? "rgba(30, 64, 175, 0.52)"
                                            : "transparent",
                                        borderTopLeftRadius: (hoveredSummary || focusedSummary || isSummarySectionActive) ? 5 : 4,
                                        borderTopRightRadius: (hoveredSummary || focusedSummary || isSummarySectionActive) ? 5 : 4,
                                        borderBottomLeftRadius: (hoveredSummary || focusedSummary || isSummarySectionActive) ? 5 : 4,
                                        borderBottomRightRadius: (hoveredSummary || focusedSummary || isSummarySectionActive) ? 5 : 4,
                                        boxShadow: summaryRewriteHoverAction
                                            ? "0 0px 0px rgba(0,0,0,0), inset 0 0 0 rgba(255,255,255,0), inset 0 0 0 rgba(255,255,255,0), inset 0 0 0 rgba(255,255,255,0)"
                                            : (hoveredSummary || focusedSummary)
                                            ? "0 10px 30px rgba(15, 23, 42, 0.15), 0 0 0 1px #38bdf8"
                                            : "0 0px 0px rgba(0,0,0,0), inset 0 0 0 rgba(255,255,255,0), inset 0 0 0 rgba(255,255,255,0), inset 0 0 0 rgba(255,255,255,0)",
                                    }}
                                    transition={{ duration: 0.28, ease: [0.32, 0.72, 0.32, 1] }}
                                    style={{
                                        transformOrigin: "center",
                                        zIndex: (hoveredSummary || focusedSummary) ? 80 : 0,
                                        backdropFilter: (hoveredSummary || focusedSummary) ? "blur(22px) saturate(160%)" : "none",
                                        WebkitBackdropFilter: (hoveredSummary || focusedSummary) ? "blur(22px) saturate(160%)" : "none",
                                        border: "1px solid"
                                    }}
                                >
                                    <div className="relative flex min-w-0 items-start">
                                        <AutoResizeTextarea
                                            className={`${inputStyleClass} resume-body-font-target summary-item-input leading-[1.45] text-[#334155] resize-none overflow-hidden min-h-[24px] hover:bg-slate-100/60 ${summaryCurrentRewriteClass}`}
                                            value={resumeData.summary || ""}
                                            onChange={(e) => {
                                                updateField("summary", e.target.value);
                                            }}
                                            onFocus={() => setFocusedSummary(true)}
                                            onBlur={() => setFocusedSummary(false)}
                                            placeholder="Brief professional profile summary emphasizing key skills..."
                                            style={{
                                                ...documentTextStyle,
                                                borderRadius: (hoveredSummary || focusedSummary) ? 4 : undefined,
                                                transition: "color 150ms ease, opacity 150ms ease, text-decoration-color 150ms ease"
                                            }}
                                        />
                                    </div>
                                    {hoveredSummary && (
                                        <div
                                            className="resume-text-stat-pill pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-200 shadow-[0_10px_24px_rgba(2,6,23,0.30),inset_0_1px_0_rgba(255,255,255,0.12)]"
                                        >
                                            {(resumeData.summary || "").length} chars • {(resumeData.summary || "").split(/\s+/).filter(Boolean).length} words
                                        </div>
                                    )}
                                </motion.div>
                                {(loadingSummaryImprove || summaryRewriteSuggestion) && (
                                    <div
                                        className="experience-ai-hover relative mt-2 rounded-sm border border-sky-300/70 bg-sky-50/70 px-2.5 py-2 text-left text-[#334155] shadow-[0_8px_20px_rgba(14,165,233,0.08)]"
                                        style={{
                                            ...documentTextStyle,
                                            lineHeight: 1.45,
                                            fontFamily: "var(--font-body)",
                                            textAlign: "left"
                                        }}
                                    >
                                        {summaryRewriteSuggestion ? (
                                            <>
                                                {!summaryRewriteSuggestion.isStreaming && renderRewriteActionButtons({
                                                    onAccept: acceptSummaryRewriteSuggestion,
                                                    onReject: rejectSummaryRewriteSuggestion,
                                                    onAcceptHover: () => setRewriteActionHover({ target: "summary", action: "accept" }),
                                                    onRejectHover: () => setRewriteActionHover({ target: "summary", action: "reject" }),
                                                    onClearHover: () => setRewriteActionHover(null)
                                                })}
                                                <div className={`resume-rewrite-suggestion-text whitespace-pre-wrap ${getSuggestionReviewClass(summaryRewriteHoverAction || undefined)}`}>
                                                    {summaryRewriteSuggestion.suggestedText || (summaryRewriteSuggestion.isQueued ? "Queued summary rewrite..." : "Generating summary rewrite...")}
                                                </div>
                                                {summaryRewriteSuggestion.reason && !summaryRewriteSuggestion.isStreaming && (
                                                    <div className="mt-1 text-left text-[10px] leading-relaxed text-slate-500">
                                                        {summaryRewriteSuggestion.reason}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-left text-[10px] font-semibold tracking-wide text-shimmer-light">
                                                Generating summary rewrite...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </DocumentSection>

                            {/* --- WORK EXPERIENCE --- */}
                            <DocumentSection
                                id="experience"
                                activeSection={activeDocumentSection}
                                setActiveSection={setActiveDocumentSection}
                                className="group/experience-sec"
                                style={documentSectionGapStyle}
                                showGapPreview={isSectionGapPreviewVisible}
                                gapPreviewHeight={documentSectionGapPx}
                            >
                                <div className="flex items-center gap-2">
                                    <h2 className={sectionHeadingClass} style={sectionHeadingStyle}>
                                        Work Experience
                                    </h2>
                                </div>

                                <div className="space-y-1.5">
                                    {(resumeData.experience || []).map((exp, idx) => {
                                        const expBullets = Array.isArray(exp.bullets) ? exp.bullets : [];
                                        const showExperienceItemControls = isExperienceSectionActive || hoveredJobId === exp.id;
                                        const isExperienceItemHovered = hoveredJobId === exp.id;
                                        const isExperienceImproveHovered = hoveredExperienceImproveId === exp.id;
                                        const isExperienceClearHovered = hoveredExperienceClearId === exp.id;
                                        const isExperienceDeleteHovered = hoveredExperienceDeleteId === exp.id;
                                        const pendingExperienceRewrite = experienceRewriteSuggestions[exp.id] || null;
                                        const isExperienceRewriteLoading = loadingExperienceImproveId === exp.id;
                                        const experienceMetaFields = [
                                            {
                                                key: "jobTitle",
                                                path: `experience.${idx}.jobTitle`,
                                                label: "Job Title",
                                                value: exp.jobTitle,
                                                placeholder: "Title",
                                                className: `${compactFitMetaInputClass} text-[#0f172a] font-bold`,
                                                style: getDynamicInputStyle(exp.jobTitle, "Title", "bold 12px Poppins, Arial, sans-serif"),
                                                onChange: (val: string) => updateExperienceField(exp.id, "jobTitle", val)
                                            },
                                            {
                                                key: "company",
                                                path: `experience.${idx}.company`,
                                                label: "Company Name",
                                                value: exp.company || "",
                                                placeholder: "Company Name",
                                                className: compactFitMetaInputClass,
                                                style: getDynamicInputStyle(exp.company || "", "Company Name", "600 12px Poppins, Arial, sans-serif"),
                                                onChange: (val: string) => updateExperienceField(exp.id, "company", val)
                                            },
                                            {
                                                key: "location",
                                                path: `experience.${idx}.location`,
                                                label: "City, State",
                                                value: exp.location || "",
                                                placeholder: "City, State",
                                                className: `${compactFitMetaInputClass} text-[#475569]`,
                                                style: getDynamicInputStyle(exp.location || "", "City, State", "600 12px Poppins, Arial, sans-serif"),
                                                onChange: (val: string) => updateExperienceField(exp.id, "location", val)
                                            }
                                        ].filter((field) => showExperienceItemControls || hasText(field.value));
                                        const experienceDateFields = [
                                            {
                                                key: "startDate",
                                                path: `experience.${idx}.startDate`,
                                                label: "Start Date",
                                                value: exp.startDate || "",
                                                placeholder: "Start",
                                                className: `${compactFitDateInputClass} text-left`,
                                                style: getDynamicInputStyle(exp.startDate || "", "Start", "500 12px Poppins, Arial, sans-serif"),
                                                onChange: (val: string) => updateExperienceField(exp.id, "startDate", val)
                                            },
                                            {
                                                key: "endDate",
                                                path: `experience.${idx}.endDate`,
                                                label: "End Date",
                                                value: exp.endDate || "",
                                                placeholder: "End",
                                                className: `${compactFitDateInputClass} text-left`,
                                                style: getDynamicInputStyle(exp.endDate || "", "End", "500 12px Poppins, Arial, sans-serif"),
                                                onChange: (val: string) => updateExperienceField(exp.id, "endDate", val)
                                            }
                                        ].filter((field) => showExperienceItemControls || hasText(field.value));
                                        if (!showExperienceItemControls && experienceMetaFields.length === 0 && experienceDateFields.length === 0 && expBullets.length === 0) {
                                            return null;
                                        }

                                        return (
                                            <React.Fragment key={exp.id}>
                                            <div
                                                onMouseEnter={() => setHoveredJobId(exp.id)}
                                                onMouseLeave={() => setHoveredJobId(null)}
                                                className={`relative group/job border border-transparent rounded-sm transition-colors ${showExperienceItemControls ? "bg-white px-1.5 py-1" : "p-0 hover:border-slate-200 hover:bg-slate-50"} ${isExperienceImproveHovered ? "experience-ai-hover" : ""} ${isExperienceClearHovered ? "experience-clear-hover bg-slate-500/10" : ""} ${isExperienceDeleteHovered ? "experience-delete-hover bg-red-500/10" : ""}`}
                                                style={showExperienceItemControls ? {
                                                    borderColor: isExperienceImproveHovered
                                                        ? "transparent"
                                                        : isExperienceDeleteHovered
                                                        ? "rgba(220, 38, 38, 0.72)"
                                                        : isExperienceClearHovered
                                                        ? "rgba(100, 116, 139, 0.72)"
                                                        : isExperienceItemHovered
                                                        ? "rgba(96, 165, 250, 0.78)"
                                                        : "rgba(30, 64, 175, 0.52)"
                                                } : undefined}
                                            >
                                                <button
                                                    type="button"
                                                    onMouseEnter={() => setHoveredExperienceImproveId(exp.id)}
                                                    onMouseLeave={() => setHoveredExperienceImproveId(null)}
                                                    onClick={() => handleImproveExperience(exp)}
                                                    disabled={Boolean(pendingExperienceRewrite?.isStreaming) || expBullets.length === 0}
                                                    className={`${experienceMarginImproveClass} top-0 disabled:cursor-not-allowed disabled:opacity-35`}
                                                    title="Improve work experience with AI"
                                                    aria-label="Improve work experience with AI"
                                                >
                                                    {loadingExperienceImproveId === exp.id ? (
                                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-400"></div>
                                                    ) : (
                                                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                                                        </svg>
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onMouseEnter={() => setHoveredExperienceClearId(exp.id)}
                                                    onMouseLeave={() => setHoveredExperienceClearId(null)}
                                                    onClick={() => clearExperience(exp.id)}
                                                    className={`${experienceMarginClearClass} top-0`}
                                                    title="Clear work experience"
                                                    aria-label="Clear work experience"
                                                >
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.75">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9l-6 6M12 9l6 6" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    onMouseEnter={() => setHoveredExperienceDeleteId(exp.id)}
                                                    onMouseLeave={() => setHoveredExperienceDeleteId(null)}
                                                    onClick={() => removeExperience(exp.id)}
                                                    className={`${experienceMarginDeleteClass} top-7`}
                                                    title="Remove work experience"
                                                    aria-label="Remove work experience"
                                                >
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.75">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2m-8 3 .7 9h8.6l.7-9" />
                                                    </svg>
                                                </button>

                                                {(showExperienceItemControls || experienceMetaFields.length > 0 || experienceDateFields.length > 0) && (
                                                    <div
                                                        className="mb-1.5 flex flex-wrap justify-between items-center gap-x-4 gap-y-1 overflow-visible relative z-30"
                                                        style={{ fontFamily: "var(--font-subheading)" }}
                                                    >
                                                        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 overflow-visible">
                                                            {experienceMetaFields.map((field, fieldIdx) => (
                                                                <React.Fragment key={field.key}>
                                                                    {fieldIdx > 0 && <span className={resumeDividerClass} style={documentTextStyle}>|</span>}
                                                                    {renderOverlayInput({
                                                                        path: field.path,
                                                                        label: field.label,
                                                                        value: field.value,
                                                                        placeholder: field.placeholder,
                                                                        className: field.className,
                                                                        style: field.style,
                                                                        onChange: field.onChange,
                                                                        disableClear: true
                                                                    })}
                                                                </React.Fragment>
                                                            ))}
                                                        </div>

                                                        <div className="flex shrink-0 flex-wrap items-center gap-x-1 gap-y-1 text-left overflow-visible">
                                                            {experienceDateFields.map((field, fieldIdx) => (
                                                                <React.Fragment key={field.key}>
                                                                    {fieldIdx > 0 && <span className="shrink-0 text-slate-400" style={documentTextStyle}>-</span>}
                                                                    {renderOverlayInput({
                                                                        path: field.path,
                                                                        label: field.label,
                                                                        value: field.value,
                                                                        placeholder: field.placeholder,
                                                                        className: field.className,
                                                                        style: field.style,
                                                                        onChange: field.onChange,
                                                                        disableClear: true
                                                                    })}
                                                                </React.Fragment>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Bullet Points */}
                                                <div className="space-y-0.5 ml-3 mt-1 relative z-20">
                                                    {expBullets.map((b, bulletIdx) => {
                                                        const bulletPath = `experience.${idx}.bullets.${bulletIdx}`;
                                                        const rewriteItem = pendingExperienceRewrite?.items.find((item) => item.bulletId === b.id);
                                                        const bulletRewriteHoverAction =
                                                            rewriteActionHover?.target === "experience" && rewriteActionHover.bulletId === b.id
                                                                ? rewriteActionHover.action
                                                                : null;
                                                        const bulletCurrentRewriteClass = bulletRewriteHoverAction === "accept"
                                                            ? "resume-rewrite-current-accept-hover"
                                                            : bulletRewriteHoverAction === "reject"
                                                            ? "resume-rewrite-current-reject-hover"
                                                            : "";
                                                        
                                                        return (
                                                            <React.Fragment key={b.id}>
                                                            <div
                                                                key={b.id}
                                                                className="resume-diagnostic-bullet-row relative group/bullet flex items-start gap-2 rounded-sm border border-transparent"
                                                                data-resume-diagnostic="bullet-row"
                                                            >
                                                                <span
                                                                    className="text-slate-600 select-none py-0.5 leading-[1.38]"
                                                                    style={{ ...documentTextStyle, display: "inline-block" }}
                                                                >
                                                                    &bull;
                                                                </span>
                                                                <div className="flex-1">
                                                                    {renderOverlayInput({
                                                                        path: bulletPath,
                                                                        label: "Bullet Point",
                                                                        value: b.text,
                                                                        placeholder: "Described high-impact action outcome...",
                                                                        className: `${inputStyleClass} text-[#334155] leading-[1.38] resize-none py-0.5 ${bulletCurrentRewriteClass}`,
                                                                        style: { ...documentTextStyle, whiteSpace: "pre-wrap", wordBreak: "break-word" },
                                                                        isAutoResize: true,
                                                                        showTextStats: true,
                                                                        onChange: (val) => updateBulletText(exp.id, b.id, val),
                                                                        onDelete: () => removeBullet(exp.id, b.id),
                                                                        disableClear: true,
                                                                        disableDelete: true
                                                                    })}
                                                                </div>
                                                            </div>
                                                            {(isExperienceRewriteLoading || rewriteItem) && (
                                                                <div className="relative ml-6 mt-1 mb-1">
                                                                    <div
                                                                        className="experience-ai-hover relative rounded-sm border border-sky-300/70 bg-sky-50/70 px-2.5 py-1.5 text-left text-[#334155] shadow-[0_8px_20px_rgba(14,165,233,0.08)]"
                                                                        style={{
                                                                            ...documentTextStyle,
                                                                            lineHeight: 1.38,
                                                                            fontFamily: "var(--font-body)",
                                                                            textAlign: "left"
                                                                        }}
                                                                    >
                                                                        {rewriteItem ? (
                                                                            <>
                                                                                {!rewriteItem.isStreaming && renderRewriteActionButtons({
                                                                                    onAccept: () => acceptExperienceRewriteSuggestion(exp.id, rewriteItem.bulletId),
                                                                                    onReject: () => rejectExperienceRewriteSuggestion(exp.id, rewriteItem.bulletId),
                                                                                    onAcceptHover: () => setRewriteActionHover({ target: "experience", bulletId: rewriteItem.bulletId, action: "accept" }),
                                                                                    onRejectHover: () => setRewriteActionHover({ target: "experience", bulletId: rewriteItem.bulletId, action: "reject" }),
                                                                                    onClearHover: () => setRewriteActionHover(null)
                                                                                })}
                                                                                    <div className={`resume-rewrite-suggestion-text whitespace-pre-wrap ${getSuggestionReviewClass(bulletRewriteHoverAction || undefined)}`}>
                                                                                        {rewriteItem.suggestedText || (rewriteItem.isQueued ? "Queued bullet rewrite..." : "Generating bullet rewrite...")}
                                                                                    </div>
                                                                                {rewriteItem.reason && !rewriteItem.isStreaming && (
                                                                                    <div className="mt-1 text-left text-[10px] leading-relaxed text-slate-500">
                                                                                        {rewriteItem.reason}
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        ) : (
                                                                            <div className="text-left text-[10px] font-semibold tracking-wide text-shimmer-light">
                                                                                Generating bullet rewrite...
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                    {showExperienceItemControls && (
                                                        <div className="relative flex items-start gap-2 group/bullet">
                                                            <span
                                                                className="select-none py-0.5 leading-[1.38] text-slate-400"
                                                                style={{ ...documentTextStyle, display: "inline-block", marginTop: 1 }}
                                                            >
                                                                &bull;
                                                            </span>
                                                            <input
                                                                className={`${inputStyleClass} flex-1 border border-transparent bg-transparent py-0.5 leading-[1.38] text-slate-400 outline-none placeholder:text-slate-400 placeholder:italic`}
                                                                value=""
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val.trim()) {
                                                                        addBulletWithText(exp.id, val);
                                                                    }
                                                                }}
                                                                placeholder="Type to add a new bullet..."
                                                                style={documentTextStyle}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            </React.Fragment>
                                        );
                                    })}
                                    <div className={`resume-edit-control absolute left-0 bottom-0 h-0 w-full overflow-visible transition-opacity duration-300 ${
                                        activeDocumentSection === "experience"
                                            ? "opacity-100"
                                            : "opacity-0"
                                    }`} style={{ marginTop: 0 }}>
                                        <button
                                            type="button"
                                            onClick={() => insertExperienceAt((resumeData.experience || []).length)}
                                            className={`${experienceMarginAddClass} top-1/2 -translate-y-1/2`}
                                            title="Add experience"
                                            aria-label="Add experience at the bottom of Work Experience"
                                        >
                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </DocumentSection>

                            {/* --- EDUCATION --- */}
                            <DocumentSection
                                id="education"
                                activeSection={activeDocumentSection}
                                setActiveSection={setActiveDocumentSection}
                                className="group/education-sec"
                                style={documentSectionGapStyle}
                                showGapPreview={isSectionGapPreviewVisible}
                                gapPreviewHeight={documentSectionGapPx}
                            >
                                <div className="flex items-center gap-2">
                                    <h2 className={sectionHeadingClass} style={sectionHeadingStyle}>
                                        Education
                                    </h2>
                                </div>

                                <div className="space-y-1.5">
                                    {(resumeData.education || []).map((ed) => {
                                        const isDeleteHovered = hoveredEducationDeleteId === ed.id;
                                        const showEducationFields = activeDocumentSection === "education";
                                        const educationMetaFields = [
                                            {
                                                key: "degree",
                                                path: `education.${ed.id}.degree`,
                                                label: "Degree / Major",
                                                value: ed.degree || "",
                                                placeholder: "Degree / Major",
                                                className: `${compactFitMetaInputClass} text-[#0f172a] font-bold`,
                                                style: getDynamicInputStyle(ed.degree || "", "Degree / Major", "bold 12px Poppins, Arial, sans-serif"),
                                                onChange: (val: string) => updateEducationField(ed.id, "degree", val)
                                            },
                                            {
                                                key: "school",
                                                path: `education.${ed.id}.school`,
                                                label: "Institution Name",
                                                value: ed.school,
                                                placeholder: "Institution Name",
                                                className: compactFitMetaInputClass,
                                                style: getDynamicInputStyle(ed.school, "Institution Name", "600 12px Poppins, Arial, sans-serif"),
                                                onChange: (val: string) => updateEducationField(ed.id, "school", val)
                                            }
                                        ].filter((field) => showEducationFields || hasText(field.value));
                                        const educationDateFields = [
                                            {
                                                key: "startDate",
                                                path: `education.${ed.id}.startDate`,
                                                label: "Start Date",
                                                value: ed.startDate || "",
                                                placeholder: "Start",
                                                className: `${compactFitDateInputClass} text-left`,
                                                style: getDynamicInputStyle(ed.startDate || "", "Start", "500 12px Poppins, Arial, sans-serif"),
                                                onChange: (val: string) => updateEducationField(ed.id, "startDate", val)
                                            },
                                            {
                                                key: "endDate",
                                                path: `education.${ed.id}.endDate`,
                                                label: "End Date",
                                                value: ed.endDate || "",
                                                placeholder: "End",
                                                className: `${compactFitDateInputClass} text-left`,
                                                style: getDynamicInputStyle(ed.endDate || "", "End", "500 12px Poppins, Arial, sans-serif"),
                                                onChange: (val: string) => updateEducationField(ed.id, "endDate", val)
                                            }
                                        ].filter((field) => showEducationFields || hasText(field.value));
                                        const educationDetails = Array.isArray(ed.details) ? ed.details : [];
                                        const visibleEducationDetails = educationDetails.filter((detail) => showEducationFields || hasText(detail.text));
                                        if (!showEducationFields && educationMetaFields.length === 0 && educationDateFields.length === 0 && visibleEducationDetails.length === 0) {
                                            return null;
                                        }
                                        return (
                                            <div
                                                key={ed.id}
                                                className={`relative group/edu rounded-sm border transition-all duration-200 ${activeDocumentSection === "education" ? "px-1.5 py-1" : "p-0"} ${
                                                    isDeleteHovered
                                                        ? "experience-delete-hover bg-red-500/10"
                                                        : activeDocumentSection === "education"
                                                        ? "bg-white border-blue-800/40 hover:border-sky-400"
                                                        : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                                                }`}
                                                style={isDeleteHovered ? { borderColor: "rgba(220, 38, 38, 0.72)" } : undefined}
                                            >
                                                {/* Delete Edu (Icon only) */}
                                                <button
                                                    type="button"
                                                    onMouseEnter={() => setHoveredEducationDeleteId(ed.id)}
                                                    onMouseLeave={() => setHoveredEducationDeleteId(null)}
                                                    onClick={() => removeEducation(ed.id)}
                                                    className={`edu-delete-button resume-edit-control absolute -right-9 top-1/2 -translate-y-1/2 z-[100] !inline-flex h-5 !h-5 w-5 !w-5 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 !text-red-500 shadow-none transition-[background,border-color,color,opacity,transform] duration-150 hover:!bg-red-500/10 hover:!text-red-600 active:scale-95 cursor-pointer ${
                                                        activeDocumentSection === "education" ? "opacity-70 hover:opacity-100" : "pointer-events-none opacity-0"
                                                    }`}
                                                    title="Remove education"
                                                    aria-label="Remove education"
                                                >
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="2.75">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2m-8 3 .7 9h8.6l.7-9" />
                                                    </svg>
                                                </button>

                                            {(showEducationFields || educationMetaFields.length > 0 || educationDateFields.length > 0) && (
                                                <div
                                                    className="flex flex-wrap justify-between items-center gap-x-4 gap-y-1 overflow-visible relative z-30"
                                                    style={{ fontFamily: "var(--font-subheading)" }}
                                                >
                                                    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 overflow-visible">
                                                        {educationMetaFields.map((field, fieldIdx) => (
                                                            <React.Fragment key={field.key}>
                                                                {fieldIdx > 0 && <span className={resumeDividerClass} style={documentTextStyle}>|</span>}
                                                                {renderOverlayInput({
                                                                    path: field.path,
                                                                    label: field.label,
                                                                    value: field.value,
                                                                    placeholder: field.placeholder,
                                                                    className: field.className,
                                                                    style: field.style,
                                                                    onChange: field.onChange,
                                                                    disableClear: true
                                                                })}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>

                                                    <div className="flex shrink-0 flex-wrap items-center gap-x-1 gap-y-1 text-left">
                                                        {educationDateFields.map((field, fieldIdx) => (
                                                            <React.Fragment key={field.key}>
                                                                {fieldIdx > 0 && <span className="shrink-0 text-slate-400" style={documentTextStyle}>-</span>}
                                                                {renderOverlayInput({
                                                                    path: field.path,
                                                                    label: field.label,
                                                                    value: field.value,
                                                                    placeholder: field.placeholder,
                                                                    className: field.className,
                                                                    style: field.style,
                                                                    onChange: field.onChange,
                                                                    disableClear: true
                                                                })}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {(visibleEducationDetails.length > 0 || showEducationFields) && (
                                                <div className="ml-3 mt-0.5 space-y-0.5 relative z-20">
                                                    {visibleEducationDetails.map((detail, detailIdx) => (
                                                        <div key={detail.id} className="resume-diagnostic-bullet-row relative flex items-start gap-2 rounded-sm border border-transparent" data-resume-diagnostic="bullet-row">
                                                            <span
                                                                className="text-slate-600 select-none py-0.5 leading-[1.38]"
                                                                style={{ ...documentTextStyle, display: "inline-block" }}
                                                            >
                                                                &bull;
                                                            </span>
                                                            <div className="flex-1">
                                                                {renderOverlayInput({
                                                                    path: `education.${ed.id}.details.${detailIdx}`,
                                                                    label: "Education Detail",
                                                                    value: detail.text,
                                                                    placeholder: "Concentration, honors, coursework, or other detail...",
                                                                    className: `${inputStyleClass} text-[#334155] leading-[1.38] resize-none py-0.5`,
                                                                    style: { ...documentTextStyle, whiteSpace: "pre-wrap", wordBreak: "break-word" },
                                                                    isAutoResize: true,
                                                                    showTextStats: true,
                                                                    onChange: (val) => updateEducationDetailText(ed.id, detail.id, val),
                                                                    disableClear: true,
                                                                    disableDelete: true
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {showEducationFields && (
                                                        <div className="relative flex items-start gap-2">
                                                            <span
                                                                className="select-none py-0.5 leading-[1.38] text-slate-400"
                                                                style={{ ...documentTextStyle, display: "inline-block", marginTop: 1 }}
                                                            >
                                                                &bull;
                                                            </span>
                                                            <input
                                                                className={`${inputStyleClass} flex-1 border border-transparent bg-transparent py-0.5 leading-[1.38] text-slate-400 outline-none placeholder:text-slate-400 placeholder:italic`}
                                                                value=""
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val.trim()) {
                                                                        addEducationDetailWithText(ed.id, val);
                                                                    }
                                                                }}
                                                                placeholder="Type to add concentration, honors, coursework..."
                                                                style={documentTextStyle}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        );
                                    })}
                                    <div className={`resume-edit-control absolute left-0 bottom-0 h-0 w-full overflow-visible transition-opacity duration-300 ${
                                        activeDocumentSection === "education"
                                            ? "opacity-100"
                                            : "opacity-0"
                                    }`} style={{ marginTop: 0 }}>
                                        <button
                                            type="button"
                                            onClick={addEducation}
                                            className={`resume-edit-control absolute -left-9 top-1/2 -translate-y-1/2 z-10 !inline-flex h-6 !h-6 w-6 !w-6 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 !text-emerald-600 shadow-none transition-[opacity,background,border-color,color,transform] duration-150 hover:!bg-slate-500/10 hover:border-slate-400/20 hover:!text-emerald-600 active:scale-95 cursor-pointer ${
                                                activeDocumentSection === "education" ? "opacity-100" : "pointer-events-none opacity-0"
                                            }`}
                                            title="Add education"
                                            aria-label="Add education Category"
                                        >
                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </DocumentSection>

                            {/* --- SKILLS --- */}
                            <DocumentSection
                                id="skills"
                                activeSection={activeDocumentSection}
                                setActiveSection={setActiveDocumentSection}
                                className="group/skills-sec"
                                style={documentSectionGapStyle}
                                showGapPreview={isSectionGapPreviewVisible}
                                gapPreviewHeight={documentSectionGapPx}
                            >
                                <div className="flex items-center gap-2">
                                    <h2 className={sectionHeadingClass} style={sectionHeadingStyle}>
                                        Skills
                                    </h2>
                                </div>
                                <div className="space-y-1">
                                    {(resumeData.skills || []).map((skill) => {
                                        const itemsPath = `skills.${skill.id}.items`;
                                        const isDeleteHovered = hoveredSkillDeleteId === skill.id;
                                        const showSkillFields = activeDocumentSection === "skills";
                                        const skillItemsText = getSkillItemsText(skill);
                                        const showSkillCategory = showSkillFields || hasText(skill.category);
                                        const showSkillItems = showSkillFields || hasText(skillItemsText);

                                        if (!showSkillCategory && !showSkillItems) return null;

                                        return (
                                            <div
                                                key={skill.id}
                                                className={`group/skill-row relative flex items-start gap-1.5 rounded-sm border transition-all duration-200 ${activeDocumentSection === "skills" ? "px-1.5 py-0.5" : "p-0"} ${
                                                    isDeleteHovered
                                                        ? "experience-delete-hover bg-red-500/10"
                                                        : activeDocumentSection === "skills"
                                                        ? "bg-white border-blue-800/40 hover:border-sky-400"
                                                        : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                                                }`}
                                                style={isDeleteHovered ? { borderColor: "rgba(220, 38, 38, 0.72)" } : undefined}
                                            >
                                                {showSkillCategory && renderOverlayInput({
                                                    path: `skills.${skill.id}.category`,
                                                    label: "Skill Category",
                                                    value: skill.category,
                                                    placeholder: "Category",
                                                    className: `${compactFitMetaInputClass} text-[#0f172a] font-bold`,
                                                    style: getDynamicInputStyle(skill.category, "Category", "bold 12px Poppins, Arial, sans-serif"),
                                                    onChange: (val) => updateSkillCategoryName(skill.id, val),
                                                    disableClear: true
                                                })}
                                                {showSkillCategory && showSkillItems && <span className="shrink-0 pt-1 font-bold leading-none text-[#0f172a]" style={documentTextStyle}>:</span>}
                                                {showSkillItems && renderOverlayInput({
                                                    path: itemsPath,
                                                    label: "Skills",
                                                    value: skillItemsText,
                                                    placeholder: "TypeScript, Python, Swift, React Native, Go",
                                                    className: `${inputStyleClass} text-[#334155] font-normal leading-[1.38] resize-none overflow-hidden py-0.5`,
                                                    style: {
                                                        ...documentTextStyle,
                                                        width: "100%",
                                                        minWidth: 0,
                                                        maxWidth: "100%",
                                                        fontWeight: "400",
                                                        whiteSpace: "pre-wrap",
                                                        wordBreak: "break-word"
                                                    },
                                                    onChange: (val) => updateSkillCategoryItems(skill.id, val),
                                                    disableClear: true,
                                                    isAutoResize: true,
                                                    containerClassName: "min-w-0 flex-1",
                                                    inputContainerClassName: "w-full items-start"
                                                })}
                                                <button
                                                    type="button"
                                                    onMouseEnter={() => setHoveredSkillDeleteId(skill.id)}
                                                    onMouseLeave={() => setHoveredSkillDeleteId(null)}
                                                    onClick={() => removeSkillCategory(skill.id)}
                                                    className={`skill-delete-button resume-edit-control absolute -right-9 top-1/2 -translate-y-1/2 z-[100] !inline-flex h-5 !h-5 w-5 !w-5 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 !text-red-500 shadow-none transition-[background,border-color,color,opacity,transform] duration-150 hover:!bg-red-500/10 hover:!text-red-600 active:scale-95 cursor-pointer ${
                                                        activeDocumentSection === "skills" ? "opacity-70 hover:opacity-100" : "pointer-events-none opacity-0"
                                                    }`}
                                                    title="Delete skill category"
                                                    aria-label="Delete skill category"
                                                >
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="2.75">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2m-8 3 .7 9h8.6l.7-9" />
                                                    </svg>
                                                </button>
                                            </div>
                                        );
                                    })}
                                    <div className={`resume-edit-control absolute left-0 bottom-0 h-0 w-full overflow-visible transition-opacity duration-300 ${
                                        activeDocumentSection === "skills"
                                            ? "opacity-100"
                                            : "opacity-0"
                                    }`} style={{ marginTop: 0 }}>
                                        <button
                                            type="button"
                                            onClick={addSkillCategory}
                                            className={`resume-edit-control absolute -left-9 top-1/2 -translate-y-1/2 z-10 !inline-flex h-6 !h-6 w-6 !w-6 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 !text-emerald-600 shadow-none transition-[opacity,background,border-color,color,transform] duration-150 hover:!bg-slate-500/10 hover:border-slate-400/20 hover:!text-emerald-600 active:scale-95 cursor-pointer ${
                                                activeDocumentSection === "skills" ? "opacity-100" : "pointer-events-none opacity-0"
                                            }`}
                                            title="Add skill category"
                                            aria-label="Add skill category"
                                        >
                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </DocumentSection>
        </>
    );
};
