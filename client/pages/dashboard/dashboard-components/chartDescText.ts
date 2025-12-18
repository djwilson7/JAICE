export const chartDescText: Record<string, {
    summary: string;
    calculation?: string;
    interpretation?: string;
    notes?: string;
}> = {
    stagesOverTime: {
        summary: "Shows how many applications entered each pipeline stage over the selected time range.",
        calculation: "Counts are grouped by day and split by stage label.",
        interpretation: "Use this to spot spikes in activity or slowdowns in progress over time.",
        notes: "Only includes applications with a valid stage timestamp in the selected range."
    },

    applicationsByCategory: {
        summary: "Displays the total number of applications grouped by job category for the selected period.",
        calculation: "Each bar represents a category count based on the application's assigned category.",
        interpretation: "Helps you identify which job categories you're focusing on most and where you might want to diversify or concentrate your efforts."
    },

    splitByStage: {
        summary: "Shows monthly totals for each stage so you can compare stage volume month-to-month.",
        calculation: "Counts applications per month based on the stage date, displaying the last 4 months with activity.",
        interpretation: "Track how your application pipeline has evolved over time and identify seasonal patterns in your job search."
    },

    avgTimeInStage: {
        summary: "Displays the average time (in hours or days) that applications currently spend in each stage.",
        calculation: "Calculated as a rolling 90-day average for applications actively sitting in each stage.",
        interpretation: "Helps you understand bottlenecks in your pipeline. Higher times may indicate stages that need more attention or follow-up.",
        notes: "Values under 1 day are shown in hours for precision."
    },

    avgAppsPerWeek: {
        summary: "Tracks your average weekly application submission rate over the last 10 weeks.",
        calculation: "Total applications submitted per week, averaged over the rolling 10-week period.",
        interpretation: "Monitor your job search momentum and consistency. Steady or increasing trends indicate sustained effort."
    },

    appsByStage: {
        summary: "Shows the total distribution of all your applications across each pipeline stage.",
        calculation: "Counts all applications currently in each stage (Applied, Interview, Offer, Accepted).",
        interpretation: "Get a quick overview of where your applications stand. A healthy pipeline typically shows movement across multiple stages."
    },

    gritScore: {
        summary: "A composite score (0-100) measuring your job search activity, consistency, and follow-through.",
        calculation: "Based on weekly application volume, follow-up actions, and consistency of activity over the rolling 90-day period.",
        interpretation: "Higher scores indicate stronger job search momentum. Aim to maintain or improve your score through regular activity.",
        notes: "Score tiers: Trailblazer (85+), Go-Getter (70-84), Fresh Starter (50-69), Rising Talent (<50)."
    },

     activityHeatmap: {
        summary: "Visualizes your daily job application activity over the past 12 weeks in a calendar-style heatmap.",
        calculation: "Each cell represents one day, with color intensity showing the number of applications submitted that day.",
        interpretation: "Identify patterns in your job search consistency. Darker colors indicate higher activity. Use this to spot gaps, maintain momentum, and establish consistent application habits.",
        notes: "Hover over any day to see the exact application count. Empty cells indicate days with no applications."
     }
};