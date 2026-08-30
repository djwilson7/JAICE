import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RichTextEditable } from "./RichTextEditable";

describe("RichTextEditable", () => {
    it("uses one editable text surface and toggles the selected range", () => {
        const onToggleBold = vi.fn();
        const { getByRole, container } = render(
            <RichTextEditable
                value="Built APIs"
                boldRanges={[]}
                className="editor"
                placeholder="Bullet"
                onChange={vi.fn()}
                onToggleBold={onToggleBold}
                onFocus={vi.fn()}
                onBlur={vi.fn()}
            />
        );
        const editor = getByRole("textbox");
        const textNode = editor.firstChild!;
        const range = document.createRange();
        range.setStart(textNode, 6);
        range.setEnd(textNode, 10);
        const selection = window.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);

        fireEvent.keyDown(editor, { key: "b", ctrlKey: true });

        expect(onToggleBold).toHaveBeenCalledWith(6, 10);
        expect(container.querySelectorAll('[contenteditable="true"]')).toHaveLength(1);
        expect(container.querySelector("textarea")).toBeNull();
    });

    it("reports text and formatting from the editable DOM", () => {
        const onChange = vi.fn();
        const { getByRole } = render(
            <RichTextEditable
                value="Built APIs"
                boldRanges={[{ start: 6, end: 10 }]}
                className="editor"
                placeholder="Bullet"
                onChange={onChange}
                onToggleBold={vi.fn()}
                onFocus={vi.fn()}
                onBlur={vi.fn()}
            />
        );
        const editor = getByRole("textbox");
        expect(editor.querySelector("strong")?.textContent).toBe("APIs");
        editor.querySelector("strong")!.textContent = "services";

        fireEvent.input(editor);

        expect(onChange).toHaveBeenCalledWith("Built services", [{ start: 6, end: 14 }]);
    });
});
