import { describe, expect, it } from "vitest";
import { remapBoldRanges, splitBoldText, toggleBoldRange, trimBoldRanges } from "./boldText";

describe("experience bullet bold ranges", () => {
    it("bolds an entirely unformatted selection", () => {
        expect(toggleBoldRange([], 6, 11, 11)).toEqual([{ start: 6, end: 11 }]);
    });

    it("removes bold from the entire selection when any selected text is bold", () => {
        expect(toggleBoldRange([{ start: 0, end: 4 }, { start: 8, end: 12 }], 2, 10, 12)).toEqual([
            { start: 0, end: 2 },
            { start: 10, end: 12 }
        ]);
    });

    it("keeps ranges aligned as text is edited", () => {
        expect(remapBoldRanges("Built APIs", "Built secure APIs", [{ start: 6, end: 10 }])).toEqual([
            { start: 13, end: 17 }
        ]);
    });

    it("trims and splits formatted text for rendering", () => {
        const ranges = trimBoldRanges("  Fast work  ", [{ start: 2, end: 6 }]);
        expect(ranges).toEqual([{ start: 0, end: 4 }]);
        expect(splitBoldText("Fast work", ranges)).toEqual([
            { text: "Fast", bold: true },
            { text: " work", bold: false }
        ]);
    });

});
