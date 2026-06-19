import { buildResumeRenderModel } from "./rendering/renderModel";
import { DEFAULT_SECTION_TITLES, getSkillItemsText, getTextStats } from "./resumeData";
import type { ResumeData } from "./types";

export type ResumeTextStatContext = {
    label: string;
    chars: number;
    words: number;
};

const withLabel = (label: string, value?: string): ResumeTextStatContext => ({
    label,
    ...getTextStats(value)
});

export const getResumeDocumentTextStats = (resumeData: ResumeData) => {
    const model = buildResumeRenderModel(resumeData);
    const text = [
        model.fullName,
        ...model.contactRows.flat(),
        model.summary?.title,
        model.summary?.text,
        model.experience[0]?.title,
        ...model.experience.flatMap((experience) => [
            ...experience.meta.map((field) => field.value),
            ...experience.dates,
            ...experience.bullets.map((bullet) => bullet.text)
        ]),
        model.education[0]?.title,
        ...model.education.flatMap((education) => [
            ...education.meta.map((field) => field.value),
            ...education.dates,
            ...education.details.map((detail) => detail.text)
        ]),
        model.skills[0]?.title,
        ...model.skills.flatMap((skill) => [
            skill.category,
            ...skill.items
        ])
    ].filter(Boolean).join(" ");

    return getTextStats(text);
};

export const getResumeFieldTextStats = (
    resumeData: ResumeData,
    path: string | null
): ResumeTextStatContext | null => {
    if (!path) return null;

    if (path === "fullName") return withLabel("Name", resumeData.fullName);
    if (path === "summary") return withLabel("Summary", resumeData.summary);

    if (path.startsWith("contact.")) {
        const key = path.slice("contact.".length);
        if (key.startsWith("custom_")) {
            const index = Number.parseInt(key.slice("custom_".length), 10);
            return withLabel(
                resumeData.customContact?.[index]?.label || "Contact",
                resumeData.customContact?.[index]?.value
            );
        }
        return withLabel("Contact", resumeData[key as keyof ResumeData] as string | undefined);
    }

    if (path.startsWith("sectionTitles.")) {
        const section = path.split(".")[1] as keyof NonNullable<ResumeData["sectionTitles"]>;
        return withLabel(
            "Section title",
            resumeData.sectionTitles?.[section] || DEFAULT_SECTION_TITLES[section]
        );
    }

    const parts = path.split(".");
    if (parts[0] === "experience") {
        const experience = resumeData.experience[Number(parts[1])];
        if (!experience) return null;
        if (parts[2] === "bullets") {
            return withLabel("Experience bullet", experience.bullets[Number(parts[3])]?.text);
        }
        return withLabel("Experience field", experience[parts[2] as keyof typeof experience] as string | undefined);
    }

    if (parts[0] === "education") {
        const education = resumeData.education.find((item) => item.id === parts[1]);
        if (!education) return null;
        if (parts[2] === "details") {
            return withLabel("Education detail", education.details?.[Number(parts[3])]?.text);
        }
        return withLabel("Education field", education[parts[2] as keyof typeof education] as string | undefined);
    }

    if (parts[0] === "skills") {
        const skill = resumeData.skills?.find((item) => item.id === parts[1]);
        if (!skill) return null;
        return parts[2] === "category"
            ? withLabel("Skill category", skill.category)
            : withLabel("Skills", getSkillItemsText(skill));
    }

    return null;
};
