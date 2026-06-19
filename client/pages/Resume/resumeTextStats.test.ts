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
});
