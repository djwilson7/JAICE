import { useEffect, useState } from "react";
import { Card } from "./Card";
import { api } from "@/global-services/api";

type GritData = {
  score: number;
  weekly_apps: number;
  followups: number;
  consistency: number;
};

function getJaiceTier(score: number) {
  if (score >= 85) return "Trailblazer";
  if (score >= 70) return "Go-Getter";
  if (score >= 50) return "Fresh Starter";
  return "Rising Talent";
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

  // Progress bar animation
  const [progress, setProgress] = useState(0);

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

  // Trigger bar animation once data loads
  useEffect(() => {
    if (data?.score !== undefined) {
      setTimeout(() => setProgress(data.score), 120);
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
  const tier = getJaiceTier(score);

  return (
    <Card
      title="Grit Score"
      subtitle="Rating for activity, consistency, and follow-through (rolling 90 days)"
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
              }}
            >
              {tier}
            </div>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="lg:col-span-2 flex flex-col justify-center">
          <div className="mb-2 flex items-center justify-between text-sm sm:text-base opacity-85">
            <span>Overall Progress</span>
            <span>{score}%</span>
          </div>

          {/* Animated Progress Bar */}
          <div className="h-4 w-full rounded-full bg-white/12 overflow-hidden">
            <div
              className="h-4 rounded-full bg-[#22D3EE] transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
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
