import React from "react";
import type {
    ContactRenderField,
    DocumentSectionId,
    EducationItem,
    ExperienceItem,
    ExperienceRewriteSuggestion,
    ResumeData,
    ResumeRewriteActionHover,
    ResumeSectionKey,
    SummaryRewriteSuggestion
} from "../types";
import { DEFAULT_SECTION_TITLES } from "../resumeData";
import { EditableSectionTitle } from "./EditableSectionTitle";
import { ResumeEducationSection } from "./editor/ResumeEducationSection";
import { ResumeExperienceSection } from "./editor/ResumeExperienceSection";
import { ResumeHeaderSection } from "./editor/ResumeHeaderSection";
import { ResumeSkillsSection } from "./editor/ResumeSkillsSection";
import { ResumeSummarySection } from "./editor/ResumeSummarySection";

export type OverlayInputParams = {
    path: string;
    label: string;
    value: string;
    placeholder: string;
    className: string;
    style?: React.CSSProperties;
    onChange: (value: string) => void;
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
    onBlur?: () => void;
    onKeyDown?: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;
};

export type ResumeDocumentEditorData = {
    resumeData: ResumeData;
    headerContactRows: ContactRenderField[][];
    showHeaderContactEditors: boolean;
    changeMetadata: { path: string; reason: string }[];
    originalResumeDataBeforeDraft: ResumeData | null;
    summaryRewriteSuggestion: SummaryRewriteSuggestion | null;
    experienceRewriteSuggestions: Record<string, ExperienceRewriteSuggestion>;
};

export type ResumeDocumentEditorFormatting = {
    titleFontSize: number;
    bodyFontSize: number;
    pageMarginPt: number;
    documentSectionGapPx: number;
    documentInnerSectionGapPx: number;
    sectionHeadingClass: string;
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

export type ResumeDocumentEditorInteraction = {
    activeDocumentSection: DocumentSectionId | null;
    focusedDocumentSection: DocumentSectionId | null;
    setActiveDocumentSection: React.Dispatch<React.SetStateAction<DocumentSectionId | null>>;
    setFocusedField: React.Dispatch<React.SetStateAction<string | null>>;
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
    hoveredEducationClearId: string | null;
    setHoveredEducationClearId: React.Dispatch<React.SetStateAction<string | null>>;
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
    gapPreviewTarget: "section" | "inner" | null;
    loadingSummaryImprove: boolean;
    loadingExperienceImproveId: string | null;
};

export type ResumeDocumentEditorHandlers = {
    renderOverlayInput: (params: OverlayInputParams) => React.ReactNode;
    renderRewriteActionButtons: (params: {
        onAccept: () => void;
        onReject: () => void;
        onAcceptHover: () => void;
        onRejectHover: () => void;
        onClearHover: () => void;
    }) => React.ReactNode;
    getDynamicInputStyle: (
        value: string | undefined,
        placeholder: string,
        font?: string,
        extraStyles?: React.CSSProperties
    ) => React.CSSProperties;
    contactFieldStyle: (value: string | undefined, placeholder: string) => React.CSSProperties;
    subHeaderFieldStyle: (
        value: string | undefined,
        placeholder: string,
        weight?: React.CSSProperties["fontWeight"],
        extraStyles?: React.CSSProperties
    ) => React.CSSProperties;
    isFieldChanged: (path: string) => { changed: boolean; reason?: string };
    getSuggestionReviewClass: (action?: "accept" | "reject") => string;
    updateField: (field: keyof ResumeData, value: string) => void;
    updateSectionTitle: (section: ResumeSectionKey, value: string) => void;
    addCustomContactField: () => void;
    updateCustomContactField: (index: number, field: "label" | "value", value: string) => void;
    removeCustomContactField: (index: number) => void;
    removeStandardContactField: (field: "location" | "phone" | "email" | "linkedin" | "website" | "github") => void;
    updateExperienceField: (id: string, field: keyof ExperienceItem, value: string) => void;
    insertExperienceAt: (index: number) => void;
    removeExperience: (id: string) => void;
    moveExperienceUp: (id: string) => void;
    moveExperienceDown: (id: string) => void;
    clearExperience: (id: string) => void;
    addBulletWithText: (experienceId: string, text: string) => void;
    insertBulletAfter: (experienceId: string, bulletId: string) => void;
    updateBulletText: (experienceId: string, bulletId: string, value: string) => void;
    removeBulletIfEmpty: (experienceId: string, bulletId: string) => void;
    removeBullet: (experienceId: string, bulletId: string) => void;
    toggleBulletTag: (experienceId: string, bulletId: string, tagId: string) => void;
    createAndAssignBulletTag: (experienceId: string, bulletId: string, name: string) => void;
    deleteBulletTag: (tagId: string) => void;
    updateEducationField: (id: string, field: keyof EducationItem, value: string) => void;
    addEducation: () => void;
    removeEducation: (id: string) => void;
    clearEducation: (id: string) => void;
    addEducationDetailWithText: (educationId: string, text: string) => void;
    insertEducationDetailAfter: (educationId: string, detailId: string) => void;
    updateEducationDetailText: (educationId: string, detailId: string, value: string) => void;
    removeEducationDetailIfEmpty: (educationId: string, detailId: string) => void;
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
    setChangeMetadata: React.Dispatch<React.SetStateAction<{
        path: string;
        before: string;
        after: string;
        reason: string;
    }[]>>;
    setSuccessMessage: React.Dispatch<React.SetStateAction<string | null>>;
};

export type ResumeDocumentEditorProps = {
    data: ResumeDocumentEditorData;
    formatting: ResumeDocumentEditorFormatting;
    interaction: ResumeDocumentEditorInteraction;
    handlers: ResumeDocumentEditorHandlers;
};

export const ResumeDocumentEditor: React.FC<ResumeDocumentEditorProps> = (props) => {
    const { data, formatting, interaction, handlers } = props;
    const { resumeData } = data;
    const {
        sectionHeadingClass,
        documentInnerSectionGapPx
    } = formatting;
    const { activeDocumentSection, setFocusedField, gapPreviewTarget } = interaction;
    const { updateSectionTitle } = handlers;
    const [previewExperienceTag, setPreviewExperienceTag] = React.useState<{
        bulletId: string;
        color: string;
    } | null>(null);

    const renderInnerGapPreview = (key: string) =>
        gapPreviewTarget === "inner" && documentInnerSectionGapPx > 0 ? (
            <div
                key={key}
                className="resume-section-gap-preview resume-inner-section-gap-preview"
            />
        ) : null;

    const renderSectionTitle = (section: ResumeSectionKey) => (
        <EditableSectionTitle
            section={section}
            title={resumeData.sectionTitles?.[section] ?? DEFAULT_SECTION_TITLES[section]}
            fallbackTitle={DEFAULT_SECTION_TITLES[section]}
            isEditing={activeDocumentSection === section}
            className={sectionHeadingClass}
            onChange={(value) => updateSectionTitle(section, value)}
            onFocusChange={setFocusedField}
        />
    );

    const sectionProps = {
        ...props,
        renderSectionTitle,
        renderInnerGapPreview
    };

    return (
        <>
            <ResumeHeaderSection {...props} />
            <ResumeSummarySection {...sectionProps} />
            <ResumeExperienceSection
                {...sectionProps}
                previewTag={previewExperienceTag}
                setPreviewTag={setPreviewExperienceTag}
            />
            <ResumeEducationSection {...sectionProps} />
            <ResumeSkillsSection {...sectionProps} />
        </>
    );
};
