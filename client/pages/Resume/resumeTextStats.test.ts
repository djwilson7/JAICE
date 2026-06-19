import { describe, expect, it } from "vitest";
import { getResumeDocumentTextStats, getResumeFieldTextStats } from "./resumeTextStats";

const resumeData = {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    summary: "Built analytical systems",
    experience: [{
        id: "exp-1",
        jobTitle: "Engineer",
        bullets: [{ id: "bullet-1", text: "Improved reliable tooling" }]
    }],
    education: [],
    skills: [{
        id: "skill-1",
        category: "Languages",
        items: ["TypeScript", "Python"]
    }]
} as any;

describe("resumeTextStats", () => {
    it("counts the normalized rendered document text", () => {
        const stats = getResumeDocumentTextStats(resumeData);
        expect(stats.chars).toBeGreaterThan(0);
        expect(stats.words).toBeGreaterThan(10);
    });

    it("returns contextual statistics for the hovered field", () => {
        expect(getResumeFieldTextStats(
            resumeData,
            "experience.0.bullets.0"
        )).toEqual({
            label: "Experience bullet",
            chars: 23,
            words: 3
        });
        expect(getResumeFieldTextStats(resumeData, "skills.skill-1.items")).toEqual({
            label: "Skills",
            chars: 17,
            words: 2
        });
    });

    it("handles all other field paths in getResumeFieldTextStats", () => {
        const fullResume = {
            fullName: "Ada Lovelace",
            email: "ada@example.com",
            summary: "Pioneer",
            customContact: [{ label: "Portfolio", value: "portfolio.com" }],
            sectionTitles: { experience: "My Jobs" },
            experience: [{
                id: "exp-1",
                jobTitle: "Engineer",
                bullets: [{ id: "bullet-1", text: "Tooling" }]
            }],
            education: [{
                id: "edu-1",
                degree: "BS",
                details: [{ id: "detail-1", text: "Math" }]
            }],
            skills: [{
                id: "skill-1",
                category: "Languages",
                items: ["TS"]
            }]
        } as any;

        // null path
        expect(getResumeFieldTextStats(fullResume, null)).toBeNull();
        // unrecognized path
        expect(getResumeFieldTextStats(fullResume, "invalid.path")).toBeNull();

        // fullName
        expect(getResumeFieldTextStats(fullResume, "fullName")).toEqual({
            label: "Name",
            chars: 11,
            words: 2
        });

        // summary
        expect(getResumeFieldTextStats(fullResume, "summary")).toEqual({
            label: "Summary",
            chars: 7,
            words: 1
        });

        // contact standard
        expect(getResumeFieldTextStats(fullResume, "contact.email")).toEqual({
            label: "Contact",
            chars: 15,
            words: 1
        });

        // contact custom
        expect(getResumeFieldTextStats(fullResume, "contact.custom_0")).toEqual({
            label: "Portfolio",
            chars: 13,
            words: 1
        });
        expect(getResumeFieldTextStats(fullResume, "contact.custom_1")).toEqual({
            label: "Contact",
            chars: 0,
            words: 0
        });

        // sectionTitles
        expect(getResumeFieldTextStats(fullResume, "sectionTitles.experience")).toEqual({
            label: "Section title",
            chars: 6,
            words: 2
        });

        // experience fields
        expect(getResumeFieldTextStats(fullResume, "experience.0.jobTitle")).toEqual({
            label: "Experience field",
            chars: 8,
            words: 1
        });
        expect(getResumeFieldTextStats(fullResume, "experience.1.jobTitle")).toBeNull();

        // education
        expect(getResumeFieldTextStats(fullResume, "education.edu-1.degree")).toEqual({
            label: "Education field",
            chars: 2,
            words: 1
        });
        expect(getResumeFieldTextStats(fullResume, "education.edu-1.details.0")).toEqual({
            label: "Education detail",
            chars: 4,
            words: 1
        });
        expect(getResumeFieldTextStats(fullResume, "education.edu-2.degree")).toBeNull();

        // skills category
        expect(getResumeFieldTextStats(fullResume, "skills.skill-1.category")).toEqual({
            label: "Skill category",
            chars: 9,
            words: 1
        });
        expect(getResumeFieldTextStats(fullResume, "skills.skill-2.category")).toBeNull();
    });
});
