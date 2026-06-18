import type { ResumeBullet, ResumeData } from "../types";
import { getSectionTitle, hasText } from "../resumeData";

export type ResumeRenderMetaTone = "primary" | "secondary" | "tertiary";

export type ResumeRenderMetaField = {
    value: string;
    tone: ResumeRenderMetaTone;
};

export type ResumeRenderBullet = Pick<ResumeBullet, "id" | "text">;

export type ResumeRenderExperience = {
    id: string;
    title: string;
    meta: ResumeRenderMetaField[];
    dates: string[];
    bullets: ResumeRenderBullet[];
};

export type ResumeRenderEducation = {
    id: string;
    title: string;
    meta: ResumeRenderMetaField[];
    dates: string[];
    details: ResumeRenderBullet[];
};

export type ResumeRenderSkill = {
    id: string;
    title: string;
    category: string;
    items: string[];
};

export type ResumeRenderModel = {
    fullName: string;
    contactRows: string[][];
    summary: {
        title: string;
        text: string;
    } | null;
    experience: ResumeRenderExperience[];
    education: ResumeRenderEducation[];
    skills: ResumeRenderSkill[];
};

const trimmed = (value: unknown) => String(value ?? "").trim();

const buildContactRows = (resumeData: ResumeData) => {
    const hiddenContactFields = new Set(resumeData.hiddenContactFields || []);
    const contactItems = [
        !hiddenContactFields.has("location") ? resumeData.location : "",
        !hiddenContactFields.has("phone") ? resumeData.phone : "",
        !hiddenContactFields.has("email") ? resumeData.email : "",
        !hiddenContactFields.has("linkedin") ? resumeData.linkedin : "",
        !hiddenContactFields.has("website") ? resumeData.website : "",
        !hiddenContactFields.has("github") ? resumeData.github : "",
        ...(resumeData.customContact || []).map((field) => field.value)
    ].map(trimmed).filter(Boolean);

    const rows: string[][] = [];
    for (let index = 0; index < contactItems.length; index += 3) {
        rows.push(contactItems.slice(index, index + 3));
    }
    return rows;
};

export const buildResumeRenderModel = (resumeData: ResumeData): ResumeRenderModel => ({
    fullName: trimmed(resumeData.fullName) || "Your Name",
    contactRows: buildContactRows(resumeData),
    summary: hasText(resumeData.summary)
        ? {
            title: getSectionTitle(resumeData, "summary"),
            text: trimmed(resumeData.summary)
        }
        : null,
    experience: (resumeData.experience || []).flatMap((experience) => {
        const meta = [
            { value: trimmed(experience.jobTitle), tone: "primary" as const },
            { value: trimmed(experience.company), tone: "secondary" as const },
            { value: trimmed(experience.location), tone: "tertiary" as const }
        ].filter((field) => Boolean(field.value));
        const dates = [experience.startDate, experience.endDate].map(trimmed).filter(Boolean);
        const bullets = (experience.bullets || [])
            .filter((bullet) => hasText(bullet.text))
            .map((bullet) => ({ id: bullet.id, text: trimmed(bullet.text) }));
        if (!meta.length && !dates.length && !bullets.length) return [];
        return [{
            id: experience.id,
            title: getSectionTitle(resumeData, "experience"),
            meta,
            dates,
            bullets
        }];
    }),
    education: (resumeData.education || []).flatMap((education) => {
        const meta = [
            { value: trimmed(education.degree), tone: "primary" as const },
            { value: trimmed(education.school), tone: "secondary" as const }
        ].filter((field) => Boolean(field.value));
        const dates = [education.startDate, education.endDate].map(trimmed).filter(Boolean);
        const details = (education.details || [])
            .filter((detail) => hasText(detail.text))
            .map((detail) => ({ id: detail.id, text: trimmed(detail.text) }));
        if (!meta.length && !dates.length && !details.length) return [];
        return [{
            id: education.id,
            title: getSectionTitle(resumeData, "education"),
            meta,
            dates,
            details
        }];
    }),
    skills: (resumeData.skills || []).flatMap((skill) => {
        const category = trimmed(skill.category);
        const items = (skill.items || []).map(trimmed).filter(Boolean);
        if (!category && !items.length) return [];
        return [{
            id: skill.id,
            title: getSectionTitle(resumeData, "skills"),
            category,
            items
        }];
    })
});
