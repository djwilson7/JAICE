import { useEffect, useState } from "react";
import { Card } from "./Card";
import { api } from "@/global-services/api";
import infoIcon from "@/assets/icons/info.svg";

type GritData = {
  score: number;
  weekly_apps: number;
  followups: number;
  consistency: number;
};

const RANK_TIERS = [
  { min: 0, max: 19, name: "Newcomer", color: "#64748B" },
  { min: 20, max: 39, name: "Rising Talent", color: "#8B5CF6" },
  { min: 40, max: 59, name: "Fresh Starter", color: "#3B82F6" },
  { min: 60, max: 79, name: "Go-Getter", color: "#10B981" },
  { min: 80, max: 100, name: "Trailblazer", color: "#F59E0B" },
];

function getJaiceTier(score: number) {
  const tier = RANK_TIERS.find((t) => score >= t.min && score <= t.max);
  return tier || RANK_TIERS[0];
}

export function GritCard({
  className = "",
  height = "24rem",
}: {
  className?: string;
  height?: number | string;
}) {
  const [data, setData] = useState<GritData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  // Progress bar animation - starts at 0 and animates to actual score
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api("/api/dashboard/grit-score");
        const payload = res.data ?? res;
        setData(payload.data ?? payload);
      } catch (err) {
        console.error("Error fetching grit score", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Trigger bar animation once data loads - delay for visual effect
  useEffect(() => {
    if (data?.score !== undefined) {
      // Small delay before starting animation so user sees it fill up
      setTimeout(() => setAnimatedScore(data.score), 150);
    }
  }, [data]);

  if (loading || !data) {
    return (
      <Card
        title="Grit Score"
        subtitle="Rating for activity, consistency, and follow-through (rolling 90 days)"
        className={className}
        height={height}
      >
        <div className="flex items-center justify-center h-full opacity-70">
          Loading…
        </div>
      </Card>
    );
  }

  const score = data.score;
  const tierInfo = getJaiceTier(score);
  const tier = tierInfo.name;

  // Info icon component
  const infoIconElement = (
    <div className="relative">
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
        style={{
          background: "none",
          border: "none",
          padding: 4,
          display: "flex",
          alignItems: "center",
        }}
        aria-label="More information about Grit Score"
      >
        <img 
          src={infoIcon} 
          alt="Info" 
          style={{ 
            width: 20, 
            height: 20,
            filter: 'var(--icon-filter)'
          }}
        />
      </button>
      
      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-120 max-w-[90vw] bg-gray-900 text-white text-sm rounded-lg shadow-xl p-4"
          style={{
            top: "100%",
            border: "1px solid rgba(255,255,255,0.1)",
            zIndex: 9999,
          }}
        >
          <div className="space-y-2">
            <p className="font-semibold">What is this?</p>
            <p className="text-xs opacity-90">
              Your Grit Score (0-100) measures how actively and consistently you're pursuing your job search over the past 90 days.
            </p>
            
            <p className="font-semibold text-xs mt-3">How it's calculated:</p>
            <p className="text-xs opacity-90">
              The score combines three metrics: (1) Weekly Applications, (2) Follow-ups with employers, and (3) Consistency of daily activity.
            </p>
            
            <p className="font-semibold text-xs mt-3">Rankings:</p>
            <p className="text-xs opacity-90">
              Trailblazer (80-100), Go-Getter (60-79), Fresh Starter (40-59), Rising Talent (20-39), Newcomer (0-19)
            </p>
          </div>
          {/* Arrow pointer */}
          <div
            className="absolute bottom-full left-1/2 transform -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderBottom: "8px solid #111827",
            }}
          />
        </div>
      )}
    </div>
  );

  return (
    <Card
      title="Grit Score"
      subtitle="Rating for activity, consistency, and follow-through (rolling 90 days)"
      titleIcon={infoIconElement}
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
                color: tierInfo.color,
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
                background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.05) 75%, transparent 75%, transparent)',
                backgroundSize: '20px 20px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              {/* Continuous fill bar with color gradient and diagonal stripes */}
              <div
                className="h-full transition-all duration-[1500ms] ease-out relative overflow-hidden"
                style={{
                  width: `${animatedScore}%`,
                  background: `linear-gradient(to right, 
                    ${RANK_TIERS[0].color} 0%, 
                    ${RANK_TIERS[0].color} 20%,
                    ${RANK_TIERS[1].color} 20%,
                    ${RANK_TIERS[1].color} 40%,
                    ${RANK_TIERS[2].color} 40%,
                    ${RANK_TIERS[2].color} 60%,
                    ${RANK_TIERS[3].color} 60%,
                    ${RANK_TIERS[3].color} 80%,
                    ${RANK_TIERS[4].color} 80%,
                    ${RANK_TIERS[4].color} 100%
                  )`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}
              >
                {/* Diagonal stripe overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.15) 10px, rgba(0,0,0,0.15) 20px)',
                  }}
                />
                {/* Shine effect */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
                  }}
                />
              </div>
              
              {/* Milestone markers */}
              <div className="absolute inset-0 flex pointer-events-none">
                {RANK_TIERS.slice(0, -1).map((_, index) => (
                  <div
                    key={index}
                    className="flex-1"
                    style={{
                      borderRight: "2px solid rgba(0, 0, 0, 0.4)",
                    }}
                  />
                ))}
                <div className="flex-1" />
              </div>
            </div>

            {/* Rank labels below */}
            <div className="mt-2 flex justify-between text-xs opacity-70">
              {RANK_TIERS.map((rankTier, index) => (
                <div
                  key={index}
                  className="flex-1 text-center"
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
            <div className="rounded-xl border border-white/12 bg-white/6 px-4 py-3 text-center">
              <div className="text-xs sm:text-sm opacity-80">Weekly Apps</div>
              <div className="mt-1 text-lg sm:text-xl font-medium">
                {data.weekly_apps}
              </div>
            </div>

            <div className="rounded-xl border border-white/12 bg-white/6 px-4 py-3 text-center">
              <div className="text-xs sm:text-sm opacity-80">Follow-ups</div>
              <div className="mt-1 text-lg sm:text-xl font-medium">
                {data.followups}
              </div>
            </div>

            <div className="rounded-xl border border-white/12 bg-white/6 px-4 py-3 text-center">
              <div className="text-xs sm:text-sm opacity-80">Consistency</div>
              <div className="mt-1 text-lg sm:text-xl font-medium">
                {data.consistency} days
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default GritCard;