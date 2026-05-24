export const chartDescText: Record<string, {
    summary: string;
    calculation?: string;
    interpretation?: string;
    notes?: string;
}> = {
    stagesOverTime: {
        summary: "Shows how your applications move across stages over time.",
        calculation: "We count applications by day and group them by stage.",
        interpretation: "Use it to spot busy weeks, quiet stretches, and where your search is slowing down.",
        notes: "Only applications with a valid received date are included."
    },

    splitByStage: {
        summary: "Shows how many applications landed in each stage by month.",
        calculation: "We count applications for each month and split them by stage.",
        interpretation: "Use it to compare months and see if your pipeline is growing or getting stuck."
    },

    avgTimeInStage: {
        summary: "Shows how long applications usually sit in each stage.",
        calculation: "We average active applications from the last 90 days.",
        interpretation: "Longer times can point to stages that may need a follow-up or closer review.",
        notes: "Small values are shown in hours instead of days."
    },

    avgAppsPerWeek: {
        summary: "Shows how many applications you send each week.",
        calculation: "We count weekly applications over the last 12 weeks.",
        interpretation: "Use it to check your pace and see if your search activity is rising or dropping."
    },

    appsByStage: {
        summary: "Shows where your current applications stand right now.",
        calculation: "We count active applications in each stage.",
        interpretation: "Use it as a quick snapshot of your pipeline."
    },

    gritScore: {
        summary: "Shows your overall job-search momentum on a 0 to 100 scale.",
        calculation: "We combine weekly applications, follow-up activity, and active search days.",
        interpretation: "A higher score means you are applying, following up, and staying consistent.",
        notes: "Ranks: Newcomer, Rising Talent, Fresh Starter, Go-Getter, and Trailblazer."
    },

     activityHeatmap: {
        summary: "Shows your daily application activity over the last 12 weeks.",
        calculation: "Each square is one day. Darker squares mean more applications.",
        interpretation: "Use it to spot gaps, strong streaks, and days when you were most active.",
        notes: "Hover a square to see the exact count."
     }
};
