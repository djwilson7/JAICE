import type { ContactFieldKey, EducationItem, ExperienceItem, ResumeData, ResumeDataInput, SkillCategory } from "./types";
import { defaultResumeFormatting, normalizeResumeFormatting } from "./formatting";

export const makeId = () => Math.random().toString(36).slice(2, 10);

export const hasText = (value: unknown) => String(value ?? "").trim().length > 0;

export const parseSkillItems = (input: string): string[] => {
    return input
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
};

export const normalizeTextList = (items: unknown): string[] => {
    if (!Array.isArray(items)) return [];
    return items
        .map((item) => String(item || "").trim())
        .filter(Boolean);
};

export const formatSkillItemsForInput = (items: unknown): string => normalizeTextList(items).join(", ");

export const getSkillItemsText = (skill: Partial<SkillCategory> | null | undefined): string => {
    return typeof skill?.rawItems === "string" ? skill.rawItems : formatSkillItemsForInput(skill?.items);
};

export const defaultSkillCategories = (): SkillCategory[] => [
    { id: makeId(), category: "Languages", items: ["Python", "TypeScript", "Go"] },
    { id: makeId(), category: "Frameworks", items: ["FastAPI", "React", "Next.js"] },
    { id: makeId(), category: "Cloud/DevOps", items: ["AWS", "Docker", "Kubernetes", "PostgreSQL"] },
    { id: makeId(), category: "Tools", items: ["Git", "Kafka", "Jest"] }
];

export const normalizeSkillCategories = (skills: unknown): SkillCategory[] => {
    if (!Array.isArray(skills)) return [];

    if (skills.every((skill) => typeof skill === "string")) {
        const items = normalizeTextList(skills);
        return items.length ? [{ id: "skills-default", category: "Skills", items, rawItems: formatSkillItemsForInput(items) }] : [];
    }

    return skills
        .map((skill, index): SkillCategory | null => {
            const category = skill && typeof skill === "object" ? skill as Partial<SkillCategory> : null;
            if (!category) return null;
            const rawItems = getSkillItemsText(category);
            const items = parseSkillItems(rawItems);
            const normalizedCategory = String(category?.category ?? "Skills").trim();

            if (!normalizedCategory && items.length === 0) return null;

            return {
                id: String(category?.id || `skills-${index}`),
                category: normalizedCategory,
                items,
                rawItems
            };
        })
        .filter((skill): skill is SkillCategory => Boolean(skill));
};

export const getTextStats = (text?: string) => {
    const value = text || "";
    return {
        chars: value.length,
        words: value.split(/\s+/).filter(Boolean).length
    };
};

export const defaultResumeData = (): ResumeData => ({
    fullName: "ALEXANDER WRIGHT",
    email: "alexander.wright@email.com",
    phone: "(555) 342-8910",
    location: "San Francisco, CA",
    website: "https://alexwright.dev",
    linkedin: "linkedin.com/in/alexwright",
    github: "github.com/alexwright",
    summary: "Strategic and results-driven Software Architect with 8+ years of experience pioneering distributed systems, cloud migrations, and high-performance microservices. Adept at steering cross-functional engineering teams to accelerate feature delivery, minimize latency, and de-risk core technical milestones.",
    experience: [
        {
            id: makeId(),
            jobTitle: "Lead Software Architect",
            company: "Sentry Systems",
            location: "San Francisco, CA",
            startDate: "Mar 2021",
            endDate: "Present",
            bullets: [
                { id: makeId(), text: "Engineered high-throughput event streaming architecture using Python, Kafka, and FastAPI, slashing endpoint latency by 35% and increasing data ingestion capacity to 10M+ daily events." },
                { id: makeId(), text: "Spearheaded the migration of legacy monolithic architecture to scalable Kubernetes clusters, saving over $240K annually in infrastructure overhead while guaranteeing 99.99% system availability." },
                { id: makeId(), text: "Pioneered cross-functional design sprints and technical roadmap outlines, de-risking three consecutive quarterly releases and improving team sprint velocity by 25%." }
            ]
        }
    ],
    education: [
        {
            id: makeId(),
            school: "University of California, Berkeley",
            degree: "M.S. Computer Science & Engineering",
            startDate: "Sep 2016",
            endDate: "Jun 2018",
            details: []
        }
    ],
    skills: defaultSkillCategories(),
    customContact: [],
    hiddenContactFields: [],
    formatting: defaultResumeFormatting()
});

export const normalizeResumeData = (data?: ResumeDataInput | string | null): ResumeData => {
    let parsed = data as ResumeDataInput | null | undefined;
    if (typeof data === "string") {
        try {
            parsed = JSON.parse(data) as ResumeDataInput;
        } catch (e) {
            console.error("Failed to parse resume_data string:", e);
        }
    }
    return {
        fullName: parsed?.fullName || "",
        email: parsed?.email || "",
        phone: parsed?.phone || "",
        location: parsed?.location || "",
        website: parsed?.website || "",
        linkedin: parsed?.linkedin || "",
        github: parsed?.github || "",
        summary: parsed?.summary || "",
        experience: Array.isArray(parsed?.experience)
            ? parsed.experience.map((exp: ExperienceItem) => ({
                ...exp,
                bullets: Array.isArray(exp.bullets)
                    ? exp.bullets.filter((bullet) => String(bullet.text || "").trim())
                    : []
            }))
            : [],
        education: Array.isArray(parsed?.education)
            ? parsed.education.map((ed: EducationItem) => ({
                ...ed,
                details: Array.isArray(ed.details)
                    ? ed.details.filter((detail) => hasText(detail.text))
                    : []
            }))
            : [],
        skills: normalizeSkillCategories(parsed?.skills),
        customContact: Array.isArray(parsed?.customContact) ? parsed.customContact : [],
        hiddenContactFields: Array.isArray(parsed?.hiddenContactFields)
            ? parsed.hiddenContactFields.filter((field: string): field is ContactFieldKey =>
                ["location", "phone", "email", "linkedin", "website", "github"].includes(field)
            )
            : [],
        formatting: normalizeResumeFormatting(parsed?.formatting)
    };
};

export const normalizeSkillCategoriesForPayload = (skills: unknown): SkillCategory[] => {
    return normalizeSkillCategories(skills)
        .map((skill) => {
            return {
                id: skill.id,
                category: skill.category,
                items: parseSkillItems(getSkillItemsText(skill))
            };
        })
        .filter((skill) => hasText(skill.category) || skill.items.length > 0);
};

export const normalizeResumeDataForPayload = (data?: ResumeDataInput | string | null): ResumeData => {
    const normalized = normalizeResumeData(data);
    return {
        ...normalized,
        education: (normalized.education || []).map((ed) => ({
            ...ed,
            details: Array.isArray(ed.details)
                ? ed.details.filter((detail) => hasText(detail.text))
                : []
        })),
        skills: normalizeSkillCategoriesForPayload(normalized.skills)
    };
};
