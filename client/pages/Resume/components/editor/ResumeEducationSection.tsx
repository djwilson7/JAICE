import React from "react";
import { hasText } from "../../resumeData";
import { DocumentSection } from "../DocumentSection";
import { InlineBulletComposer } from "../InlineBulletComposer";
import type { ResumeEditorSectionProps } from "./types";

export const ResumeEducationSection: React.FC<ResumeEditorSectionProps> = ({
    data,
    formatting,
    interaction,
    handlers,
    renderSectionTitle,
    renderInnerGapPreview
}) => {
    const { resumeData } = data;
    const {
        documentSectionGapPx,
        inputStyleClass,
        compactFitMetaInputClass,
        compactFitDateInputClass,
        resumeDividerClass
    } = formatting;
    const {
        activeDocumentSection,
        focusedDocumentSection,
        setActiveDocumentSection,
        setFocusedField,
        hoveredEducationClearId,
        setHoveredEducationClearId,
        hoveredEducationDeleteId,
        setHoveredEducationDeleteId,
        gapPreviewTarget
    } = interaction;
    const {
        renderOverlayInput,
        subHeaderFieldStyle,
        updateEducationField,
        addEducation,
        removeEducation,
        clearEducation,
        addEducationDetailWithText,
        insertEducationDetailAfter,
        updateEducationDetailText,
        removeEducationDetailIfEmpty
    } = handlers;
    const education = resumeData.education || [];
    const showFields = activeDocumentSection === "education";

    return (
        <DocumentSection
            id="education"
            activeSection={activeDocumentSection}
            focusedSection={focusedDocumentSection}
            setActiveSection={setActiveDocumentSection}
            className="group/education-sec"
            showGapPreview={gapPreviewTarget === "section"}
            gapPreviewHeight={documentSectionGapPx}
        >
            {renderSectionTitle("education")}
            <div className="resume-editor-item-stack">
                {education.map((item, index) => {
                    const details = Array.isArray(item.details) ? item.details : [];
                    const visibleDetails = details.filter((detail) => showFields || hasText(detail.text));
                    const meta = [
                        ["degree", "Degree / Major", item.degree || "", "Degree / Major", 700],
                        ["school", "Institution Name", item.school, "Institution Name", 600]
                    ] as const;
                    const visibleMeta = meta.filter((field) => showFields || hasText(field[2]));
                    const dates = [
                        ["startDate", "Start Date", item.startDate || "", "Start"],
                        ["endDate", "End Date", item.endDate || "", "End"]
                    ] as const;
                    const visibleDates = dates.filter((field) => showFields || hasText(field[2]));
                    if (!showFields && !visibleMeta.length && !visibleDates.length && !visibleDetails.length) {
                        return null;
                    }
                    return (
                        <div
                            key={item.id}
                            className="group/edu resume-editor-item"
                            data-controls-visible={showFields}
                            data-clear-hovered={hoveredEducationClearId === item.id}
                            data-delete-hovered={hoveredEducationDeleteId === item.id}
                        >
                            <div className="resume-editor-item-actions resume-editor-item-actions--vertical" data-visible={showFields}>
                                <button
                                    type="button"
                                    onMouseEnter={() => setHoveredEducationClearId(item.id)}
                                    onMouseLeave={() => setHoveredEducationClearId(null)}
                                    onClick={() => clearEducation(item.id)}
                                    className="resume-editor-icon-button"
                                    title="Clear education"
                                    aria-label="Clear education"
                                >
                                    ×
                                </button>
                                <button
                                    type="button"
                                    onMouseEnter={() => setHoveredEducationDeleteId(item.id)}
                                    onMouseLeave={() => setHoveredEducationDeleteId(null)}
                                    onClick={() => removeEducation(item.id)}
                                    className="resume-editor-icon-button resume-editor-icon-button--delete"
                                    title="Remove education"
                                    aria-label="Remove education"
                                >
                                    ⌫
                                </button>
                            </div>
                            {(visibleMeta.length > 0 || visibleDates.length > 0) && (
                                <div className="resume-editor-meta-row">
                                    <div className="resume-editor-meta-group">
                                        {visibleMeta.map(([key, label, value, placeholder, weight], fieldIndex) => (
                                            <React.Fragment key={key}>
                                                {fieldIndex > 0 && (
                                                    <span className={resumeDividerClass}>|</span>
                                                )}
                                                {renderOverlayInput({
                                                    path: `education.${item.id}.${key}`,
                                                    label,
                                                    value,
                                                    placeholder,
                                                    className: compactFitMetaInputClass,
                                                    style: subHeaderFieldStyle(value, placeholder, weight),
                                                    onChange: (nextValue) =>
                                                        updateEducationField(item.id, key, nextValue),
                                                    disableClear: true
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                    <div className="resume-editor-date-group">
                                        {visibleDates.map(([key, label, value, placeholder], fieldIndex) => (
                                            <React.Fragment key={key}>
                                                {fieldIndex > 0 && <span className={resumeDividerClass}>-</span>}
                                                {renderOverlayInput({
                                                    path: `education.${item.id}.${key}`,
                                                    label,
                                                    value,
                                                    placeholder,
                                                    className: compactFitDateInputClass,
                                                    style: subHeaderFieldStyle(value, placeholder, 500),
                                                    onChange: (nextValue) =>
                                                        updateEducationField(item.id, key, nextValue),
                                                    disableClear: true
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {(visibleDetails.length > 0 || showFields) && (
                                <div className="resume-editor-bullet-stack">
                                    {visibleDetails.map((detail, detailIndex) => (
                                        <div
                                            key={detail.id}
                                            className="resume-diagnostic-bullet-row resume-editor-bullet-row"
                                            data-resume-diagnostic="bullet-row"
                                        >
                                            <span className="resume-editor-bullet-marker resume-font--body">
                                                &bull;
                                            </span>
                                            <div className="resume-editor-bullet-input">
                                                {renderOverlayInput({
                                                    path: `education.${item.id}.details.${detailIndex}`,
                                                    label: "Education Detail",
                                                    value: detail.text,
                                                    placeholder: "Concentration, honors, coursework, or other detail...",
                                                    className: inputStyleClass,
                                                    style: {
                                                        whiteSpace: "pre-wrap",
                                                        wordBreak: "break-word"
                                                    },
                                                    isAutoResize: true,
                                                    showTextStats: true,
                                                    onChange: (value) =>
                                                        updateEducationDetailText(item.id, detail.id, value),
                                                    onBlur: () =>
                                                        removeEducationDetailIfEmpty(item.id, detail.id),
                                                    onKeyDown: (event) => {
                                                        if (event.key !== "Enter" || event.shiftKey) return;
                                                        event.preventDefault();
                                                        if (detail.text.trim()) {
                                                            insertEducationDetailAfter(item.id, detail.id);
                                                        } else {
                                                            event.currentTarget.blur();
                                                        }
                                                    },
                                                    disableClear: true,
                                                    disableDelete: true
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                    {showFields && (
                                        <div className="resume-editor-bullet-row">
                                            <span className="resume-editor-bullet-marker resume-font--body">
                                                &bull;
                                            </span>
                                            <InlineBulletComposer
                                                className={`${inputStyleClass} resume-editor-bullet-composer`}
                                                focusPath={`education.${item.id}.composer`}
                                                onCommit={(value) =>
                                                    addEducationDetailWithText(item.id, value)
                                                }
                                                onFocusChange={setFocusedField}
                                                placeholder="Type to add concentration, honors, coursework..."
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                            {index < education.length - 1
                                && renderInnerGapPreview(`education-${item.id}-inner-gap`)}
                        </div>
                    );
                })}
                <div className="resume-editor-add-row" data-visible={showFields}>
                    <button
                        type="button"
                        onClick={addEducation}
                        className="resume-edit-control resume-margin-control resume-margin-control--left resume-margin-control--add is-visible resume-editor-add-row__button"
                        title="Add education"
                        aria-label="Add education Category"
                    >
                        +
                    </button>
                </div>
            </div>
        </DocumentSection>
    );
};
