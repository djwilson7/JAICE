import { useState } from "react";
import type { ContactFieldKey, DocumentSectionId, EducationItem, ExperienceItem, ResumeData } from "../types";
import { defaultResumeData, makeId, parseSkillItems } from "../resumeData";

export const useResumeDocumentEditing = () => {
    const [resumeData, setResumeData] = useState<ResumeData>(defaultResumeData());
    const [hoveredDeleteIndex, setHoveredDeleteIndex] = useState<string | null>(null);
    const [hoveredContactField, setHoveredContactField] = useState<string | null>(null);
    const [focusedContactField, setFocusedContactField] = useState<string | null>(null);
    const [hoveredNameSection, setHoveredNameSection] = useState(false);
    const [focusedNameSection, setFocusedNameSection] = useState(false);
    const [hoveredSummary, setHoveredSummary] = useState(false);
    const [focusedSummary, setFocusedSummary] = useState(false);
    const [isSummaryImproveHovered, setIsSummaryImproveHovered] = useState(false);
    const [hoveredField, setHoveredField] = useState<string | null>(null);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [hoveredJobId, setHoveredJobId] = useState<string | null>(null);
    const [hoveredExperienceImproveId, setHoveredExperienceImproveId] = useState<string | null>(null);
    const [hoveredExperienceClearId, setHoveredExperienceClearId] = useState<string | null>(null);
    const [hoveredExperienceDeleteId, setHoveredExperienceDeleteId] = useState<string | null>(null);
    const [hoveredEducationDeleteId, setHoveredEducationDeleteId] = useState<string | null>(null);
    const [hoveredSkillDeleteId, setHoveredSkillDeleteId] = useState<string | null>(null);
    const [activeDocumentSection, setActiveDocumentSection] = useState<DocumentSectionId | null>(null);

    const updateField = (field: keyof ResumeData, value: string) => {
        setResumeData((prev) => ({ ...prev, [field]: value }));
    };

    const addCustomContactField = () => {
        setResumeData((prev) => ({
            ...prev,
            customContact: [...(prev.customContact || []), { label: "Add text", value: "" }]
        }));
    };

    const updateCustomContactField = (index: number, field: "label" | "value", val: string) => {
        setResumeData((prev) => {
            const list = [...(prev.customContact || [])];
            if (list[index]) {
                list[index] = { ...list[index], [field]: val };
            }
            return { ...prev, customContact: list };
        });
    };

    const removeCustomContactField = (index: number) => {
        setResumeData((prev) => ({
            ...prev,
            customContact: (prev.customContact || []).filter((_, idx) => idx !== index)
        }));
    };

    const removeStandardContactField = (field: ContactFieldKey) => {
        setResumeData((prev) => ({
            ...prev,
            [field]: "",
            hiddenContactFields: Array.from(new Set([...(prev.hiddenContactFields || []), field]))
        }));
    };

    const updateExperienceField = (id: string, field: keyof ExperienceItem, value: string) => {
        setResumeData((prev) => ({
            ...prev,
            experience: (prev.experience || []).map((exp) =>
                exp.id === id ? { ...exp, [field]: value } : exp
            )
        }));
    };

    const insertExperienceAt = (index: number) => {
        const id = makeId();
        setResumeData((prev) => ({
            ...prev,
            experience: (() => {
                const nextExperience = [...(prev.experience || [])];
                nextExperience.splice(Math.max(0, Math.min(index, nextExperience.length)), 0, {
                    id,
                    jobTitle: "",
                    company: "",
                    location: "",
                    startDate: "",
                    endDate: "",
                    bullets: []
                });
                return nextExperience;
            })()
        }));
    };

    const removeExperience = (id: string) => {
        setResumeData((prev) => ({
            ...prev,
            experience: (prev.experience || []).filter((exp) => exp.id !== id)
        }));
    };

    const clearExperience = (id: string) => {
        setResumeData((prev) => ({
            ...prev,
            experience: (prev.experience || []).map((exp) =>
                exp.id === id
                    ? {
                        ...exp,
                        jobTitle: "",
                        company: "",
                        location: "",
                        startDate: "",
                        endDate: "",
                        bullets: []
                    }
                    : exp
            )
        }));
    };

    const addBulletWithText = (expId: string, text: string) => {
        const normalizedText = text.trimStart();
        if (!normalizedText.trim()) return;

        const bulletId = makeId();
        setResumeData((prev) => ({
            ...prev,
            experience: (prev.experience || []).map((exp) => {
                if (exp.id === expId) {
                    return {
                        ...exp,
                        bullets: [...(exp.bullets || []), { id: bulletId, text: normalizedText }]
                    };
                }
                return exp;
            })
        }));

        const expIdx = resumeData.experience.findIndex(exp => exp.id === expId);
        const bulletIdx = (resumeData.experience[expIdx]?.bullets || []).length;
        const newPath = `experience.${expIdx}.bullets.${bulletIdx}`;
        setFocusedField(newPath);
    };

    const removeBullet = (expId: string, bulletId: string) => {
        setResumeData((prev) => ({
            ...prev,
            experience: (prev.experience || []).map((exp) =>
                exp.id === expId
                    ? { ...exp, bullets: (exp.bullets || []).filter((b) => b.id !== bulletId) }
                    : exp
            )
        }));
    };

    const updateBulletText = (expId: string, bulletId: string, value: string) => {
        const expIdx = resumeData.experience.findIndex((exp) => exp.id === expId);
        const bulletIdx = resumeData.experience[expIdx]?.bullets?.findIndex((bullet) => bullet.id === bulletId) ?? -1;
        const bulletPath = expIdx >= 0 && bulletIdx >= 0 ? `experience.${expIdx}.bullets.${bulletIdx}` : null;

        if (!value.trim()) {
            removeBullet(expId, bulletId);
            if (bulletPath) {
                setFocusedField((current) => current === bulletPath ? null : current);
                setHoveredField((current) => current === bulletPath ? null : current);
            }
            return;
        }

        setResumeData((prev) => ({
            ...prev,
            experience: (prev.experience || []).map((exp) =>
                exp.id === expId
                    ? {
                        ...exp,
                        bullets: (exp.bullets || []).map((b) =>
                            b.id === bulletId ? { ...b, text: value } : b
                        )
                    }
                    : exp
            )
        }));
    };

    const updateEducationField = (id: string, field: keyof EducationItem, value: string) => {
        setResumeData((prev) => ({
            ...prev,
            education: (prev.education || []).map((ed) =>
                ed.id === id ? { ...ed, [field]: value } : ed
            )
        }));
    };

    const addEducation = () => {
        const id = makeId();
        setResumeData((prev) => ({
            ...prev,
            education: [
                ...(prev.education || []),
                { id, school: "", degree: "", startDate: "", endDate: "", details: [] }
            ]
        }));
    };

    const removeEducation = (id: string) => {
        setResumeData((prev) => ({
            ...prev,
            education: (prev.education || []).filter((ed) => ed.id !== id)
        }));
    };

    const addEducationDetailWithText = (educationId: string, text: string) => {
        const normalizedText = text.trimStart();
        if (!normalizedText.trim()) return;
        setResumeData((prev) => ({
            ...prev,
            education: (prev.education || []).map((ed) =>
                ed.id === educationId
                    ? {
                        ...ed,
                        details: [...(ed.details || []), { id: makeId(), text: normalizedText }]
                    }
                    : ed
            )
        }));
    };

    const removeEducationDetail = (educationId: string, detailId: string) => {
        setResumeData((prev) => ({
            ...prev,
            education: (prev.education || []).map((ed) =>
                ed.id === educationId
                    ? { ...ed, details: (ed.details || []).filter((detail) => detail.id !== detailId) }
                    : ed
            )
        }));
    };

    const updateEducationDetailText = (educationId: string, detailId: string, value: string) => {
        const educationIdx = resumeData.education.findIndex((ed) => ed.id === educationId);
        const detailIdx = resumeData.education[educationIdx]?.details?.findIndex((detail) => detail.id === detailId) ?? -1;
        const detailPath = educationIdx >= 0 && detailIdx >= 0 ? `education.${resumeData.education[educationIdx].id}.details.${detailIdx}` : null;

        if (!value.trim()) {
            removeEducationDetail(educationId, detailId);
            if (detailPath) {
                setFocusedField((current) => current === detailPath ? null : current);
                setHoveredField((current) => current === detailPath ? null : current);
            }
            return;
        }

        setResumeData((prev) => ({
            ...prev,
            education: (prev.education || []).map((ed) =>
                ed.id === educationId
                    ? {
                        ...ed,
                        details: (ed.details || []).map((detail) =>
                            detail.id === detailId ? { ...detail, text: value } : detail
                        )
                    }
                    : ed
            )
        }));
    };

    const addSkillCategory = () => {
        setResumeData((prev) => ({
            ...prev,
            skills: [
                ...(prev.skills || []),
                { id: makeId(), category: "Skills", items: [], rawItems: "" }
            ]
        }));
    };

    const updateSkillCategoryName = (id: string, value: string) => {
        setResumeData((prev) => ({
            ...prev,
            skills: (prev.skills || []).map((skill) =>
                skill.id === id ? { ...skill, category: value } : skill
            )
        }));
    };

    const updateSkillCategoryItems = (id: string, value: string) => {
        const items = parseSkillItems(value);
        setResumeData((prev) => ({
            ...prev,
            skills: (prev.skills || []).map((skill) =>
                skill.id === id ? { ...skill, items, rawItems: value } : skill
            )
        }));
    };

    const removeSkillCategory = (id: string) => {
        setResumeData((prev) => ({
            ...prev,
            skills: (prev.skills || []).filter((skill) => skill.id !== id)
        }));
    };

    return {
        resumeData,
        setResumeData,
        hoveredDeleteIndex,
        setHoveredDeleteIndex,
        hoveredContactField,
        setHoveredContactField,
        focusedContactField,
        setFocusedContactField,
        hoveredNameSection,
        setHoveredNameSection,
        focusedNameSection,
        setFocusedNameSection,
        hoveredSummary,
        setHoveredSummary,
        focusedSummary,
        setFocusedSummary,
        isSummaryImproveHovered,
        setIsSummaryImproveHovered,
        hoveredField,
        setHoveredField,
        focusedField,
        setFocusedField,
        hoveredJobId,
        setHoveredJobId,
        hoveredExperienceImproveId,
        setHoveredExperienceImproveId,
        hoveredExperienceClearId,
        setHoveredExperienceClearId,
        hoveredExperienceDeleteId,
        setHoveredExperienceDeleteId,
        hoveredEducationDeleteId,
        setHoveredEducationDeleteId,
        hoveredSkillDeleteId,
        setHoveredSkillDeleteId,
        activeDocumentSection,
        setActiveDocumentSection,
        updateField,
        addCustomContactField,
        updateCustomContactField,
        removeCustomContactField,
        removeStandardContactField,
        updateExperienceField,
        insertExperienceAt,
        removeExperience,
        clearExperience,
        addBulletWithText,
        updateBulletText,
        removeBullet,
        updateEducationField,
        addEducation,
        removeEducation,
        addEducationDetailWithText,
        removeEducationDetail,
        updateEducationDetailText,
        addSkillCategory,
        updateSkillCategoryName,
        updateSkillCategoryItems,
        removeSkillCategory
    };
};
