import { describe, expect, it } from "vitest";
import { inToPt, ptCss, ptToIn, ptToPx, pxToPt } from "./documentUnits";

describe("resume document unit utilities", () => {
    it("converts between document points and browser pixels", () => {
        expect(ptToPx(12)).toBe(16);
        expect(pxToPt(16)).toBe(12);
    });

    it("converts between document points and inches", () => {
        expect(inToPt(0.75)).toBe(54);
        expect(ptToIn(72)).toBe(1);
    });

    it("formats point CSS values", () => {
        expect(ptCss(12)).toBe("12pt");
    });
});
