import type React from "react";

export type PageSegment = {
    id: string;
    editorAnchorId?: string;
    estimatedHeight: number;
    render: (key: string) => React.ReactNode;
    split?: (availableHeight: number) => { head: PageSegment | null; tail: PageSegment | null };
    keepWithNext?: boolean;
};

export const MIN_SPLITTABLE_TEXT_HEIGHT_PT = 18;

export const estimateWrappedTextHeight = (
    text: string,
    widthPt: number,
    fontSizePt: number,
    lineHeight: number,
    verticalPaddingPt = 0
) => {
    const averageCharacterWidth = fontSizePt * 0.62;
    const charactersPerLine = Math.max(12, Math.floor(widthPt / averageCharacterWidth));
    const lineCount = Math.max(1, Math.ceil(String(text || " ").length / charactersPerLine));
    return lineCount * fontSizePt * lineHeight + verticalPaddingPt;
};

export const splitWordsForHeight = (
    text: string,
    availableHeight: number,
    widthPt: number,
    fontSizePt: number,
    lineHeight: number,
    verticalPaddingPt = 0
) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length <= 1) return { head: "", tail: text };

    let low = 1;
    let high = words.length - 1;
    let best = 0;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candidate = words.slice(0, mid).join(" ");
        const height = estimateWrappedTextHeight(candidate, widthPt, fontSizePt, lineHeight, verticalPaddingPt);
        if (height <= availableHeight) {
            best = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    if (best <= 0) return { head: "", tail: text };
    return {
        head: words.slice(0, best).join(" "),
        tail: words.slice(best).join(" ")
    };
};

export const canSplitIntoHeight = (availableHeight: number) =>
    availableHeight >= MIN_SPLITTABLE_TEXT_HEIGHT_PT;

export const outerHeightPx = (contentHeight: number, marginTop: number, marginBottom: number) =>
    contentHeight + marginTop + marginBottom;

export const paginateSegments = (segments: PageSegment[], pageContentHeight: number) => {
    const pages: PageSegment[][] = [];
    let currentPage: PageSegment[] = [];
    let remainingHeight = pageContentHeight;
    const queue = [...segments];

    const finishPage = () => {
        pages.push(currentPage);
        currentPage = [];
        remainingHeight = pageContentHeight;
    };

    while (queue.length > 0) {
        const segment = queue.shift();
        if (!segment) continue;

        const nextSegment = queue[0];
        const requiredHeight = segment.estimatedHeight + (
            segment.keepWithNext && nextSegment ? nextSegment.estimatedHeight : 0
        );
        if (currentPage.length > 0 && requiredHeight > remainingHeight) {
            if (segment.split) {
                const { head, tail } = segment.split(remainingHeight);
                if (head) currentPage.push(head);
                finishPage();
                if (tail) queue.unshift(tail);
                continue;
            }
            finishPage();
            queue.unshift(segment);
            continue;
        }

        if (segment.estimatedHeight <= remainingHeight || currentPage.length === 0) {
            if (segment.estimatedHeight > remainingHeight && segment.split) {
                const { head, tail } = segment.split(remainingHeight);
                if (!head && tail && currentPage.length === 0) {
                    currentPage.push(tail);
                    remainingHeight = 0;
                    continue;
                }
                if (head) currentPage.push(head);
                finishPage();
                if (tail) queue.unshift(tail);
                continue;
            }

            currentPage.push(segment);
            remainingHeight -= Math.min(segment.estimatedHeight, remainingHeight);
            continue;
        }

        if (segment.split) {
            const { head, tail } = segment.split(remainingHeight);
            if (head) currentPage.push(head);
            finishPage();
            if (tail) queue.unshift(tail);
            continue;
        }

        finishPage();
        queue.unshift(segment);
    }

    if (currentPage.length > 0 || pages.length === 0) {
        pages.push(currentPage);
    }

    return pages;
};
