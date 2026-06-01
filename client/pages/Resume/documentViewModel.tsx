import React from "react";
import type { ChangeMetadata, ContactRenderField, ResumeData } from "./types";
import { hasText } from "./resumeData";
import { OverlayInput } from "./components/OverlayInput";
import { RESUME_DOCUMENT_TYPOGRAPHY } from "./resumeTypography";

type UseResumeDocumentViewModelParams = {
    resumeData: ResumeData;
    changeMetadata: ChangeMetadata[];
    bodyFontSize: number;
    headerFontSize: number;
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
        showTextStats?: boolean;
        customActionPlacement?: "tray" | "left" | "right";
        disableClear?: boolean;
        disableDelete?: boolean;
        containerClassName?: string;
        inputContainerClassName?: string;
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

    const inputStyleClass = "w-full bg-transparent border border-transparent hover:bg-slate-100/70 hover:border-slate-300 focus:bg-sky-50/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 rounded-sm outline-none px-1.5 py-0.5 text-[#1e293b] transition-colors duration-150";
    const contentFitInputStyleClass = inputStyleClass.replace("w-full", "w-auto");
    const boldInputClass = `${inputStyleClass} font-bold text-[#0f172a]`;
    const documentTextStyle = {
        fontSize: `${bodyFontSize}px`,
        fontFamily: RESUME_DOCUMENT_TYPOGRAPHY.bodyFamily
    };
    const sectionHeadingClass = `resume-header-font-target w-full text-left ${RESUME_DOCUMENT_TYPOGRAPHY.sectionHeadingClass} font-bold text-[#0f172a] border-b border-[#cbd5e1] pb-0.5 uppercase`;
    const sectionHeadingStyle = {
        fontSize: `${headerFontSize}px`,
        fontFamily: RESUME_DOCUMENT_TYPOGRAPHY.sectionHeadingFamily,
        lineHeight: RESUME_DOCUMENT_TYPOGRAPHY.headingLineHeight,
        letterSpacing: 0,
        marginBottom: `${RESUME_DOCUMENT_TYPOGRAPHY.sectionHeadingMarginBottomPx}px`,
        fontWeight: RESUME_DOCUMENT_TYPOGRAPHY.headingWeight
    };
    const compactFitMetaInputClass = `${contentFitInputStyleClass} shrink-0 leading-[1.25] text-[#1f2937] font-semibold`;
    const compactFitDateInputClass = `${contentFitInputStyleClass} shrink-0 leading-[1.25] text-[#475569] font-medium`;
    const contactInputClass = `${inputStyleClass} resume-body-font-target shrink-0 leading-[1.2] text-[#475569] font-medium hover:bg-slate-100/60`;
    const resumeDividerClass = "shrink-0 text-slate-300/70";

    const measureTextWidth = (text: string, font: string = "500 12px Poppins, Arial, sans-serif") => {
        if (!text) return 0;
        if (typeof document === "undefined") {
            const charSize = font.includes("24px") ? 14 : 7;
            return text.length * charSize;
        }
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
            const charSize = font.includes("24px") ? 14 : 7;
            return text.length * charSize;
        }
        context.font = font;
        return context.measureText(text).width;
    };

    const getMeasuredFontStyle = (font: string): React.CSSProperties => {
        const sizeMatch = font.match(/(\d+(?:\.\d+)?)px\s+(.+)$/);
        const weightMatch = font.match(/^(bold|\d{3})\s+/);
        return {
            fontFamily: sizeMatch?.[2] ?? RESUME_DOCUMENT_TYPOGRAPHY.bodyFamily,
            fontSize: sizeMatch ? `${sizeMatch[1]}px` : `${bodyFontSize}px`,
            fontWeight: weightMatch?.[1] === "bold" ? 700 : weightMatch?.[1] ?? RESUME_DOCUMENT_TYPOGRAPHY.bodyWeight
        };
    };

    const getDynamicInputStyle = (
        value: string | undefined,
        placeholder: string,
        font: string = "500 12px Poppins, Arial, sans-serif",
        extraStyles: React.CSSProperties = {}
    ): React.CSSProperties => {
        const content = value?.trim() || placeholder || "";
        const padding = font.includes("24px") ? 24 : 16;
        const contentWidth = Math.ceil(measureTextWidth(content, font) + padding);
        const minWidth = 16;
        return {
            ...documentTextStyle,
            ...getMeasuredFontStyle(font),
            ...extraStyles,
            width: `${Math.max(minWidth, contentWidth)}px`,
            minWidth: `${minWidth}px`,
            maxWidth: "none",
            fieldSizing: "content"
        } as React.CSSProperties;
    };

    const contactFieldStyle = (value: string | undefined, placeholder: string): React.CSSProperties => {
        return getDynamicInputStyle(value, placeholder, `500 ${bodyFontSize}px Poppins, Arial, sans-serif`, {
            fontSize: `${bodyFontSize}px`,
            fontFamily: RESUME_DOCUMENT_TYPOGRAPHY.contactFamily,
            lineHeight: RESUME_DOCUMENT_TYPOGRAPHY.contactLineHeight
        });
    };

    const headerMarginAddClass = `resume-edit-control absolute -left-9 z-10 !inline-flex h-6 !h-6 w-6 !w-6 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 !text-emerald-600 shadow-none transition-[opacity,background,border-color,color,transform] duration-150 hover:!bg-slate-500/10 hover:border-slate-400/20 hover:!text-emerald-600 active:scale-95 ${activeDocumentSection === "header" ? "opacity-100" : "pointer-events-none opacity-0"}`;
    const isExperienceSectionActive = activeDocumentSection === "experience";
    const experienceMarginAddClass = `resume-edit-control absolute -left-9 z-10 !inline-flex h-6 !h-6 w-6 !w-6 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 !text-emerald-600 shadow-none transition-[opacity,background,border-color,color,transform] duration-150 hover:!bg-slate-500/10 hover:border-slate-400/20 hover:!text-emerald-600 active:scale-95 ${isExperienceSectionActive ? "opacity-100" : "pointer-events-none opacity-0"}`;
    const experienceMarginImproveClass = `resume-edit-control absolute -left-9 z-10 !inline-flex h-6 !h-6 w-6 !w-6 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 !text-sky-600 shadow-none transition-[opacity,background,border-color,color,transform] duration-150 hover:!bg-slate-500/10 hover:border-slate-400/20 hover:!text-sky-600 active:scale-95 ${isExperienceSectionActive ? "opacity-100" : "pointer-events-none opacity-0"}`;
    const experienceMarginClearClass = `resume-edit-control absolute -right-9 z-10 !inline-flex h-6 !h-6 w-6 !w-6 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 !text-slate-500 shadow-none transition-[opacity,background,border-color,color,transform] duration-150 hover:!bg-slate-500/10 hover:border-slate-400/20 hover:!text-slate-600 active:scale-95 ${isExperienceSectionActive ? "opacity-100" : "pointer-events-none opacity-0"}`;
    const experienceMarginDeleteClass = `resume-edit-control absolute -right-9 z-10 !inline-flex h-6 !h-6 w-6 !w-6 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 !text-rose-600 shadow-none transition-[opacity,background,border-color,color,transform] duration-150 hover:!bg-slate-500/10 hover:border-slate-400/20 hover:!text-rose-600 active:scale-95 ${isExperienceSectionActive ? "opacity-100" : "pointer-events-none opacity-0"}`;
    const isSummarySectionActive = activeDocumentSection === "summary";
    const showSummaryControls = isSummarySectionActive || hoveredSummary || focusedSummary;
    const summaryMarginImproveClass = `resume-edit-control absolute -left-9 z-10 !inline-flex h-6 !h-6 w-6 !w-6 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 !text-sky-600 shadow-none transition-[opacity,background,border-color,color,transform] duration-150 hover:!bg-slate-500/10 hover:border-slate-400/20 hover:!text-sky-600 active:scale-95 ${showSummaryControls ? "opacity-100" : "pointer-events-none opacity-0"}`;

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
    };
};
