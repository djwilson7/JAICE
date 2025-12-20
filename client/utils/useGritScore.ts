import { useEffect, useState } from "react";
import { api } from "@/global-services/api";

type GritData = {
  score: number;
  weekly_apps: number;
  followups: number;
  consistency: number;
};

type TierInfo = {
  min: number;
  max: number;
  name: string;
  color: string;
};

const RANK_TIERS: TierInfo[] = [
  { min: 0, max: 19, name: "Newcomer", color: "#64748B" },
  { min: 20, max: 39, name: "Rising Talent", color: "#8B5CF6" },
  { min: 40, max: 59, name: "Fresh Starter", color: "#3B82F6" },
  { min: 60, max: 79, name: "Go-Getter", color: "#10B981" },
  { min: 80, max: 100, name: "Trailblazer", color: "#F59E0B" },
];

function getJaiceTier(score: number): TierInfo {
  const tier = RANK_TIERS.find((t) => score >= t.min && score <= t.max);
  return tier || RANK_TIERS[0];
}

/**
 * Custom hook to fetch and return grit score data
 * Can be used in multiple components to access the same grit score information
 */
export function useGritScore() {
  const [data, setData] = useState<GritData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api("/api/dashboard/grit-score");
        const payload = res.data ?? res;
        setData(payload.data ?? payload);
      } catch (err) {
        console.error("Error fetching grit score", err);
        setError(err instanceof Error ? err : new Error("Failed to fetch grit score"));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const tierInfo = data ? getJaiceTier(data.score) : null;

  return {
    score: data?.score ?? 0,
    weeklyApps: data?.weekly_apps ?? 0,
    followups: data?.followups ?? 0,
    consistency: data?.consistency ?? 0,
    tier: tierInfo?.name ?? "Newcomer",
    tierColor: tierInfo?.color ?? "#64748B",
    tierInfo,
    loading,
    error,
    rawData: data,
  };
}