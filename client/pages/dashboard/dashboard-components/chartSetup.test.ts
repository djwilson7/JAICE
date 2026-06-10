import { describe, it, expect } from "vitest";
import { cssVar, rgba, applyChartDefaults } from "./chartSetup";
import { Chart as ChartJS } from "chart.js";

describe("chartSetup", () => {
    it("cssVar falls back if not found", () => {
        expect(cssVar("--non-existent-var", "fallback")).toBe("fallback");
    });

    it("rgba parses simple rgb", () => {
        expect(rgba("255,0,0", 0.5)).toBe("rgba(255,0,0,0.5)");
    });

    it("rgba parses hex", () => {
        expect(rgba("#FF0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
        expect(rgba("#F00", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
    });

    it("rgba falls back if empty", () => {
        expect(rgba("", 0.5)).toBe("rgba(255,255,255,0.5)");
    });

    it("applyChartDefaults works", () => {
        applyChartDefaults();
        expect(ChartJS.defaults.font.family).toBe("Poppins, sans-serif");
    });
});
