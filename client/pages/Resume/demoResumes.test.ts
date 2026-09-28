import { describe, expect, it } from "vitest";
import { createDemoResumeData } from "./demoResumes";

describe("demo resume tags", () => {
  it.each(["full-stack", "frontend", "backend"] as const)(
    "assigns one valid, single-word tag to every %s experience bullet",
    (kind) => {
      const resume = createDemoResumeData(kind);
      const tagsById = new Map(
        (resume.tagLibrary ?? []).map((tag) => [tag.id, tag])
      );
      const bullets = resume.experience.flatMap(
        (experience) => experience.bullets
      );

      expect(bullets).not.toHaveLength(0);
      bullets.forEach((bullet) => {
        expect(bullet.tagIds).toHaveLength(1);
        const tag = tagsById.get(bullet.tagIds![0]);
        expect(tag).toBeDefined();
        expect(tag?.name).toMatch(/^\S+$/);
      });
    }
  );
});
