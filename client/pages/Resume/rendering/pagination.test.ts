import { describe, expect, it } from "vitest";
import { outerHeightPx, paginateSegments, splitWordsForHeight, type PageSegment } from "./pagination";

const segment = (id: string, estimatedHeight: number): PageSegment => ({
    id,
    estimatedHeight,
    render: () => id
});

describe("resume pagination", () => {
    it("fills each page in order", () => {
        const pages = paginateSegments([
            segment("a", 40),
            segment("b", 60),
            segment("c", 20)
        ], 100);

        expect(pages.map((page) => page.map((item) => item.id))).toEqual([
            ["a", "b"],
            ["c"]
        ]);
    });

    it("splits text without losing words", () => {
        const text = "one two three four five six seven eight nine ten";
        const result = splitWordsForHeight(text, 30, 100, 10, 1);
        expect(`${result.head} ${result.tail}`.trim()).toBe(text);
    });

    it("moves an atomic segment to the next page when it does not fit", () => {
        const pages = paginateSegments([
            segment("meta", 70),
            segment("whole-bullet", 40),
            segment("next-bullet", 20)
        ], 100);

        expect(pages.map((page) => page.map((item) => item.id))).toEqual([
            ["meta"],
            ["whole-bullet", "next-bullet"]
        ]);
    });

    it("moves keep-with-next metadata and its following item together", () => {
        const meta = { ...segment("meta", 20), keepWithNext: true };
        const pages = paginateSegments([
            segment("prior-content", 75),
            meta,
            segment("whole-bullet", 30)
        ], 100);

        expect(pages.map((page) => page.map((item) => item.id))).toEqual([
            ["prior-content"],
            ["meta", "whole-bullet"]
        ]);
    });

    it("includes vertical margins in measured segment height", () => {
        expect(outerHeightPx(24, 2, 10)).toBe(36);
    });
});
