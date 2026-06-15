import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditableSectionTitle } from "./EditableSectionTitle";
import { ExperienceBulletTags } from "./ExperienceBulletTags";
import { InlineBulletComposer } from "./InlineBulletComposer";

describe("resume editor metadata controls", () => {
    it("edits a section display title without changing its section key", () => {
        const onChange = vi.fn();
        const onFocusChange = vi.fn();
        render(
            <EditableSectionTitle
                section="experience"
                title="Engineering Experience"
                fallbackTitle="Work Experience"
                isEditing
                className="heading"
                style={{}}
                onChange={onChange}
                onFocusChange={onFocusChange}
            />
        );

        const input = screen.getByLabelText("Work Experience section title");
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "Platform Experience" } });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(onFocusChange).toHaveBeenCalledWith("sectionTitles.experience");
        expect(onChange).toHaveBeenCalledWith("Platform Experience");
    });

    it("keeps composer text local until Enter commits it", () => {
        const onCommit = vi.fn();
        const onFocusChange = vi.fn();
        render(
            <InlineBulletComposer
                placeholder="Add concentration"
                className=""
                style={{}}
                focusPath="education.edu1.composer"
                onCommit={onCommit}
                onFocusChange={onFocusChange}
            />
        );

        const input = screen.getByPlaceholderText("Add concentration");
        fireEvent.change(input, { target: { value: "Distributed Systems" } });
        expect(onCommit).not.toHaveBeenCalled();

        fireEvent.keyDown(input, { key: "Enter" });
        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit).toHaveBeenCalledWith("Distributed Systems");
        expect(input).toHaveValue("");
    });

    it("suggests reusable similar tags and allows explicit creation", () => {
        const onToggleTag = vi.fn();
        const onCreateTag = vi.fn();
        render(
            <ExperienceBulletTags
                bulletId="bullet-1"
                tagIds={[]}
                tags={[
                    {
                        id: "tag-1",
                        name: "Frontend",
                        slug: "frontend",
                        colorToken: "tag-purple",
                        createdAt: "2026-01-01T00:00:00.000Z"
                    }
                ]}
                isEditing
                focusPath="experience.0.bullets.0.tags"
                textStyle={{ fontFamily: "Poppins" }}
                onSectionHoverChange={vi.fn()}
                onToggleTag={onToggleTag}
                onCreateTag={onCreateTag}
                onDeleteTag={vi.fn()}
                onPreviewTag={vi.fn()}
                onFocusChange={vi.fn()}
            />
        );

        fireEvent.click(screen.getByLabelText("Edit bullet tags"));
        expect(document.querySelector('[data-tag-menu-placement="canvas-left"]')).toBeTruthy();
        const input = screen.getByLabelText("Tag name");
        fireEvent.change(input, { target: { value: "front-end" } });

        fireEvent.click(screen.getByLabelText("Add Frontend tag"));
        expect(onToggleTag).toHaveBeenCalledWith("tag-1");

        fireEvent.click(screen.getByLabelText("Edit bullet tags"));
        const reopenedInput = screen.getByLabelText("Tag name");
        fireEvent.change(reopenedInput, { target: { value: "frontends" } });
        fireEvent.click(screen.getByLabelText("Create frontends tag"));
        expect(onCreateTag).toHaveBeenCalledWith("frontends");
    });

    it("renders selected tags as colored text and active menu rows with a delete action", () => {
        render(
            <ExperienceBulletTags
                bulletId="bullet-1"
                tagIds={["tag-1"]}
                tags={[
                    {
                        id: "tag-1",
                        name: "Backend",
                        slug: "backend",
                        colorToken: "tag-teal",
                        createdAt: "2026-01-01T00:00:00.000Z"
                    }
                ]}
                isEditing
                focusPath="experience.0.bullets.0.tags"
                textStyle={{ fontFamily: "Poppins" }}
                onSectionHoverChange={vi.fn()}
                onToggleTag={vi.fn()}
                onCreateTag={vi.fn()}
                onDeleteTag={vi.fn()}
                onPreviewTag={vi.fn()}
                onFocusChange={vi.fn()}
            />
        );

        const label = screen.getByText("Backend");
        expect(label.parentElement).toHaveStyle({ "--resume-tag-color": "#0f766e", "--resume-tag-bg": "#0f766e" });
        expect(label.parentElement).toHaveClass("resume-tag-label-active");

        fireEvent.click(screen.getByLabelText("Edit bullet tags"));
        expect(screen.getByLabelText("Remove Backend tag")).toBeTruthy();
    });

    it("does not render tag controls in clean mode", () => {
        const { container } = render(
            <ExperienceBulletTags
                bulletId="bullet-1"
                tagIds={["tag-1"]}
                tags={[
                    {
                        id: "tag-1",
                        name: "Backend",
                        slug: "backend",
                        colorToken: "tag-teal",
                        createdAt: "2026-01-01T00:00:00.000Z"
                    }
                ]}
                isEditing={false}
                focusPath="experience.0.bullets.0.tags"
                textStyle={{ fontFamily: "Poppins" }}
                onSectionHoverChange={vi.fn()}
                onToggleTag={vi.fn()}
                onCreateTag={vi.fn()}
                onDeleteTag={vi.fn()}
                onPreviewTag={vi.fn()}
                onFocusChange={vi.fn()}
            />
        );

        expect(container).toBeEmptyDOMElement();
    });
});
