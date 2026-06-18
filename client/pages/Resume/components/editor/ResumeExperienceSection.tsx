import React from "react";
import { hasText, getTagColorStyle } from "../../resumeData";
import { DocumentSection } from "../DocumentSection";
import { ExperienceBulletTags } from "../ExperienceBulletTags";
import { InlineBulletComposer } from "../InlineBulletComposer";
import type { ResumeEditorSectionProps } from "./types";

type PreviewTag = { bulletId: string; color: string } | null;

export const ResumeExperienceSection: React.FC<
    ResumeEditorSectionProps & {
        previewTag: PreviewTag;
        setPreviewTag: React.Dispatch<React.SetStateAction<PreviewTag>>;
    }
> = ({
    data,
    formatting,
    interaction,
    handlers,
    renderSectionTitle,
    renderInnerGapPreview,
    previewTag,
    setPreviewTag
}) => {
    const { resumeData, experienceRewriteSuggestions } = data;
    const {
        documentSectionGapPx,
        inputStyleClass,
        compactFitMetaInputClass,
        compactFitDateInputClass,
        resumeDividerClass,
        experienceMarginAddClass,
        experienceMarginImproveClass
    } = formatting;
    const {
        activeDocumentSection,
        focusedDocumentSection,
        setActiveDocumentSection,
        setFocusedField,
        hoveredJobId,
        setHoveredJobId,
        hoveredExperienceImproveId,
        setHoveredExperienceImproveId,
        hoveredExperienceClearId,
        setHoveredExperienceClearId,
        hoveredExperienceDeleteId,
        setHoveredExperienceDeleteId,
        rewriteActionHover,
        setRewriteActionHover,
        isExperienceSectionActive,
        gapPreviewTarget,
        loadingExperienceImproveId
    } = interaction;
    const {
        renderOverlayInput,
        renderRewriteActionButtons,
        subHeaderFieldStyle,
        getSuggestionReviewClass,
        updateExperienceField,
        insertExperienceAt,
        removeExperience,
        moveExperienceUp,
        moveExperienceDown,
        clearExperience,
        addBulletWithText,
        insertBulletAfter,
        updateBulletText,
        removeBulletIfEmpty,
        removeBullet,
        toggleBulletTag,
        createAndAssignBulletTag,
        deleteBulletTag,
        handleImproveExperience,
        acceptExperienceRewriteSuggestion,
        rejectExperienceRewriteSuggestion
    } = handlers;
    const experiences = resumeData.experience || [];

    return (
        <DocumentSection
            id="experience"
            activeSection={activeDocumentSection}
            focusedSection={focusedDocumentSection}
            setActiveSection={setActiveDocumentSection}
            className="group/experience-sec"
            showGapPreview={gapPreviewTarget === "section"}
            gapPreviewHeight={documentSectionGapPx}
        >
            {renderSectionTitle("experience")}
            <div className="resume-editor-item-stack">
                {experiences.map((experience, index) => {
                    const bullets = Array.isArray(experience.bullets) ? experience.bullets : [];
                    const isItemHovered = hoveredJobId === experience.id;
                    const hasExperienceContent = [
                        experience.jobTitle,
                        experience.company,
                        experience.location,
                        experience.startDate,
                        experience.endDate
                    ].some(hasText) || bullets.length > 0;
                    const showControls =
                        isItemHovered || (isExperienceSectionActive && !hasExperienceContent);
                    const pendingRewrite = experienceRewriteSuggestions[experience.id] || null;
                    const metaFields = [
                        ["jobTitle", "Job Title", experience.jobTitle, "Title", 700, "#0f172a"],
                        ["company", "Company Name", experience.company || "", "Company Name", 600, undefined],
                        ["location", "City, State", experience.location || "", "City, State", 600, "#475569"]
                    ] as const;
                    const visibleMeta = metaFields.filter(
                        (field) => showControls || hasText(field[2])
                    );
                    const dateFields = [
                        ["startDate", "Start Date", experience.startDate || "", "Start"],
                        ["endDate", "End Date", experience.endDate || "", "End"]
                    ] as const;
                    const visibleDates = dateFields.filter(
                        (field) => showControls || hasText(field[2])
                    );
                    if (!showControls && !visibleMeta.length && !visibleDates.length && !bullets.length) {
                        return null;
                    }

                    return (
                        <div
                            key={experience.id}
                            className="group/job resume-editor-item"
                            data-section-active={isExperienceSectionActive}
                            data-controls-visible={showControls}
                            data-improve-hovered={hoveredExperienceImproveId === experience.id}
                            data-clear-hovered={hoveredExperienceClearId === experience.id}
                            data-delete-hovered={hoveredExperienceDeleteId === experience.id}
                            onMouseEnter={() => setHoveredJobId(experience.id)}
                            onMouseLeave={() => setHoveredJobId(null)}
                        >
                            <button
                                type="button"
                                onMouseEnter={() => setHoveredExperienceImproveId(experience.id)}
                                onMouseLeave={() => setHoveredExperienceImproveId(null)}
                                onClick={() => handleImproveExperience(experience)}
                                disabled={Boolean(pendingRewrite?.isStreaming) || bullets.length === 0}
                                className={`${experienceMarginImproveClass} resume-editor-item__improve`}
                                title="Improve work experience with AI"
                                aria-label="Improve work experience with AI"
                            >
                                {loadingExperienceImproveId === experience.id ? (
                                    <span className="resume-editor-spinner" />
                                ) : (
                                    <span aria-hidden="true">✦</span>
                                )}
                            </button>
                            <div className="resume-editor-item-actions" data-visible={showControls}>
                                <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() => moveExperienceUp(experience.id)}
                                    className="resume-editor-icon-button"
                                    title="Move work experience up"
                                    aria-label="Move work experience up"
                                >
                                    ↑
                                </button>
                                <button
                                    type="button"
                                    disabled={index === experiences.length - 1}
                                    onClick={() => moveExperienceDown(experience.id)}
                                    className="resume-editor-icon-button"
                                    title="Move work experience down"
                                    aria-label="Move work experience down"
                                >
                                    ↓
                                </button>
                                <button
                                    type="button"
                                    onMouseEnter={() => setHoveredExperienceClearId(experience.id)}
                                    onMouseLeave={() => setHoveredExperienceClearId(null)}
                                    onClick={() => clearExperience(experience.id)}
                                    className="resume-editor-icon-button"
                                    title="Clear work experience"
                                    aria-label="Clear work experience"
                                >
                                    ×
                                </button>
                                <button
                                    type="button"
                                    onMouseEnter={() => setHoveredExperienceDeleteId(experience.id)}
                                    onMouseLeave={() => setHoveredExperienceDeleteId(null)}
                                    onClick={() => removeExperience(experience.id)}
                                    className="resume-editor-icon-button resume-editor-icon-button--delete"
                                    title="Remove work experience"
                                    aria-label="Remove work experience"
                                >
                                    ⌫
                                </button>
                            </div>

                            {(visibleMeta.length > 0 || visibleDates.length > 0) && (
                                <div className="resume-editor-meta-row">
                                    <div className="resume-editor-meta-group">
                                        {visibleMeta.map(([key, label, value, placeholder, weight, color], fieldIndex) => (
                                            <React.Fragment key={key}>
                                                {fieldIndex > 0 && (
                                                    <span className={resumeDividerClass}>|</span>
                                                )}
                                                {renderOverlayInput({
                                                    path: `experience.${index}.${key}`,
                                                    label,
                                                    value,
                                                    placeholder,
                                                    className: compactFitMetaInputClass,
                                                    style: subHeaderFieldStyle(value, placeholder, weight, { color }),
                                                    onChange: (nextValue) =>
                                                        updateExperienceField(experience.id, key, nextValue),
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
                                                    path: `experience.${index}.${key}`,
                                                    label,
                                                    value,
                                                    placeholder,
                                                    className: compactFitDateInputClass,
                                                    style: subHeaderFieldStyle(value, placeholder, 500),
                                                    onChange: (nextValue) =>
                                                        updateExperienceField(experience.id, key, nextValue),
                                                    disableClear: true
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="resume-editor-bullet-stack">
                                {bullets.map((bullet, bulletIndex) => {
                                    const rewriteItem = pendingRewrite?.items.find(
                                        (item) => item.bulletId === bullet.id
                                    );
                                    const hoverAction =
                                        rewriteActionHover?.target === "experience"
                                        && rewriteActionHover.bulletId === bullet.id
                                            ? rewriteActionHover.action
                                            : null;
                                    const currentRewriteClass = hoverAction === "accept"
                                        ? "resume-rewrite-current-accept-hover"
                                        : hoverAction === "reject"
                                        ? "resume-rewrite-current-reject-hover"
                                        : "";
                                    return (
                                        <React.Fragment key={bullet.id}>
                                            <div
                                                className="resume-diagnostic-bullet-row resume-editor-bullet-row"
                                                data-resume-diagnostic="bullet-row"
                                            >
                                                <ExperienceBulletTags
                                                    bulletId={bullet.id}
                                                    tagIds={bullet.tagIds || []}
                                                    tags={resumeData.tagLibrary || []}
                                                    isEditing={showControls}
                                                    focusPath={`experience.${index}.bullets.${bulletIndex}.tags`}
                                                    onSectionHoverChange={(isHovering) =>
                                                        setActiveDocumentSection((current) =>
                                                            isHovering
                                                                ? "experience"
                                                                : current === "experience"
                                                                ? null
                                                                : current
                                                        )
                                                    }
                                                    onToggleTag={(tagId) =>
                                                        toggleBulletTag(experience.id, bullet.id, tagId)
                                                    }
                                                    onCreateTag={(name) =>
                                                        createAndAssignBulletTag(experience.id, bullet.id, name)
                                                    }
                                                    onDeleteTag={deleteBulletTag}
                                                    onPreviewTag={(tag) => {
                                                        if (!tag) {
                                                            setPreviewTag((current) =>
                                                                current?.bulletId === bullet.id ? null : current
                                                            );
                                                            return;
                                                        }
                                                        setPreviewTag({
                                                            bulletId: bullet.id,
                                                            color: getTagColorStyle(tag.colorToken).color
                                                        });
                                                    }}
                                                    onFocusChange={setFocusedField}
                                                />
                                                <span className="resume-editor-bullet-marker resume-font--body">
                                                    &bull;
                                                </span>
                                                <div className="resume-editor-bullet-input">
                                                    {renderOverlayInput({
                                                        path: `experience.${index}.bullets.${bulletIndex}`,
                                                        label: "Bullet Point",
                                                        value: bullet.text,
                                                        placeholder: "Described high-impact action outcome...",
                                                        className: `${inputStyleClass} ${currentRewriteClass}${
                                                            previewTag?.bulletId === bullet.id
                                                                ? " resume-tag-preview-input"
                                                                : ""
                                                        }`,
                                                        style: {
                                                            whiteSpace: "pre-wrap",
                                                            wordBreak: "break-word",
                                                            "--resume-tag-preview-color":
                                                                previewTag?.bulletId === bullet.id
                                                                    ? previewTag.color
                                                                    : undefined
                                                        } as React.CSSProperties,
                                                        isAutoResize: true,
                                                        showTextStats: true,
                                                        onChange: (value) =>
                                                            updateBulletText(experience.id, bullet.id, value),
                                                        onBlur: () =>
                                                            removeBulletIfEmpty(experience.id, bullet.id),
                                                        onKeyDown: (event) => {
                                                            if (event.key !== "Enter" || event.shiftKey) return;
                                                            event.preventDefault();
                                                            if (bullet.text.trim()) {
                                                                insertBulletAfter(experience.id, bullet.id);
                                                            } else {
                                                                event.currentTarget.blur();
                                                            }
                                                        },
                                                        onDelete: () =>
                                                            removeBullet(experience.id, bullet.id),
                                                        disableClear: true,
                                                        disableDelete: true
                                                    })}
                                                </div>
                                            </div>
                                            {(loadingExperienceImproveId === experience.id || rewriteItem) && (
                                                <div className="resume-editor-rewrite-suggestion">
                                                    {rewriteItem ? (
                                                        <>
                                                            {!rewriteItem.isStreaming && renderRewriteActionButtons({
                                                                onAccept: () =>
                                                                    acceptExperienceRewriteSuggestion(
                                                                        experience.id,
                                                                        rewriteItem.bulletId
                                                                    ),
                                                                onReject: () =>
                                                                    rejectExperienceRewriteSuggestion(
                                                                        experience.id,
                                                                        rewriteItem.bulletId
                                                                    ),
                                                                onAcceptHover: () =>
                                                                    setRewriteActionHover({
                                                                        target: "experience",
                                                                        bulletId: rewriteItem.bulletId,
                                                                        action: "accept"
                                                                    }),
                                                                onRejectHover: () =>
                                                                    setRewriteActionHover({
                                                                        target: "experience",
                                                                        bulletId: rewriteItem.bulletId,
                                                                        action: "reject"
                                                                    }),
                                                                onClearHover: () => setRewriteActionHover(null)
                                                            })}
                                                            <div className={`resume-rewrite-suggestion-text ${getSuggestionReviewClass(hoverAction || undefined)}`}>
                                                                {rewriteItem.suggestedText
                                                                    || (rewriteItem.isQueued
                                                                        ? "Queued bullet rewrite..."
                                                                        : "Generating bullet rewrite...")}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="resume-editor-rewrite-loading text-shimmer-light">
                                                            Generating bullet rewrite...
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                                {isItemHovered && (
                                    <div className="resume-editor-bullet-row">
                                        <span className="resume-editor-bullet-marker resume-font--body">
                                            &bull;
                                        </span>
                                        <InlineBulletComposer
                                            className={`${inputStyleClass} resume-editor-bullet-composer`}
                                            focusPath={`experience.${index}.composer`}
                                            onCommit={(value) => addBulletWithText(experience.id, value)}
                                            onFocusChange={setFocusedField}
                                            placeholder="Type to add a new bullet..."
                                        />
                                    </div>
                                )}
                            </div>
                            {index < experiences.length - 1
                                && renderInnerGapPreview(`experience-${experience.id}-inner-gap`)}
                        </div>
                    );
                })}
                <div className="resume-editor-add-row" data-visible={activeDocumentSection === "experience"}>
                    <button
                        type="button"
                        onClick={() => insertExperienceAt(experiences.length)}
                        className={`${experienceMarginAddClass} resume-editor-add-row__button`}
                        title="Add experience"
                        aria-label="Add experience at the bottom of Work Experience"
                    >
                        +
                    </button>
                </div>
            </div>
        </DocumentSection>
    );
};
