import type {
    ContactFieldKey,
    EducationItem,
    ExperienceItem,
    ResumeData,
    ResumeDataInput,
    ResumeSectionKey,
    ResumeSectionTitles,
    ResumeTag,
    SkillCategory
} from "./types";
import { defaultResumeFormatting, normalizeResumeFormatting } from "./formatting";

export const makeId = () => Math.random().toString(36).slice(2, 10);

export const hasText = (value: unknown) => String(value ?? "").trim().length > 0;

export const DEFAULT_SECTION_TITLES: ResumeSectionTitles = {
    summary: "Professional Summary",
    experience: "Work Experience",
    education: "Education",
    skills: "Skills"
};

export const TAG_COLOR_TOKENS = [
    "tag-teal",
    "tag-orange",
    "tag-purple",
    "tag-cyan",
    "tag-rose",
    "tag-emerald",
    "tag-fuchsia",
    "tag-violet",
    "tag-pink",
    "tag-amber",
    "tag-blue"
] as const;

export const TAG_COLOR_STYLES: Record<string, { color: string; background: string }> = {
    "tag-teal": { color: "#0f766e", background: "#ccfbf1" },
    "tag-orange": { color: "#c2410c", background: "#ffedd5" },
    "tag-purple": { color: "#7e22ce", background: "#f3e8ff" },
    "tag-cyan": { color: "#0e7490", background: "#cffafe" },
    "tag-rose": { color: "#be123c", background: "#ffe4e6" },
    "tag-emerald": { color: "#047857", background: "#d1fae5" },
    "tag-fuchsia": { color: "#a21caf", background: "#fae8ff" },
    "tag-violet": { color: "#4f46e5", background: "#e0e7ff" },
    "tag-pink": { color: "#db2777", background: "#fce7f3" },
    "tag-amber": { color: "#b45309", background: "#fef3c7" },
    "tag-blue": { color: "#1d4ed8", background: "#dbeafe" }
};

const LEGACY_GRAY_TAG_COLOR_REPLACEMENTS: Record<string, string> = {
    "tag-slate": "tag-emerald",
    "tag-zinc": "tag-amber",
    "tag-stone": "tag-blue"
};

export const normalizeTagColorToken = (value: unknown, fallbackIndex = 0): string => {
    const token = String(value || "");
    if (TAG_COLOR_STYLES[token]) return token;
    if (LEGACY_GRAY_TAG_COLOR_REPLACEMENTS[token]) return LEGACY_GRAY_TAG_COLOR_REPLACEMENTS[token];
    return TAG_COLOR_TOKENS[fallbackIndex % TAG_COLOR_TOKENS.length];
};

export const getTagColorStyle = (value: unknown): { color: string; background: string } =>
    TAG_COLOR_STYLES[normalizeTagColorToken(value)];

export const normalizeTagSlug = (value: string): string =>
    value.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");

export const getSectionTitle = (
    data: Pick<ResumeData, "sectionTitles">,
    section: ResumeSectionKey
): string => data.sectionTitles?.[section]?.trim() || DEFAULT_SECTION_TITLES[section];

const normalizeSectionTitles = (titles: unknown): ResumeSectionTitles => {
    const source = titles && typeof titles === "object"
        ? titles as Partial<ResumeSectionTitles>
        : {};
    return {
        summary: String(source.summary ?? DEFAULT_SECTION_TITLES.summary),
        experience: String(source.experience ?? DEFAULT_SECTION_TITLES.experience),
        education: String(source.education ?? DEFAULT_SECTION_TITLES.education),
        skills: String(source.skills ?? DEFAULT_SECTION_TITLES.skills)
    };
};

const normalizeTagLibrary = (tags: unknown): ResumeTag[] => {
    if (!Array.isArray(tags)) return [];
    return tags
        .map((tag, index): ResumeTag | null => {
            if (!tag || typeof tag !== "object") return null;
            const candidate = tag as Partial<ResumeTag>;
            const name = String(candidate.name ?? "").trim();
            const slug = normalizeTagSlug(String(candidate.slug || name));
            if (!name || !slug) return null;
            return {
                id: String(candidate.id || `tag-${index}-${slug}`),
                name,
                slug,
                colorToken: normalizeTagColorToken(candidate.colorToken, index),
                createdAt: String(candidate.createdAt || new Date(0).toISOString()),
                archivedAt: candidate.archivedAt ?? null
            };
        })
        .filter((tag): tag is ResumeTag => Boolean(tag));
};

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
    formatting: defaultResumeFormatting(),
    sectionTitles: { ...DEFAULT_SECTION_TITLES },
    tagLibrary: []
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
                    ? exp.bullets
                        .filter((bullet) => String(bullet.text || "").trim())
                        .map((bullet) => ({
                            ...bullet,
                            tagIds: Array.isArray(bullet.tagIds)
                                ? bullet.tagIds.map(String)
                                : []
                        }))
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
        formatting: normalizeResumeFormatting(parsed?.formatting),
        sectionTitles: normalizeSectionTitles(parsed?.sectionTitles),
        tagLibrary: normalizeTagLibrary(parsed?.tagLibrary)
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
        skills: normalizeSkillCategoriesForPayload(normalized.skills),
        sectionTitles: normalizeSectionTitles(normalized.sectionTitles),
        tagLibrary: normalizeTagLibrary(normalized.tagLibrary)
    };
};
