import React from "react";
import { getSkillItemsText, hasText } from "../../resumeData";
import { DocumentSection } from "../DocumentSection";
import type { ResumeEditorSectionProps } from "./types";

export const ResumeSkillsSection: React.FC<ResumeEditorSectionProps> = ({
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
        boldInputClass
    } = formatting;
    const {
        activeDocumentSection,
        focusedDocumentSection,
        setActiveDocumentSection,
        hoveredSkillDeleteId,
        setHoveredSkillDeleteId,
        gapPreviewTarget
    } = interaction;
    const {
        updateSkillCategoryName,
        updateSkillCategoryItems,
        removeSkillCategory,
        addSkillCategory
    } = handlers;
    const skills = resumeData.skills || [];
    const showFields = activeDocumentSection === "skills";

    return (
        <DocumentSection
            id="skills"
            activeSection={activeDocumentSection}
            focusedSection={focusedDocumentSection}
            setActiveSection={setActiveDocumentSection}
            className="group/skills-sec"
            showGapPreview={gapPreviewTarget === "section"}
            gapPreviewHeight={documentSectionGapPx}
        >
            {renderSectionTitle("skills")}
            <div className="resume-editor-item-stack">
                {skills.map((skill, index) => {
                    const itemsText = getSkillItemsText(skill);
                    if (!showFields && !hasText(skill.category) && !hasText(itemsText)) return null;
                    const deleteHovered = hoveredSkillDeleteId === skill.id;
                    return (
                        <div
                            key={skill.id}
                            className="resume-editor-skill-row"
                            data-controls-visible={showFields}
                            data-delete-hovered={deleteHovered}
                        >
                            {(showFields || hasText(skill.category)) && (
                                <input
                                    className={`${boldInputClass} resume-subheader-font-target resume-editor-skill-category`}
                                    value={skill.category}
                                    onChange={(event) =>
                                        updateSkillCategoryName(skill.id, event.target.value)
                                    }
                                    placeholder="Category"
                                />
                            )}
                            {(showFields || hasText(itemsText)) && (
                                <>
                                    {hasText(skill.category) && <span className="resume-editor-skill-colon">:</span>}
                                    <input
                                        className={`${inputStyleClass} resume-editor-skill-items`}
                                        value={itemsText}
                                        onChange={(event) =>
                                            updateSkillCategoryItems(skill.id, event.target.value)
                                        }
                                        placeholder="Skill one, skill two"
                                    />
                                </>
                            )}
                            {showFields && (
                                <button
                                    type="button"
                                    onMouseEnter={() => setHoveredSkillDeleteId(skill.id)}
                                    onMouseLeave={() => setHoveredSkillDeleteId(null)}
                                    onClick={() => removeSkillCategory(skill.id)}
                                    className="resume-edit-control resume-editor-icon-button resume-editor-icon-button--delete"
                                    title="Delete skill category"
                                    aria-label="Delete skill category"
                                >
                                    ⌫
                                </button>
                            )}
                            {index < skills.length - 1
                                && renderInnerGapPreview(`skill-${skill.id}-inner-gap`)}
                        </div>
                    );
                })}
                <div className="resume-editor-add-row" data-visible={showFields}>
                    <button
                        type="button"
                        onClick={addSkillCategory}
                        className="resume-edit-control resume-margin-control resume-margin-control--left resume-margin-control--add is-visible resume-editor-add-row__button"
                        title="Add skill category"
                        aria-label="Add skill category"
                    >
                        +
                    </button>
                </div>
            </div>
        </DocumentSection>
    );
};
