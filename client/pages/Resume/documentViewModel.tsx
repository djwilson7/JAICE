import React from "react";
import type { ChangeMetadata, ContactRenderField, ResumeData } from "./types";
import { buildResumeRenderTokens } from "./formatting";
import { hasText } from "./resumeData";
import { OverlayInput } from "./components/OverlayInput";

type UseResumeDocumentViewModelParams = {
    resumeData: ResumeData;
    changeMetadata: ChangeMetadata[];
    bodyFontSize: number;
    headerFontSize: number;
    subHeaderFontSize: number;
    pageMarginPt: number;
    activeDocumentSection: string | null;
    hoveredSummary: boolean;
    focusedSummary: boolean;
    hoveredContactField: string | null;
    focusedContactField: string | null;
    hoveredField: string | null;
    setHoveredField: React.Dispatch<React.SetStateAction<string | null>>;
    focusedField: string | null;
    setFocusedField: React.Dispatch<React.SetStateAction<string | null>>;
    rewriteActionHover: { target: "summary" | "experience"; action: "accept" | "reject"; id?: string } | null;
};

export const useResumeDocumentViewModel = ({
    resumeData,
    changeMetadata,
    bodyFontSize,
    headerFontSize,
    subHeaderFontSize,
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
}: UseResumeDocumentViewModelParams) => {
    const isFieldChanged = (path: string): { changed: boolean; reason?: string } => {
        const match = changeMetadata.find((m) => m.path === path);
        return match ? { changed: true, reason: match.reason } : { changed: false };
    };

    const renderOverlayInput = (params: {
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
        customActionPlacement?: "tray" | "left" | "right";
        disableClear?: boolean;
        disableDelete?: boolean;
        containerClassName?: string;
        inputContainerClassName?: string;
        onBlur?: () => void;
        onKeyDown?: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;
    }) => {
        return (
            <OverlayInput
                {...params}
                hoveredField={hoveredField}
                setHoveredField={setHoveredField}
                focusedField={focusedField}
                setFocusedField={setFocusedField}
            />
        );
    };

    const renderTokens = buildResumeRenderTokens({
        bodyFontSize,
        headerFontSize,
        subHeaderFontSize,
        pageMarginPt
    });
    const inputStyleClass = "resume-editor-input";
    const contentFitInputStyleClass = "resume-editor-input resume-editor-input--fit";
    const boldInputClass = "resume-editor-input resume-editor-input--bold";
    const sectionHeadingClass = "resume-editor-section-title resume-font--heading resume-header-font-target";
    const compactFitMetaInputClass = `${contentFitInputStyleClass} resume-editor-input--meta resume-subheader-font-target`;
    const compactFitDateInputClass = `${contentFitInputStyleClass} resume-editor-input--date resume-subheader-font-target`;
    const contactInputClass = `${inputStyleClass} resume-editor-input--contact resume-font--contact`;
    const resumeDividerClass = "resume-editor-divider";

    const bodyFontSizePx = renderTokens.bodyFontSizePx;
    const subHeaderFontSizePx = renderTokens.subHeaderFontSizePx;
    const measureTextWidth = (text: string, font: string = `500 ${bodyFontSizePx}px Poppins, Arial, sans-serif`) => {
        if (!text) return 0;
        if (typeof document === "undefined") {
            const charSize = font.includes(`${renderTokens.titleFontSizePx}px`) ? 14 : 7;
            return text.length * charSize;
        }
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
            const charSize = font.includes(`${renderTokens.titleFontSizePx}px`) ? 14 : 7;
            return text.length * charSize;
        }
        context.font = font;
        return context.measureText(text).width;
    };

    const getDynamicInputStyle = (
        value: string | undefined,
        placeholder: string,
        font: string = `500 ${bodyFontSizePx}px Poppins, Arial, sans-serif`,
        extraStyles: React.CSSProperties = {}
    ): React.CSSProperties => {
        const content = value && value.length > 0 ? value : placeholder || "";
        const padding = font.includes("24px") ? 24 : 16;
        const contentWidth = Math.ceil(measureTextWidth(content, font) + padding);
        const minWidth = 16;
        return {
            ...extraStyles,
            width: `${Math.max(minWidth, contentWidth)}px`,
            minWidth: `${minWidth}px`,
            maxWidth: "none",
            fieldSizing: "content"
        } as React.CSSProperties;
    };

    const contactFieldStyle = (value: string | undefined, placeholder: string): React.CSSProperties => {
        return getDynamicInputStyle(value, placeholder, `500 ${bodyFontSizePx}px Poppins, Arial, sans-serif`, {
            fontSize: "var(--resume-body-font-size)",
            lineHeight: "var(--resume-body-line-height)"
        });
    };
    const subHeaderFieldStyle = (
        value: string | undefined,
        placeholder: string,
        weight: React.CSSProperties["fontWeight"] = 600,
        extraStyles: React.CSSProperties = {}
    ): React.CSSProperties => {
        return getDynamicInputStyle(value, placeholder, `${weight} ${subHeaderFontSizePx}px Poppins, Arial, sans-serif`, {
            fontSize: "var(--resume-subheader-font-size)",
            lineHeight: "var(--resume-subheader-line-height)",
            ...extraStyles
        });
    };

    const headerMarginAddClass = `resume-edit-control resume-margin-control resume-margin-control--left resume-margin-control--add${activeDocumentSection === "header" ? " is-visible" : ""}`;
    const isExperienceSectionActive = activeDocumentSection === "experience";
    const experienceMarginAddClass = `resume-edit-control resume-margin-control resume-margin-control--left resume-margin-control--add${isExperienceSectionActive ? " is-visible" : ""}`;
    const experienceMarginImproveClass = "resume-edit-control resume-margin-control resume-margin-control--left resume-margin-control--improve";
    const experienceMarginClearClass = `resume-edit-control resume-margin-control resume-margin-control--right resume-margin-control--clear${isExperienceSectionActive ? " is-visible" : ""}`;
    const experienceMarginDeleteClass = `resume-edit-control resume-margin-control resume-margin-control--right resume-margin-control--delete${isExperienceSectionActive ? " is-visible" : ""}`;
    const isSummarySectionActive = activeDocumentSection === "summary";
    const showSummaryControls = isSummarySectionActive || hoveredSummary || focusedSummary;
    const summaryMarginImproveClass = `resume-edit-control resume-margin-control resume-margin-control--left resume-margin-control--improve${showSummaryControls ? " is-visible" : ""}`;

    const summaryRewriteHoverAction = rewriteActionHover?.target === "summary" ? rewriteActionHover.action : null;
    const summaryCurrentRewriteClass = summaryRewriteHoverAction === "accept"
        ? "resume-rewrite-current-accept-hover"
        : summaryRewriteHoverAction === "reject"
        ? "resume-rewrite-current-reject-hover"
        : "";
    const showHeaderContactEditors = activeDocumentSection === "header" || Boolean(hoveredContactField || focusedContactField);
    const headerHiddenContactFields = new Set(resumeData.hiddenContactFields || []);
    const headerStandardContactFields: Extract<ContactRenderField, { isCustom: false }>[] = [
        { key: "location", value: resumeData.location, placeholder: "City, State", isCustom: false },
        { key: "phone", value: resumeData.phone, placeholder: "Phone", isCustom: false },
        { key: "email", value: resumeData.email, placeholder: "Email", isCustom: false },
        { key: "linkedin", value: resumeData.linkedin, placeholder: "LinkedIn", isCustom: false },
        { key: "website", value: resumeData.website, placeholder: "Portfolio", isCustom: false },
        { key: "github", value: resumeData.github, placeholder: "GitHub", isCustom: false }
    ];
    const headerContactFields: ContactRenderField[] = [
        ...headerStandardContactFields.filter((field) => !headerHiddenContactFields.has(field.key) && (showHeaderContactEditors || hasText(field.value))),
        ...(resumeData.customContact || [])
            .map((c, idx): ContactRenderField => ({
                key: `custom_${idx}`,
                value: c.value,
                placeholder: c.label || "Add text",
                isCustom: true,
                index: idx,
                label: c.label
            }))
            .filter((field) => showHeaderContactEditors || hasText(field.value))
    ];
    const headerContactRows: ContactRenderField[][] = [];
    for (let i = 0; i < headerContactFields.length; i += 3) {
        headerContactRows.push(headerContactFields.slice(i, i + 3));
    }

    const getSuggestionReviewClass = (action?: "accept" | "reject") => {
        if (action === "accept") return "resume-rewrite-suggestion-accept-hover";
        if (action === "reject") return "resume-rewrite-suggestion-reject-hover";
        return "";
    };

    const renderRewriteActionButtons = (params: {
        onAccept: () => void;
        onReject: () => void;
        onAcceptHover: () => void;
        onRejectHover: () => void;
        onClearHover: () => void;
    }) => (
        <div
            className="resume-edit-control absolute top-1/2 z-[120] flex -translate-y-1/2 items-center justify-center gap-1"
            style={{ right: `calc(-${pageMarginPt / 2}pt - 20px)` }}
        >
            <button
                type="button"
                onMouseEnter={params.onAcceptHover}
                onMouseLeave={params.onClearHover}
                onClick={params.onAccept}
                className="resume-rewrite-action-button !text-emerald-600 hover:border-emerald-500/35 hover:bg-emerald-500/10"
                style={{ color: "#059669" }}
                title="Accept AI rewrite"
                aria-label="Accept AI rewrite"
            >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="3" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </button>
            <button
                type="button"
                onMouseEnter={params.onRejectHover}
                onMouseLeave={params.onClearHover}
                onClick={params.onReject}
                className="resume-rewrite-action-button !text-red-600 hover:border-red-500/35 hover:bg-red-500/10"
                style={{ color: "#dc2626" }}
                title="Reject AI rewrite"
                aria-label="Reject AI rewrite"
            >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth="3" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );

    return {
        isFieldChanged,
        renderOverlayInput,
        inputStyleClass,
        boldInputClass,
        sectionHeadingClass,
        compactFitMetaInputClass,
        compactFitDateInputClass,
        contactInputClass,
        resumeDividerClass,
        getDynamicInputStyle,
        contactFieldStyle,
        subHeaderFieldStyle,
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
    };
};
