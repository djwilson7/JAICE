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
        setHoveredField = () => undefined,
        hoveredSkillId,
        setHoveredSkillId,
        gapPreviewTarget
    } = interaction;
    const {
        createSkillCategory,
        updateSkillCategoryName,
        updateSkillCategoryItems,
        removeSkillCategoryIfEmpty,
        moveSkillCategoryUp,
        moveSkillCategoryDown
    } = handlers;
    const skills = resumeData.skills || [];
    const showFields = activeDocumentSection === "skills";
    const [draftSkillId, setDraftSkillId] = React.useState<string | null>(null);
    const [draftCategory, setDraftCategory] = React.useState("");
    const [draftItems, setDraftItems] = React.useState("");

    const visibleSkills = React.useMemo(
        () => skills.filter((skill) => skill.id !== draftSkillId),
        [draftSkillId, skills]
    );

    const ensureDraftSkill = React.useCallback(() => {
        if (draftSkillId) return draftSkillId;
        const nextId = createSkillCategory("", "");
        setDraftSkillId(nextId);
        return nextId;
    }, [createSkillCategory, draftSkillId]);

    const handleDraftCategoryChange = React.useCallback((value: string) => {
        setDraftCategory(value);
        const id = ensureDraftSkill();
        updateSkillCategoryName(id, value);
    }, [ensureDraftSkill, updateSkillCategoryName]);

    const handleDraftItemsChange = React.useCallback((value: string) => {
        setDraftItems(value);
        const id = ensureDraftSkill();
        updateSkillCategoryItems(id, value);
    }, [ensureDraftSkill, updateSkillCategoryItems]);

    const handleDraftRowBlur = React.useCallback((event: React.FocusEvent<HTMLDivElement>) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        if (draftSkillId) {
            removeSkillCategoryIfEmpty(draftSkillId);
        }
        setDraftSkillId(null);
        setDraftCategory("");
        setDraftItems("");
    }, [draftSkillId, removeSkillCategoryIfEmpty]);

    const handleSkillsSectionMouseMove = React.useCallback(
        (event: React.MouseEvent<HTMLElement>) => {
            const itemElements = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>("[data-skill-item-id]")
            );
            if (itemElements.length === 0) return;

            const nearestItem = itemElements.reduce<{
                id: string;
                distance: number;
            } | null>((nearest, element) => {
                const id = element.dataset.skillItemId;
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
                setHoveredSkillId((current) =>
                    current === nearestItem.id ? current : nearestItem.id
                );
            }
        },
        [setHoveredSkillId]
    );

    return (
        <DocumentSection
            id="skills"
            activeSection={activeDocumentSection}
            focusedSection={focusedDocumentSection}
            setActiveSection={setActiveDocumentSection}
            className="group/skills-sec"
            showGapPreview={gapPreviewTarget === "section"}
            gapPreviewHeight={documentSectionGapPx}
            onMouseMove={handleSkillsSectionMouseMove}
            onMouseLeave={() => setHoveredSkillId(null)}
        >
            {renderSectionTitle("skills")}
            <div className="resume-editor-item-stack">
                {visibleSkills.map((skill, index) => {
                    const itemsText = getSkillItemsText(skill);
                    if (!showFields && !hasText(skill.category) && !hasText(itemsText)) return null;
                    const isItemHovered = hoveredSkillId === skill.id;

                    return (
                        <div
                            key={skill.id}
                            className="resume-editor-skill-row"
                            data-skill-item-id={skill.id}
                            data-resume-segment-id={`${skill.id}-skill`}
                            data-controls-visible={isItemHovered}
                            onBlur={(event) => {
                                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                                removeSkillCategoryIfEmpty(skill.id);
                            }}
                        >
                            {(showFields || hasText(skill.category)) && (
                                <input
                                    className={`${boldInputClass} resume-editor-input--fit resume-subheader-font-target resume-editor-skill-category`}
                                    value={skill.category}
                                    onMouseEnter={() => setHoveredField(`skills.${skill.id}.category`)}
                                    onMouseLeave={() => setHoveredField((current) =>
                                        current === `skills.${skill.id}.category` ? null : current
                                    )}
                                    onChange={(event) =>
                                        updateSkillCategoryName(skill.id, event.target.value)
                                    }
                                    placeholder="Category"
                                />
                            )}
                            {(showFields || hasText(itemsText)) && (
                                <>
                                    {(showFields || hasText(skill.category)) && <span className="resume-editor-skill-colon">:</span>}
                                    <input
                                        className={`${inputStyleClass} resume-editor-skill-items`}
                                        value={itemsText}
                                        onMouseEnter={() => setHoveredField(`skills.${skill.id}.items`)}
                                        onMouseLeave={() => setHoveredField((current) =>
                                            current === `skills.${skill.id}.items` ? null : current
                                        )}
                                        onChange={(event) =>
                                            updateSkillCategoryItems(skill.id, event.target.value)
                                        }
                                        placeholder="Skill one, skill two"
                                    />
                                </>
                            )}
                            {showFields && (
                                <div className="resume-editor-item-actions" data-visible={isItemHovered}>
                                    <button
                                        type="button"
                                        disabled={index === 0}
                                        onClick={() => moveSkillCategoryUp(skill.id)}
                                        className="resume-editor-item-control resume-editor-icon-button"
                                        title="Move skill category up"
                                        aria-label="Move skill category up"
                                    >
                                        <svg className="resume-editor-control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="m7 11 5-5 5 5M12 6v12" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={index === visibleSkills.length - 1}
                                        onClick={() => moveSkillCategoryDown(skill.id)}
                                        className="resume-editor-item-control resume-editor-icon-button"
                                        title="Move skill category down"
                                        aria-label="Move skill category down"
                                    >
                                        <svg className="resume-editor-control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="m7 13 5 5 5-5M12 18V6" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                            {index < visibleSkills.length - 1
                                && renderInnerGapPreview(`skill-${skill.id}-inner-gap`)}
                        </div>
                    );
                })}
                {showFields && (
                    <div
                        className="resume-editor-skill-row resume-editor-skill-row--template"
                        data-controls-visible="true"
                        onBlur={handleDraftRowBlur}
                    >
                        <input
                            className={`${boldInputClass} resume-editor-input--fit resume-subheader-font-target resume-editor-skill-category`}
                            value={draftCategory}
                            onChange={(event) => handleDraftCategoryChange(event.target.value)}
                            placeholder="Add Skill"
                        />
                        <span className="resume-editor-skill-colon">:</span>
                        <input
                            className={`${inputStyleClass} resume-editor-skill-items`}
                            value={draftItems}
                            onChange={(event) => handleDraftItemsChange(event.target.value)}
                            placeholder="List the skills under this category"
                        />
                    </div>
                )}
            </div>
        </DocumentSection>
    );
};
