import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type {
    ContactFieldKey,
    DocumentSectionId,
    EducationItem,
    ExperienceItem,
    ResumeData,
    ResumeSectionKey
} from "../types";
import {
    DEFAULT_SECTION_TITLES,
    TAG_COLOR_TOKENS,
    defaultResumeData,
    makeId,
    normalizeTagSlug,
    parseSkillItems
} from "../resumeData";

export const useResumeDocumentEditing = () => {
    const experienceTagRetentionMs = 5500;
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
    const [hoveredEducationClearId, setHoveredEducationClearId] = useState<string | null>(null);
    const [hoveredEducationDeleteId, setHoveredEducationDeleteId] = useState<string | null>(null);
    const [hoveredSkillDeleteId, setHoveredSkillDeleteId] = useState<string | null>(null);
    const [hoveredDocumentSection, setHoveredDocumentSection] = useState<DocumentSectionId | null>(null);
    const [retainedDocumentSection, setRetainedDocumentSection] = useState<DocumentSectionId | null>(null);
    const retainSectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hoverExitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearRetainedSectionTimer = useCallback(() => {
        if (retainSectionTimeoutRef.current) {
            clearTimeout(retainSectionTimeoutRef.current);
            retainSectionTimeoutRef.current = null;
        }
    }, []);

    const clearHoverExitTimer = useCallback(() => {
        if (hoverExitTimeoutRef.current) {
            clearTimeout(hoverExitTimeoutRef.current);
            hoverExitTimeoutRef.current = null;
        }
    }, []);

    const retainExperienceSection = useCallback(() => {
        clearRetainedSectionTimer();
        setRetainedDocumentSection("experience");
        retainSectionTimeoutRef.current = setTimeout(() => {
            setRetainedDocumentSection(null);
            retainSectionTimeoutRef.current = null;
        }, experienceTagRetentionMs);
    }, [clearRetainedSectionTimer]);

    useEffect(() => () => {
        clearRetainedSectionTimer();
        clearHoverExitTimer();
    }, [clearHoverExitTimer, clearRetainedSectionTimer]);

    useEffect(() => {
        if (hoveredDocumentSection) {
            clearRetainedSectionTimer();
            setRetainedDocumentSection(null);
        }
    }, [clearRetainedSectionTimer, hoveredDocumentSection]);

    const focusedDocumentSection = useMemo<DocumentSectionId | null>(() => {
        if (focusedNameSection || focusedContactField) return "header";
        if (focusedSummary) return "summary";
        if (!focusedField) return null;
        if (focusedField.startsWith("experience.")) return "experience";
        if (focusedField.startsWith("education.")) return "education";
        if (focusedField.startsWith("skills.")) return "skills";
        if (focusedField.startsWith("sectionTitles.")) {
            const section = focusedField.split(".")[1] as ResumeSectionKey | undefined;
            return section || null;
        }
        return null;
    }, [
        focusedContactField,
        focusedField,
        focusedNameSection,
        focusedSummary
    ]);
    const activeDocumentSection = focusedDocumentSection ?? hoveredDocumentSection ?? retainedDocumentSection;
    const setActiveDocumentSection = useCallback<Dispatch<SetStateAction<DocumentSectionId | null>>>((value) => {
        setHoveredDocumentSection((current) => {
            const next = typeof value === "function"
                ? (value as (current: DocumentSectionId | null) => DocumentSectionId | null)(current)
                : value;
            if (next) {
                clearHoverExitTimer();
                clearRetainedSectionTimer();
                setRetainedDocumentSection(null);
                return next;
            }
            if (current === "experience") {
                clearHoverExitTimer();
                hoverExitTimeoutRef.current = setTimeout(() => {
                    setHoveredDocumentSection((latest) => latest === "experience" ? null : latest);
                    hoverExitTimeoutRef.current = null;
                }, 150);
                return current;
            }
            return next;
        });
    }, [clearHoverExitTimer, clearRetainedSectionTimer]);

    const updateField = (field: keyof ResumeData, value: string) => {
        setResumeData((prev) => ({ ...prev, [field]: value }));
    };

    const updateSectionTitle = (section: ResumeSectionKey, value: string) => {
        setResumeData((prev) => ({
            ...prev,
            sectionTitles: {
                ...DEFAULT_SECTION_TITLES,
                ...(prev.sectionTitles || {}),
                [section]: value
            }
        }));
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

        setResumeData((prev) => ({
            ...prev,
            experience: (prev.experience || []).map((exp) => {
                if (exp.id === expId) {
                    return {
                        ...exp,
                        bullets: [...(exp.bullets || []), { id: makeId(), text: normalizedText, tagIds: [] }]
                    };
                }
                return exp;
            })
        }));
    };

    const insertBulletAfter = (expId: string, bulletId: string) => {
        const expIdx = (resumeData.experience || []).findIndex((exp) => exp.id === expId);
        const bulletIdx = resumeData.experience?.[expIdx]?.bullets?.findIndex((bullet) => bullet.id === bulletId) ?? -1;
        if (expIdx < 0 || bulletIdx < 0) return;

        const newBulletId = makeId();
        setResumeData((prev) => ({
            ...prev,
            experience: (prev.experience || []).map((exp) => {
                if (exp.id !== expId) return exp;
                const bullets = [...(exp.bullets || [])];
                bullets.splice(bulletIdx + 1, 0, { id: newBulletId, text: "", tagIds: [] });
                return { ...exp, bullets };
            })
        }));
        setFocusedField(`experience.${expIdx}.bullets.${bulletIdx + 1}`);
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

    const removeBulletIfEmpty = (expId: string, bulletId: string) => {
        const bullet = (resumeData.experience || [])
            .find((exp) => exp.id === expId)
            ?.bullets?.find((item) => item.id === bulletId);
        if (bullet && !bullet.text.trim()) removeBullet(expId, bulletId);
    };

    const toggleBulletTag = (expId: string, bulletId: string, tagId: string) => {
        retainExperienceSection();
        setResumeData((prev) => ({
            ...prev,
            experience: (prev.experience || []).map((exp) => {
                if (exp.id !== expId) return exp;
                return {
                    ...exp,
                    bullets: (exp.bullets || []).map((bullet) => {
                        if (bullet.id !== bulletId) return bullet;
                        const tagIds = bullet.tagIds || [];
                        return {
                            ...bullet,
                            tagIds: tagIds.includes(tagId)
                                ? []
                                : [tagId]
                        };
                    })
                };
            })
        }));
    };

    const createAndAssignBulletTag = (expId: string, bulletId: string, rawName: string) => {
        const name = rawName.trim().replace(/\s+/g, "");
        const slug = normalizeTagSlug(name);
        if (!name || !slug) return;
        retainExperienceSection();

        setResumeData((prev) => {
            const library = prev.tagLibrary || [];
            const existing = library.find((tag) => tag.slug === slug);
            const tagId = existing?.id || makeId();
            const nextLibrary = existing
                ? library
                : [
                    ...library,
                    {
                        id: tagId,
                        name,
                        slug,
                        colorToken: TAG_COLOR_TOKENS[library.length % TAG_COLOR_TOKENS.length],
                        createdAt: new Date().toISOString(),
                        archivedAt: null
                    }
                ];

            return {
                ...prev,
                tagLibrary: nextLibrary,
                experience: (prev.experience || []).map((exp) => {
                    if (exp.id !== expId) return exp;
                    return {
                        ...exp,
                        bullets: (exp.bullets || []).map((bullet) => {
                            if (bullet.id !== bulletId) return bullet;
                            const tagIds = bullet.tagIds || [];
                            return {
                                ...bullet,
                                tagIds: tagIds.includes(tagId) ? tagIds : [tagId]
                            };
                        })
                    };
                })
            };
        });
    };

    const deleteBulletTag = (tagId: string) => {
        retainExperienceSection();
        setResumeData((prev) => ({
            ...prev,
            tagLibrary: (prev.tagLibrary || []).filter((tag) => tag.id !== tagId),
            experience: (prev.experience || []).map((exp) => ({
                ...exp,
                bullets: (exp.bullets || []).map((bullet) => ({
                    ...bullet,
                    tagIds: (bullet.tagIds || []).filter((id) => id !== tagId)
                }))
            }))
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

    const clearEducation = (id: string) => {
        setResumeData((prev) => ({
            ...prev,
            education: (prev.education || []).map((ed) =>
                ed.id === id
                    ? {
                        ...ed,
                        school: "",
                        degree: "",
                        startDate: "",
                        endDate: "",
                        details: []
                    }
                    : ed
            )
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

    const insertEducationDetailAfter = (educationId: string, detailId: string) => {
        const educationIdx = (resumeData.education || []).findIndex((ed) => ed.id === educationId);
        const detailIdx = resumeData.education?.[educationIdx]?.details?.findIndex((detail) => detail.id === detailId) ?? -1;
        if (educationIdx < 0 || detailIdx < 0) return;

        setResumeData((prev) => ({
            ...prev,
            education: (prev.education || []).map((ed) => {
                if (ed.id !== educationId) return ed;
                const details = [...(ed.details || [])];
                details.splice(detailIdx + 1, 0, { id: makeId(), text: "" });
                return { ...ed, details };
            })
        }));
        setFocusedField(`education.${educationId}.details.${detailIdx + 1}`);
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

    const removeEducationDetailIfEmpty = (educationId: string, detailId: string) => {
        const detail = (resumeData.education || [])
            .find((ed) => ed.id === educationId)
            ?.details?.find((item) => item.id === detailId);
        if (detail && !detail.text.trim()) removeEducationDetail(educationId, detailId);
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
        hoveredEducationClearId,
        setHoveredEducationClearId,
        hoveredEducationDeleteId,
        setHoveredEducationDeleteId,
        hoveredSkillDeleteId,
        setHoveredSkillDeleteId,
        activeDocumentSection,
        focusedDocumentSection,
        setActiveDocumentSection,
        updateField,
        updateSectionTitle,
        addCustomContactField,
        updateCustomContactField,
        removeCustomContactField,
        removeStandardContactField,
        updateExperienceField,
        insertExperienceAt,
        removeExperience,
        clearExperience,
        addBulletWithText,
        insertBulletAfter,
        updateBulletText,
        removeBulletIfEmpty,
        removeBullet,
        toggleBulletTag,
        createAndAssignBulletTag,
        deleteBulletTag,
        updateEducationField,
        addEducation,
        removeEducation,
        clearEducation,
        addEducationDetailWithText,
        insertEducationDetailAfter,
        removeEducationDetail,
        updateEducationDetailText,
        removeEducationDetailIfEmpty,
        addSkillCategory,
        updateSkillCategoryName,
        updateSkillCategoryItems,
        removeSkillCategory
    };
};
