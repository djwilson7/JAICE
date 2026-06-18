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
        hoveredEducationId,
        setHoveredEducationId,
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
        moveEducationUp,
        moveEducationDown,
        clearEducation,
        addEducationDetailWithText,
        insertEducationDetailAfter,
        updateEducationDetailText,
        removeEducationDetailIfEmpty
    } = handlers;
    const education = resumeData.education || [];
    const showFields = activeDocumentSection === "education";

    const handleEducationSectionMouseMove = React.useCallback(
        (event: React.MouseEvent<HTMLElement>) => {
            const itemElements = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>("[data-education-item-id]")
            );
            if (itemElements.length === 0) return;

            const nearestItem = itemElements.reduce<{
                id: string;
                distance: number;
            } | null>((nearest, element) => {
                const id = element.dataset.educationItemId;
                if (!id) return nearest;
                const rect = element.getBoundingClientRect();
                const horizontalDistance = event.clientX < rect.left
                    ? rect.left - event.clientX
                    : event.clientX > rect.right
                    ? event.clientX - rect.right
                    : 0;
                const verticalDistance = event.clientY < rect.top
                    ? rect.top - event.clientY
                    : event.clientY > rect.bottom
                    ? event.clientY - rect.bottom
                    : 0;
                const distance = Math.hypot(horizontalDistance, verticalDistance);

                return !nearest || distance < nearest.distance
                    ? { id, distance }
                    : nearest;
            }, null);

            if (nearestItem) {
                setHoveredEducationId((current) =>
                    current === nearestItem.id ? current : nearestItem.id
                );
            }
        },
        [setHoveredEducationId]
    );

    return (
        <DocumentSection
            id="education"
            activeSection={activeDocumentSection}
            focusedSection={focusedDocumentSection}
            setActiveSection={setActiveDocumentSection}
            className="group/education-sec"
            showGapPreview={gapPreviewTarget === "section"}
            gapPreviewHeight={documentSectionGapPx}
            onMouseMove={handleEducationSectionMouseMove}
            onMouseLeave={() => setHoveredEducationId(null)}
        >
            {renderSectionTitle("education")}
            <div className="resume-editor-item-stack">
                {education.map((item, index) => {
                    const details = Array.isArray(item.details) ? item.details : [];
                    const isItemHovered = hoveredEducationId === item.id;
                    const hasEducationContent = [
                        item.degree,
                        item.school,
                        item.startDate,
                        item.endDate
                    ].some(hasText) || details.some((detail) => hasText(detail.text));
                    const showControls = isItemHovered || (showFields && !hasEducationContent);
                    const visibleDetails = details.filter((detail) => hasText(detail.text));
                    const meta = [
                        ["degree", "Degree / Major", item.degree || "", "Degree / Major", 700],
                        ["school", "Institution Name", item.school, "Institution Name", 600]
                    ] as const;
                    const visibleMeta = meta.filter((field) => showControls || hasText(field[2]));
                    const dates = [
                        ["startDate", "Start Date", item.startDate || "", "Start"],
                        ["endDate", "End Date", item.endDate || "", "End"]
                    ] as const;
                    const visibleDates = dates.filter((field) => showControls || hasText(field[2]));

                    if (!showControls && !visibleMeta.length && !visibleDates.length && !visibleDetails.length) {
                        return null;
                    }

                    return (
                        <div
                            key={item.id}
                            className="group/edu resume-editor-item resume-editor-education-item"
                            data-education-item-id={item.id}
                            data-controls-visible={showControls}
                            data-clear-hovered={hoveredEducationClearId === item.id}
                            data-delete-hovered={hoveredEducationDeleteId === item.id}
                        >
                            <div className="resume-editor-item-actions" data-visible={showControls}>
                                <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() => moveEducationUp(item.id)}
                                    className="resume-editor-item-control resume-editor-icon-button"
                                    title="Move education up"
                                    aria-label="Move education up"
                                >
                                    <svg className="resume-editor-control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="m7 11 5-5 5 5M12 6v12" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    disabled={index === education.length - 1}
                                    onClick={() => moveEducationDown(item.id)}
                                    className="resume-editor-item-control resume-editor-icon-button"
                                    title="Move education down"
                                    aria-label="Move education down"
                                >
                                    <svg className="resume-editor-control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="m7 13 5 5 5-5M12 18V6" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onMouseEnter={() => setHoveredEducationClearId(item.id)}
                                    onMouseLeave={() => setHoveredEducationClearId(null)}
                                    onClick={() => clearEducation(item.id)}
                                    className="resume-editor-item-control resume-editor-icon-button"
                                    title="Clear education"
                                    aria-label="Clear education"
                                >
                                    <svg className="resume-editor-control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
                                        <path d="M6 6l12 12M18 6 6 18" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onMouseEnter={() => setHoveredEducationDeleteId(item.id)}
                                    onMouseLeave={() => setHoveredEducationDeleteId(null)}
                                    onClick={() => removeEducation(item.id)}
                                    className="resume-editor-item-control resume-editor-icon-button resume-editor-icon-button--delete"
                                    title="Remove education"
                                    aria-label="Remove education"
                                >
                                    <svg className="resume-editor-control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M4 7h16M9 7V5h6v2M7 10l1 9h8l1-9M10 11v5M14 11v5" />
                                    </svg>
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
                            {visibleDetails.length > 0 && (
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
                                </div>
                            )}
                            {showControls && (
                                <div className="resume-editor-education-composer resume-editor-bullet-row">
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
                            {index < education.length - 1
                                && renderInnerGapPreview(`education-${item.id}-inner-gap`)}
                        </div>
                    );
                })}
                <div className="resume-editor-add-row" data-visible={showFields}>
                    <button
                        type="button"
                        onClick={() => {
                            const nextId = addEducation();
                            setHoveredEducationId(nextId);
                        }}
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
