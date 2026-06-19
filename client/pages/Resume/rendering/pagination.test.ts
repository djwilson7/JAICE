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

    it("handles segment splitting on empty current page", () => {
        // Case: head is null, tail is present, empty page
        const splittableSegmentNoHead: PageSegment = {
            id: "splittable-no-head",
            estimatedHeight: 150,
            render: () => "splittable-no-head",
            split: (avail) => ({ head: null, tail: segment("tail", 150) })
        };
        const pages1 = paginateSegments([splittableSegmentNoHead], 100);
        expect(pages1.map((p) => p.map((item) => item.id))).toEqual([
            ["tail"]
        ]);

        // Case: head and tail present, empty page
        const splittableSegmentWithHead: PageSegment = {
            id: "splittable-with-head",
            estimatedHeight: 150,
            render: () => "splittable-with-head",
            split: (avail) => ({ head: segment("head", 60), tail: segment("tail", 90) })
        };
        const pages2 = paginateSegments([splittableSegmentWithHead], 100);
        expect(pages2.map((p) => p.map((item) => item.id))).toEqual([
            ["head"],
            ["tail"]
        ]);
    });

    it("handles segment splitting on non-empty current page", () => {
        const splittableSegment: PageSegment = {
            id: "splittable",
            estimatedHeight: 80,
            render: () => "splittable",
            split: (avail) => ({ head: segment("head", avail), tail: segment("tail", 80 - avail) })
        };
        const pages = paginateSegments([
            segment("prior", 60),
            splittableSegment
        ], 100);
        expect(pages.map((p) => p.map((item) => item.id))).toEqual([
            ["prior", "head"],
            ["tail"]
        ]);
    });

    it("covers splitWordsForHeight edge cases", () => {
        // single word
        expect(splitWordsForHeight("one", 30, 100, 10, 1)).toEqual({ head: "", tail: "one" });
        // height too small for first word
        expect(splitWordsForHeight("onelongword", 2, 100, 10, 1)).toEqual({ head: "", tail: "onelongword" });
    });
});

