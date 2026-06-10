import { describe, it, expect } from "vitest";
import { getDashboardChartTheme, makeDarkOptions } from "./chartTheme";

describe("chartTheme", () => {
    it("getDashboardChartTheme returns light theme", () => {
        const theme = getDashboardChartTheme("light");
        expect(theme.isLight).toBe(true);
        expect(theme.axis).toBe("rgba(30,41,59,0.88)");
        expect(theme.heatmap.low[0]).toBe(187);
    });

    it("getDashboardChartTheme returns dark theme", () => {
        const theme = getDashboardChartTheme("dark");
        expect(theme.isLight).toBe(false);
        expect(theme.axis).toBe("rgba(255,255,255,0.86)");
        expect(theme.heatmap.low[0]).toBe(16);
    });

    it("makeDarkOptions returns combined options", () => {
        const opts = makeDarkOptions({ responsive: false } as any);
        expect(opts.responsive).toBe(false);
        expect(opts.maintainAspectRatio).toBe(false);
    });
});
