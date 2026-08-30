import React, { forwardRef, useLayoutEffect, useRef } from "react";
import { normalizeBoldRanges, splitBoldText } from "../boldText";
import type { BoldRange } from "../types";

type RichTextEditableProps = {
    value: string;
    boldRanges: BoldRange[];
    className: string;
    placeholder: string;
    style?: React.CSSProperties;
    onChange: (value: string, boldRanges: BoldRange[]) => void;
    onToggleBold: (start: number, end: number) => void;
    onFocus: () => void;
    onBlur: () => void;
    onKeyDown?: React.KeyboardEventHandler<HTMLElement>;
};

const readContent = (root: HTMLElement) => {
    let text = "";
    const ranges: BoldRange[] = [];
    const visit = (node: Node, bold: boolean) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const value = node.textContent || "";
            const start = text.length;
            text += value;
            if (bold && value) ranges.push({ start, end: text.length });
            return;
        }
        if (!(node instanceof HTMLElement)) return;
        if (node.tagName === "BR") {
            text += "\n";
            return;
        }
        const isBold = bold || node.tagName === "STRONG" || node.tagName === "B";
        Array.from(node.childNodes).forEach((child) => visit(child, isBold));
    };
    Array.from(root.childNodes).forEach((child) => visit(child, false));
    return { text, boldRanges: normalizeBoldRanges(ranges, text.length) };
};

const selectionOffsets = (root: HTMLElement): { start: number; end: number } | null => {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
    const beforeStart = range.cloneRange();
    beforeStart.selectNodeContents(root);
    beforeStart.setEnd(range.startContainer, range.startOffset);
    const beforeEnd = range.cloneRange();
    beforeEnd.selectNodeContents(root);
    beforeEnd.setEnd(range.endContainer, range.endOffset);
    return { start: beforeStart.toString().length, end: beforeEnd.toString().length };
};

const restoreSelection = (root: HTMLElement, start: number, end: number) => {
    const range = document.createRange();
    const selection = window.getSelection();
    let offset = 0;
    let startPoint: [Node, number] | null = null;
    let endPoint: [Node, number] | null = null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
        const length = node.textContent?.length || 0;
        if (!startPoint && start <= offset + length) startPoint = [node, start - offset];
        if (!endPoint && end <= offset + length) endPoint = [node, end - offset];
        offset += length;
        node = walker.nextNode();
    }
    const fallback: [Node, number] = [root, root.childNodes.length];
    const [startNode, startOffset] = startPoint || fallback;
    const [endNode, endOffset] = endPoint || fallback;
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    selection?.removeAllRanges();
    selection?.addRange(range);
};

export const RichTextEditable = forwardRef<HTMLDivElement, RichTextEditableProps>(({
    value,
    boldRanges,
    className,
    placeholder,
    style,
    onChange,
    onToggleBold,
    onFocus,
    onBlur,
    onKeyDown
}, forwardedRef) => {
    const localRef = useRef<HTMLDivElement | null>(null);
    const pendingSelection = useRef<{ start: number; end: number } | null>(null);

    useLayoutEffect(() => {
        const root = localRef.current;
        if (!root) return;
        const current = readContent(root);
        const normalized = normalizeBoldRanges(boldRanges, value.length);
        if (current.text !== value || JSON.stringify(current.boldRanges) !== JSON.stringify(normalized)) {
            root.replaceChildren();
            splitBoldText(value, normalized).forEach((segment) => {
                const textNode = document.createTextNode(segment.text);
                if (segment.bold) {
                    const strong = document.createElement("strong");
                    strong.appendChild(textNode);
                    root.appendChild(strong);
                } else {
                    root.appendChild(textNode);
                }
            });
        }
        if (pendingSelection.current && document.activeElement === root) {
            restoreSelection(root, pendingSelection.current.start, pendingSelection.current.end);
            pendingSelection.current = null;
        }
    }, [boldRanges, value]);

    return (
        <div
            ref={(node) => {
                localRef.current = node;
                if (typeof forwardedRef === "function") forwardedRef(node);
                else if (forwardedRef) forwardedRef.current = node;
            }}
            role="textbox"
            aria-multiline="true"
            contentEditable
            suppressContentEditableWarning
            className={className}
            data-placeholder={placeholder}
            style={style}
            onInput={() => {
                if (!localRef.current) return;
                const selection = selectionOffsets(localRef.current);
                if (selection) pendingSelection.current = selection;
                const content = readContent(localRef.current);
                onChange(content.text, content.boldRanges);
            }}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
                    event.preventDefault();
                    if (!localRef.current) return;
                    const selection = selectionOffsets(localRef.current);
                    if (!selection || selection.start === selection.end) return;
                    pendingSelection.current = selection;
                    onToggleBold(selection.start, selection.end);
                    return;
                }
                onKeyDown?.(event);
            }}
        />
    );
});

RichTextEditable.displayName = "RichTextEditable";
