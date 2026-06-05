import { useEffect, useState } from "react";
import { Card, ChartSkeleton } from "./Card";
import { useGritScore } from "@/utils/useGritScore";
import { chartDescText } from "./chartDescText";
import { useSettings } from "@/pages/settings/provider/settingsContext";
import { getDashboardChartTheme } from "./chartTheme";

// Export RANK_TIERS for use in the progress bar
// eslint-disable-next-line react-refresh/only-export-components
export const RANK_TIERS = [
  { min: 0, max: 19, name: "Newcomer", color: "#64748B" },
  { min: 20, max: 39, name: "Rising Talent", color: "#8B5CF6" },
  { min: 40, max: 59, name: "Fresh Starter", color: "#3B82F6" },
  { min: 60, max: 79, name: "Go-Getter", color: "#10B981" },
  { min: 80, max: 100, name: "Trailblazer", color: "#F59E0B" },
];

const scoreToPercent = (scoreValue: number) =>
  Math.min(100, Math.max(0, scoreValue));

const tierGlassGradient = RANK_TIERS.map((rankTier) => {
  const start = scoreToPercent(rankTier.min);
  const end = scoreToPercent(rankTier.max + 1);
  const fadeStart = Math.max(start, end - 3);
  return `${rankTier.color}E6 ${start}%, ${rankTier.color}B8 ${fadeStart}%, ${rankTier.color}F2 ${end}%`;
}).join(", ");

const tierColumns = RANK_TIERS.map((rankTier) => {
  const span = rankTier.max - rankTier.min + 1;
  return `${span}fr`;
}).join(" ");

const tierBreakpoints = RANK_TIERS.slice(0, -1).map((rankTier) =>
  scoreToPercent(rankTier.max + 1)
);

export function GritCard({
  className = "",
  height = "auto",
}: {
  className?: string;
  height?: number | string;
}) {
  const { theme } = useSettings();
  const chartTheme = getDashboardChartTheme(theme);
  const { score, weeklyApps, followups, consistency, tier, tierColor, loading } = useGritScore();

  // Progress bar animation - starts at 0 and animates to actual score
  const [animatedScore, setAnimatedScore] = useState(0);

  // Trigger bar animation once data loads - delay for visual effect
  useEffect(() => {
    if (score !== undefined && score > 0) {
      // Small delay before starting animation so user sees it fill up
      setTimeout(() => setAnimatedScore(score), 150);
    }
  }, [score]);

  if (loading) {
    return (
      <Card
        title="Grit Score"
        subtitle="Rating for activity, consistency, and follow-through (rolling 90 days)"
        infoDescription={chartDescText.gritScore}
        className={className}
        height={height}
      >
        <ChartSkeleton variant="grit" />
      </Card>
    );
  }

  return (
    <Card
      title="Grit Score"
      subtitle="Rating for activity, consistency, and follow-through (rolling 90 days)"
      infoDescription={chartDescText.gritScore}
      className={className}
      height={height}
    >
        <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-3 items-center content-center gap-2">
        
        {/* BIG NUMBER */}
        <div className="flex items-center justify-center">
          <div className="text-center leading-tight">
            <div
              style={{
                fontFamily: "var(--font-title)",
                fontWeight: 700,
                lineHeight: 0.9,
                fontSize: "clamp(4.5rem, 12vw, 14rem)",
                letterSpacing: "-0.02em",
              }}
            >
              {score}
            </div>

            <div
              style={{
                marginTop: 8,
                opacity: 0.9,
                fontWeight: 600,
                fontSize: "clamp(1.25rem, 3.2vw, 3.5rem)",
                letterSpacing: "0.01em",
                color: tierColor,
              }}
            >
              {tier}
            </div>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="lg:col-span-2 flex flex-col justify-center">
          <div className="mb-3 flex items-center justify-between text-sm sm:text-base opacity-85">
            <span>Overall Progress</span>
            <span>{score}%</span>
          </div>

          {/* Diagonal Striped Progress Bar with Rank Milestones */}
          <div className="relative">
            {/* Background container with diagonal stripes */}
            <div 
              className="relative h-8 w-full rounded-lg overflow-hidden"
              style={{
                background: chartTheme.isLight
                  ? "linear-gradient(180deg, rgba(255,255,255,0.78), rgba(226,232,240,0.52))"
                  : "linear-gradient(180deg, rgba(255,255,255,0.13), rgba(15,23,42,0.22))",
                boxShadow: chartTheme.isLight
                  ? "inset 0 1px 0 rgba(255,255,255,0.92), inset 0 -1px 0 rgba(15,23,42,0.10), 0 8px 18px rgba(15,23,42,0.10)"
                  : "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.40), 0 10px 24px rgba(0,0,0,0.20)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
                style={{
                  background: "linear-gradient(180deg, rgba(255,255,255,0.28), transparent)",
                }}
              />
              <div
                className="absolute inset-0 transition-[clip-path] duration-[1500ms] ease-out"
                style={{
                  clipPath: `inset(0 ${100 - scoreToPercent(animatedScore)}% 0 0)`,
                  background: `linear-gradient(to right, ${tierGlassGradient})`,
                  boxShadow: chartTheme.isLight
                    ? "inset 0 1px 0 rgba(255,255,255,0.56), inset 0 -1px 0 rgba(15,23,42,0.16), 0 2px 8px rgba(15,23,42,0.12)"
                    : "inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.36)",
                }}
              >
                {/* Shine effect */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.10) 42%, rgba(0,0,0,0.13) 100%)",
                    mixBlendMode: chartTheme.isLight ? "soft-light" : "screen",
                  }}
                />
              </div>
              
              {/* Milestone markers */}
              <div className="absolute inset-0 pointer-events-none">
                {tierBreakpoints.map((breakpoint, index) => (
                  <div
                    key={index}
                    className="absolute top-0 h-full"
                    style={{
                      left: `${breakpoint}%`,
                      borderRight: "2px solid rgba(0, 0, 0, 0.4)",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Rank labels below */}
            <div
              className="mt-2 grid text-xs opacity-70"
              style={{ gridTemplateColumns: tierColumns }}
            >
              {RANK_TIERS.map((rankTier, index) => (
                <div
                  key={index}
                  className="text-center"
                  style={{
                    color: score >= rankTier.min ? rankTier.color : 'inherit',
                    fontWeight: score >= rankTier.min && score <= rankTier.max ? 600 : 400,
                  }}
                >
                  {rankTier.name}
                </div>
              ))}
            </div>
          </div>

          {/* KPI Row */}
          <div className="mt-4 grid grid-cols-3 gap-3 sm:gap-4">
            <div className={`rounded-xl border ${chartTheme.tile.border} ${
              chartTheme.isLight ? "bg-white/45" : "bg-white/[0.045]"
            } px-4 py-3 text-center`}>
              <div className="text-xs sm:text-sm opacity-80">Weekly Apps</div>
              <div className="mt-1 text-lg sm:text-xl font-medium">
                {weeklyApps}
              </div>
            </div>

            <div className={`rounded-xl border ${chartTheme.tile.border} ${
              chartTheme.isLight ? "bg-white/45" : "bg-white/[0.045]"
            } px-4 py-3 text-center`}>
              <div className="text-xs sm:text-sm opacity-80">Follow-ups</div>
              <div className="mt-1 text-lg sm:text-xl font-medium">
                {followups}
              </div>
            </div>

            <div className={`rounded-xl border ${chartTheme.tile.border} ${
              chartTheme.isLight ? "bg-white/45" : "bg-white/[0.045]"
            } px-4 py-3 text-center`}>
              <div className="text-xs sm:text-sm opacity-80">Consistency</div>
              <div className="mt-1 text-lg sm:text-xl font-medium">
                {consistency} days
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default GritCard;
