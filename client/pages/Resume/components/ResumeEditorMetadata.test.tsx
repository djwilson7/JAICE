import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditableSectionTitle } from "./EditableSectionTitle";
import { ExperienceBulletTags } from "./ExperienceBulletTags";
import { InlineBulletComposer } from "./InlineBulletComposer";

describe("resume editor metadata controls", () => {
    it("edits a section display title without changing its section key", () => {
        const onChange = vi.fn();
        const onFocusChange = vi.fn();
        const onHoverChange = vi.fn();
        const { rerender } = render(
            <EditableSectionTitle
                section="experience"
                title="Engineering Experience"
                fallbackTitle="Work Experience"
                isEditing
                className="heading"
                style={{}}
                onChange={onChange}
                onFocusChange={onFocusChange}
                onHoverChange={onHoverChange}
            />
        );

        const input = screen.getByLabelText("Work Experience section title") as HTMLInputElement;
        input.focus();
        expect(onFocusChange).toHaveBeenCalledWith("sectionTitles.experience");

        // Rerender with a different section to trigger useEffect focus check
        rerender(
            <EditableSectionTitle
                section="summary"
                title="Engineering Experience"
                fallbackTitle="Work Experience"
                isEditing
                className="heading"
                style={{}}
                onChange={onChange}
                onFocusChange={onFocusChange}
                onHoverChange={onHoverChange}
            />
        );
        expect(onFocusChange).toHaveBeenCalledWith("sectionTitles.summary");

        fireEvent.change(input, { target: { value: "Platform Experience" } });
        fireEvent.mouseEnter(input);
        expect(onHoverChange).toHaveBeenLastCalledWith("sectionTitles.summary");

        fireEvent.mouseLeave(input);
        expect(onHoverChange).toHaveBeenLastCalledWith(null);

        fireEvent.blur(input);
        expect(onFocusChange).toHaveBeenLastCalledWith(null);

        fireEvent.keyDown(input, { key: "Enter" });
        expect(onChange).toHaveBeenCalledWith("Platform Experience");

        // Test non-editing state
        rerender(
            <EditableSectionTitle
                section="experience"
                title="  "
                fallbackTitle="Work Experience"
                isEditing={false}
                className="heading"
                style={{}}
                onChange={onChange}
                onFocusChange={onFocusChange}
                onHoverChange={onHoverChange}
            />
        );

        const h2 = screen.getByText("Work Experience");
        fireEvent.mouseEnter(h2);
        expect(onHoverChange).toHaveBeenLastCalledWith("sectionTitles.experience");

        fireEvent.mouseLeave(h2);
        expect(onHoverChange).toHaveBeenLastCalledWith(null);
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
        fireEvent.focus(input);
        expect(onFocusChange).toHaveBeenCalledWith("education.edu1.composer");

        fireEvent.change(input, { target: { value: "Distributed Systems" } });
        expect(onCommit).not.toHaveBeenCalled();

        fireEvent.keyDown(input, { key: "Enter" });
        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit).toHaveBeenCalledWith("Distributed Systems");
        expect(input).toHaveValue("");

        // Enter with empty text blurs
        fireEvent.change(input, { target: { value: "" } });
        const blurSpy = vi.spyOn(input, "blur");
        fireEvent.keyDown(input, { key: "Enter" });
        expect(blurSpy).toHaveBeenCalled();

        // Focus + Blur commits draft
        fireEvent.change(input, { target: { value: "Database Systems" } });
        fireEvent.blur(input);
        expect(onCommit).toHaveBeenLastCalledWith("Database Systems");
        expect(onFocusChange).toHaveBeenLastCalledWith(null);
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
        expect(document.querySelector('[data-tag-menu-placement^="viewport-"]')).toBeTruthy();
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

    it("renders the complete tag library inside a scrollable options viewport", () => {
        const tags = Array.from({ length: 12 }, (_, index) => ({
            id: `tag-${index}`,
            name: `Tag ${String(index + 1).padStart(2, "0")}`,
            slug: `tag${index + 1}`,
            colorToken: "tag-teal",
            createdAt: "2026-01-01T00:00:00.000Z"
        }));

        render(
            <ExperienceBulletTags
                bulletId="bullet-1"
                tagIds={[]}
                tags={tags}
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

        fireEvent.click(screen.getByLabelText("Edit bullet tags"));

        const optionsViewport = document.querySelector(".resume-tag-menu-options");
        expect(optionsViewport).toBeTruthy();
        expect(screen.getByText("Tag 01")).toBeTruthy();
        expect(screen.getByText("Tag 12")).toBeTruthy();
    });

    it("keeps the tag menu within the viewport near the bottom edge", () => {
        const originalInnerHeight = window.innerHeight;
        Object.defineProperty(window, "innerHeight", { configurable: true, value: 720 });

        const { container } = render(
            <ExperienceBulletTags
                bulletId="bullet-1"
                tagIds={[]}
                tags={[]}
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

        const root = container.querySelector("[data-bullet-tags='bullet-1']") as HTMLElement;
        vi.spyOn(root, "getBoundingClientRect").mockReturnValue({
            x: 400,
            y: 690,
            top: 690,
            right: 512,
            bottom: 710,
            left: 400,
            width: 112,
            height: 20,
            toJSON: () => ({})
        });

        fireEvent.click(screen.getByLabelText("Edit bullet tags"));

        const menu = document.querySelector(".resume-tag-menu-panel") as HTMLElement;
        Object.defineProperty(window, "innerHeight", { configurable: true, value: originalInnerHeight });

        expect(menu).toHaveClass("fixed");
        expect(menu).toHaveStyle({
            top: "488px",
            maxHeight: "400px"
        });
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

    it("handles delete action, toggle, and mouse events on tag menu options", () => {
        const onDeleteTag = vi.fn();
        const onToggleTag = vi.fn();
        const onPreviewTag = vi.fn();
        render(
            <ExperienceBulletTags
                bulletId="bullet-1"
                tagIds={[]}
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
                onToggleTag={onToggleTag}
                onCreateTag={vi.fn()}
                onDeleteTag={onDeleteTag}
                onPreviewTag={onPreviewTag}
                onFocusChange={vi.fn()}
            />
        );

        fireEvent.click(screen.getByLabelText("Edit bullet tags"));
        
        // 1. Mouse down prevent default on delete button
        const deleteButton = screen.getByLabelText("Delete Backend tag everywhere");
        const mousedownEvent1 = new MouseEvent("mousedown", { cancelable: true, bubbles: true });
        const preventDefaultSpy = vi.spyOn(mousedownEvent1, "preventDefault");
        fireEvent(deleteButton, mousedownEvent1);
        expect(preventDefaultSpy).toHaveBeenCalled();

        // 2. Click delete tag
        fireEvent.click(deleteButton);
        expect(onDeleteTag).toHaveBeenCalledWith("tag-1");

        // 3. Mouse down prevent default on toggle label button
        const toggleButton = screen.getByLabelText("Add Backend tag");
        const mousedownEvent2 = new MouseEvent("mousedown", { cancelable: true, bubbles: true });
        const preventDefaultSpy2 = vi.spyOn(mousedownEvent2, "preventDefault");
        fireEvent(toggleButton, mousedownEvent2);
        expect(preventDefaultSpy2).toHaveBeenCalled();

        // 4. Mouse enter/leave, focus/blur on toggle label button
        fireEvent.mouseEnter(toggleButton);
        expect(onPreviewTag).toHaveBeenLastCalledWith(expect.objectContaining({ id: "tag-1" }));

        fireEvent.mouseLeave(toggleButton);
        expect(onPreviewTag).toHaveBeenLastCalledWith(null);

        fireEvent.focus(toggleButton);
        expect(onPreviewTag).toHaveBeenLastCalledWith(expect.objectContaining({ id: "tag-1" }));

        fireEvent.blur(toggleButton);
        expect(onPreviewTag).toHaveBeenLastCalledWith(null);
    });

    it("handles remaining mouse hover, keyboard, input focus, and preventDefault events", () => {
        const onSectionHoverChange = vi.fn();
        const onFocusChange = vi.fn();
        const onCreateTag = vi.fn();
        const onPreviewTag = vi.fn();

        render(
            <ExperienceBulletTags
                bulletId="bullet-1"
                tagIds={[]}
                tags={[]}
                isEditing
                focusPath="experience.0.bullets.0.tags"
                textStyle={{ fontFamily: "Poppins" }}
                onSectionHoverChange={onSectionHoverChange}
                onToggleTag={vi.fn()}
                onCreateTag={onCreateTag}
                onDeleteTag={vi.fn()}
                onPreviewTag={onPreviewTag}
                onFocusChange={onFocusChange}
            />
        );

        // 1. Hover events on the root container
        const rootContainer = screen.getByLabelText("Edit bullet tags").parentElement!;
        fireEvent.mouseEnter(rootContainer);
        expect(onSectionHoverChange).toHaveBeenLastCalledWith(true);
        fireEvent.mouseLeave(rootContainer);
        expect(onSectionHoverChange).toHaveBeenLastCalledWith(false);

        // 2. Prevent default on the tag trigger button mousedown
        const triggerButton = screen.getByLabelText("Edit bullet tags");
        const triggerMouseDown = new MouseEvent("mousedown", { cancelable: true, bubbles: true });
        const triggerPreventDefaultSpy = vi.spyOn(triggerMouseDown, "preventDefault");
        fireEvent(triggerButton, triggerMouseDown);
        expect(triggerPreventDefaultSpy).toHaveBeenCalled();

        // Open the menu
        fireEvent.click(triggerButton);

        // 3. Hover events on the menu panel
        const menuPanel = document.querySelector(".resume-tag-menu-panel")!;
        fireEvent.mouseEnter(menuPanel);
        expect(onSectionHoverChange).toHaveBeenLastCalledWith(true);
        fireEvent.mouseLeave(menuPanel);
        expect(onSectionHoverChange).toHaveBeenLastCalledWith(false);

        // 4. Focus on search input
        const input = screen.getByPlaceholderText("Search or create tag");
        fireEvent.focus(input);
        expect(onFocusChange).toHaveBeenCalledWith("experience.0.bullets.0.tags");

        // 5. Input keydown Escape
        fireEvent.keyDown(input, { key: "Escape" });
        expect(document.querySelector(".resume-tag-menu-panel")).toBeNull();

        // Open menu again for Enter key test
        fireEvent.click(triggerButton);
        const input2 = screen.getByPlaceholderText("Search or create tag");
        fireEvent.change(input2, { target: { value: "Frontend" } });

        // 6. Input keydown Enter to create tag
        fireEvent.keyDown(input2, { key: "Enter" });
        expect(onCreateTag).toHaveBeenCalledWith("Frontend");

        // Reopen menu for click create tag test
        fireEvent.click(triggerButton);
        const input3 = screen.getByPlaceholderText("Search or create tag");
        fireEvent.change(input3, { target: { value: "Design" } });
        const createButton = screen.getByLabelText("Create Design tag");
        const createMouseDown = new MouseEvent("mousedown", { cancelable: true, bubbles: true });
        const createPreventDefaultSpy = vi.spyOn(createMouseDown, "preventDefault");
        fireEvent(createButton, createMouseDown);
        expect(createPreventDefaultSpy).toHaveBeenCalled();

        fireEvent.click(createButton);
        expect(onCreateTag).toHaveBeenCalledWith("Design");
    });
});

