const STAGE_LABELS = ["Applied", "Interview", "Offer", "Accepted"] as const;
const STAGE_KEYS = ["applied", "interview", "offer", "accepted"] as const;

const WEEKLY_APPLICATIONS = [6, 7, 5, 8, 9, 7, 10, 8, 11, 9, 10, 10] as const;

const DAILY_APPLICATIONS = [
  [1, 1, 2, 1, 1, 0, 0],
  [1, 2, 1, 2, 1, 0, 0],
  [1, 1, 1, 1, 1, 0, 0],
  [2, 1, 2, 1, 2, 0, 0],
  [1, 2, 2, 2, 2, 0, 0],
  [1, 1, 2, 1, 2, 0, 0],
  [2, 2, 1, 2, 2, 1, 0],
  [1, 2, 1, 2, 1, 1, 0],
  [2, 2, 2, 2, 2, 1, 0],
  [1, 2, 2, 1, 2, 1, 0],
  [2, 2, 1, 2, 2, 1, 0],
  [2, 1, 2, 2, 2, 1, 0],
] as const;

const STAGE_SNAPSHOTS = {
  applied: [4, 9, 15, 20, 27, 31, 37, 42, 45, 49, 52, 53, 52],
  interview: [0, 1, 2, 4, 6, 8, 10, 13, 15, 18, 20, 23, 25],
  offer: [0, 0, 0, 1, 1, 2, 3, 4, 5, 7, 8, 11, 13],
  accepted: [0, 0, 0, 0, 1, 1, 2, 3, 4, 5, 7, 8, 10],
} as const;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DAYS_IN_DEMO_RANGE = 90;
const DAYS_IN_HEATMAP_RANGE = 84;
const MILLISECONDS_PER_DAY = 86_400_000;

function startOfLocalToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function addUtcDays(value: Date, days: number) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getIsoWeek(value: Date) {
  const date = new Date(value);
  const dayNumber = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((date.getTime() - yearStart.getTime()) / MILLISECONDS_PER_DAY + 1) / 7
  );
}

function getCurrentWeekStart(today: Date) {
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  return addUtcDays(today, -daysSinceMonday);
}

function createMonthLabels(today: Date) {
  return Array.from({ length: 4 }, (_, index) => {
    const monthOffset = index - 3;
    const month = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + monthOffset, 1)
    );
    return month.toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC",
    });
  });
}

function expandWeeklySnapshots(values: readonly number[]) {
  return Array.from({ length: 90 }, (_, dayIndex) => {
    const snapshotIndex = Math.min(
      values.length - 1,
      Math.floor((dayIndex * (values.length - 1)) / 89)
    );
    return values[snapshotIndex];
  });
}

function createStagesOverTime(today: Date) {
  const rangeStart = addUtcDays(today, -(DAYS_IN_DEMO_RANGE - 1));
  const dates = Array.from({ length: DAYS_IN_DEMO_RANGE }, (_, dayIndex) =>
    addUtcDays(rangeStart, dayIndex)
  );
  return {
    labels: dates.map(toIsoDate),
    stage_counts: Object.fromEntries(
      STAGE_KEYS.map((stage) => [
        stage,
        expandWeeklySnapshots(STAGE_SNAPSHOTS[stage]),
      ])
    ) as Record<(typeof STAGE_KEYS)[number], number[]>,
  };
}

function createActivityHeatmap(today: Date) {
  const rangeStart = addUtcDays(today, -(DAYS_IN_HEATMAP_RANGE - 1));
  return DAILY_APPLICATIONS.flat().map((value, dayIndex) => {
    const date = addUtcDays(rangeStart, dayIndex);
    return {
      x: `WK ${getIsoWeek(date)}`,
      y: DAY_LABELS[date.getUTCDay()],
      v: value,
      date: toIsoDate(date),
    };
  });
}

function createWeekStarts(today: Date) {
  const currentWeekStart = getCurrentWeekStart(today);
  return Array.from({ length: 12 }, (_, index) =>
    addUtcDays(currentWeekStart, (index - 11) * 7)
  );
}

const demoToday = startOfLocalToday();
const stagesOverTime = createStagesOverTime(demoToday);
const activityHeatmap = createActivityHeatmap(demoToday);
const weekStarts = createWeekStarts(demoToday);

export const DASHBOARD_DEMO_DATA = Object.freeze({
  asOfDate: toIsoDate(demoToday),
  totalApplications: 100,
  gritScore: Object.freeze({
    score: 93,
    weekly_apps: 10,
    followups: 2,
    consistency: 50,
  }),
  appsByStage: Object.freeze({
    labels: STAGE_LABELS,
    values: [52, 25, 13, 10] as const,
  }),
  stagesOverTime: Object.freeze({
    labels: Object.freeze(stagesOverTime.labels),
    stage_counts: Object.freeze({
      applied: Object.freeze(stagesOverTime.stage_counts.applied),
      interview: Object.freeze(stagesOverTime.stage_counts.interview),
      offer: Object.freeze(stagesOverTime.stage_counts.offer),
      accepted: Object.freeze(stagesOverTime.stage_counts.accepted),
    }),
  }),
  avgTimeInStage: Object.freeze({
    applied: 12.4,
    interview: 8.2,
    offer: 4.6,
    accepted: 2.1,
  }),
  avgAppsPerWeek: Object.freeze({
    labels: Object.freeze(weekStarts.map((date) => `WK ${getIsoWeek(date)}`)),
    week_start_dates: Object.freeze(weekStarts.map(toIsoDate)),
    values: WEEKLY_APPLICATIONS,
  }),
  activityHeatmap: Object.freeze(activityHeatmap),
  splitByStageMonthly: Object.freeze({
    labels: Object.freeze(createMonthLabels(demoToday)),
    stage_counts: Object.freeze({
      applied: [4, 20, 42, 52] as const,
      interview: [0, 4, 13, 25] as const,
      offer: [0, 1, 4, 13] as const,
      accepted: [0, 0, 3, 10] as const,
    }),
  }),
});
