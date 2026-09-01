import { describe, expect, it } from "vitest";
import { DASHBOARD_DEMO_DATA } from "./dashboardDemoData";

describe("dashboard demo data", () => {
  it("keeps every aggregate aligned to the same 100-application story", () => {
    const stageTotal = DASHBOARD_DEMO_DATA.appsByStage.values.reduce(
      (sum, value) => sum + value,
      0
    );
    const weeklyTotal = DASHBOARD_DEMO_DATA.avgAppsPerWeek.values.reduce(
      (sum, value) => sum + value,
      0
    );
    const heatmapTotal = DASHBOARD_DEMO_DATA.activityHeatmap.reduce(
      (sum, day) => sum + day.v,
      0
    );

    expect(stageTotal).toBe(DASHBOARD_DEMO_DATA.totalApplications);
    expect(weeklyTotal).toBe(DASHBOARD_DEMO_DATA.totalApplications);
    expect(heatmapTotal).toBe(DASHBOARD_DEMO_DATA.totalApplications);
  });

  it("matches current stage totals across summary and historical charts", () => {
    const { values } = DASHBOARD_DEMO_DATA.appsByStage;
    const stages = DASHBOARD_DEMO_DATA.stagesOverTime.stage_counts;
    const monthly = DASHBOARD_DEMO_DATA.splitByStageMonthly.stage_counts;

    expect([
      stages.applied.at(-1),
      stages.interview.at(-1),
      stages.offer.at(-1),
      stages.accepted.at(-1),
    ]).toEqual(values);
    expect([
      monthly.applied.at(-1),
      monthly.interview.at(-1),
      monthly.offer.at(-1),
      monthly.accepted.at(-1),
    ]).toEqual(values);
  });

  it("keeps weekly totals synchronized with the heatmap", () => {
    const heatmapWeeklyTotals = Array.from({ length: 12 }, (_, weekIndex) =>
      DASHBOARD_DEMO_DATA.activityHeatmap
        .slice(weekIndex * 7, weekIndex * 7 + 7)
        .reduce((sum, day) => sum + day.v, 0)
    );

    expect(heatmapWeeklyTotals).toEqual(
      DASHBOARD_DEMO_DATA.avgAppsPerWeek.values
    );
    expect(DASHBOARD_DEMO_DATA.gritScore.weekly_apps).toBe(
      DASHBOARD_DEMO_DATA.avgAppsPerWeek.values.at(-1)
    );
  });

  it("anchors every date range to the current session date", () => {
    const asOfDate = new Date(`${DASHBOARD_DEMO_DATA.asOfDate}T00:00:00Z`);
    const expectedMonthLabel = asOfDate.toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC",
    });

    expect(DASHBOARD_DEMO_DATA.stagesOverTime.labels).toHaveLength(90);
    expect(DASHBOARD_DEMO_DATA.stagesOverTime.labels.at(-1)).toBe(
      DASHBOARD_DEMO_DATA.asOfDate
    );
    expect(DASHBOARD_DEMO_DATA.activityHeatmap).toHaveLength(84);
    expect(DASHBOARD_DEMO_DATA.activityHeatmap.at(-1)?.date).toBe(
      DASHBOARD_DEMO_DATA.asOfDate
    );
    expect(DASHBOARD_DEMO_DATA.splitByStageMonthly.labels.at(-1)).toBe(
      expectedMonthLabel
    );
  });
});
