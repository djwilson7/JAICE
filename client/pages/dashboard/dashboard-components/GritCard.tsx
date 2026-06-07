import { useEffect, useState } from "react";
import { Card, ChartSkeleton } from "./Card";
import { useGritScore } from "@/utils/useGritScore";
import { chartDescText } from "./chartDescText";
import { useSettings } from "@/pages/settings/provider/settingsContext";
import { getDashboardChartTheme } from "./chartTheme";
import downChevron from "@/assets/icons/angle-small-down.svg";

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

const getTierIndexForScore = (scoreValue: number) => {
  const safeScore = scoreToPercent(scoreValue);
  const tierIndex = RANK_TIERS.findIndex(
    (rankTier) => safeScore >= rankTier.min && safeScore <= rankTier.max
  );
  return tierIndex >= 0 ? tierIndex : RANK_TIERS.length - 1;
};

const getTierCenterPercent = (tierIndex: number) =>
  ((tierIndex + 0.5) / RANK_TIERS.length) * 100;

export function GritCard({
  className = "",
  height = "16rem",
}: {
  className?: string;
  height?: number | string;
}) {
  const { theme } = useSettings();
  const chartTheme = getDashboardChartTheme(theme);
  const { score, weeklyApps, followups, consistency, loading } = useGritScore();

  // Progress bar animation - starts at 0 and animates to actual score
  const [animatedScore, setAnimatedScore] = useState(0);
  const animatedScorePercent = scoreToPercent(animatedScore);
  const activeTierIndex = getTierIndexForScore(animatedScore);
  const activeTier = RANK_TIERS[activeTierIndex];
  const activeTierCenterPercent = getTierCenterPercent(activeTierIndex);

  // Trigger bar animation once data loads - delay for visual effect
  useEffect(() => {
    if (score === undefined) return;

    setAnimatedScore(0);

    const targetScore = scoreToPercent(score);
    const durationMs = 4200;
    let animationFrame = 0;

    const delayTimeout = window.setTimeout(() => {
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationMs);

        setAnimatedScore(targetScore * progress);

        if (progress < 1) {
          animationFrame = window.requestAnimationFrame(animate);
        }
      };

      animationFrame = window.requestAnimationFrame(animate);
    }, 150);

    return () => {
      window.clearTimeout(delayTimeout);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
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
        <div className="flex h-full w-full flex-col justify-center gap-3">
        <div>
          {/* Diagonal Striped Progress Bar with Rank Milestones */}
          <div>
            <div
              className="relative min-h-[4.35rem]"
            >
              <div
                className="absolute bottom-0 flex min-w-0 -translate-x-1/2 flex-col items-center text-center"
                style={{
                  left: `${activeTierCenterPercent}%`,
                  transition: "left 1100ms linear",
                }}
              >
                <div className="text-[0.68rem] leading-none opacity-75">
                  Rating
                </div>
                <div
                  className="mt-1 whitespace-nowrap"
                  style={{
                    fontWeight: 600,
                    fontSize: "clamp(1.2rem, 2vw, 1.9rem)",
                    lineHeight: 1.05,
                    letterSpacing: 0,
                    color: activeTier.color,
                  }}
                >
                  {activeTier.name}
                </div>
                <img
                  src={downChevron}
                  alt=""
                  aria-hidden="true"
                  className="mt-2.5 h-5 w-5"
                  style={{
                    filter: chartTheme.isLight
                      ? "brightness(0) saturate(100%)"
                      : "var(--icon-filter)",
                    opacity: 0.9,
                  }}
                />
              </div>
            </div>

            {/* Background container with diagonal stripes */}
            <div 
              className="relative h-6 w-full overflow-hidden rounded-md"
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
                className="absolute inset-0"
                style={{
                  clipPath: `inset(0 ${100 - animatedScorePercent}% 0 0)`,
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
              className="mt-2 grid text-[0.68rem] opacity-70"
              style={{ gridTemplateColumns: tierColumns }}
            >
              {RANK_TIERS.map((rankTier, index) => (
                <div
                  key={index}
                  className="text-center"
                  style={{
                    color: animatedScorePercent >= rankTier.min ? rankTier.color : 'inherit',
                    fontWeight:
                      animatedScorePercent >= rankTier.min &&
                      animatedScorePercent <= rankTier.max
                        ? 600
                        : 400,
                    visibility: index === activeTierIndex ? "hidden" : "visible",
                  }}
                >
                  {rankTier.name}
                </div>
              ))}
            </div>
          </div>

          {/* KPI Row */}
          <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
            <div className={`rounded-xl border ${chartTheme.tile.border} ${
              chartTheme.isLight ? "bg-white/45" : "bg-white/[0.045]"
            } px-3 py-2 text-center`}>
              <div className="text-[0.68rem] sm:text-xs opacity-80">Weekly Apps</div>
              <div className="mt-1 text-base sm:text-lg font-medium">
                {weeklyApps}
              </div>
            </div>

            <div className={`rounded-xl border ${chartTheme.tile.border} ${
              chartTheme.isLight ? "bg-white/45" : "bg-white/[0.045]"
            } px-3 py-2 text-center`}>
              <div className="text-[0.68rem] sm:text-xs opacity-80">Follow-ups</div>
              <div className="mt-1 text-base sm:text-lg font-medium">
                {followups}
              </div>
            </div>

            <div className={`rounded-xl border ${chartTheme.tile.border} ${
              chartTheme.isLight ? "bg-white/45" : "bg-white/[0.045]"
            } px-3 py-2 text-center`}>
              <div className="text-[0.68rem] sm:text-xs opacity-80">Consistency</div>
              <div className="mt-1 text-base sm:text-lg font-medium">
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
