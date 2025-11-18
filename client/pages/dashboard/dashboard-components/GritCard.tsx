import { Card } from "./Card";

export function GritCard({ className = "", height = "24rem" }: { className?: string; height?: number | string }) {
    // TODO: fake score for now. update with real data later.
    const score = 81;
    const tier = score >= 85 ? "Excellent" : score >= 70 ? "Strong" : "Improving";

    return (
        <Card
            title="Grit Score"
            subtitle="Rating for activity, consistency, and follow-through (rolling 90 days)"
            className={className}
            height={height}
        >
            <div className="h-full w-full grid grid-cols-1 lg:grid-cols-3 items-center gap-6">
                {/* Left: BIG number and tier*/}
                <div className="flex items-center justify-center">
                    <div className="text-center leading-tight">
                        {/* Score */}
                        <div style={{
                            fontFamily: "var(--font-title)",
                            fontWeight: 700,
                            lineHeight: 0.9,
                            fontSize: "clamp(4.5rem, 12vw, 14rem)",
                            letterSpacing: "-0.02em",
                        }}
                        >
                            {score}
                        </div>
                        {/* Tier */}
                        <div style={{
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

                {/* Middle: Progress */}
                <div className="lg:col-span-2 flex flex-col justify-center">
                    {/* Progress header */}
                    <div className="mb-3 flex items-center justify-between text-sm sm:text-base opacity-85">
                        <span>Overall Progress</span>
                        <span>{score}%</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-4 w-full rounded-full bg-white/12 overflow-hidden">
                        <div
                            className="h-4 rounded-full bg-[rgb(var(--color-teal-rgb))] transition-[width] duration-500"
                            style={{ width: `${score}%` }}
                        />
                    </div>

                    {/* Little KPI row */}
                    <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
                        <div className="rounded-xl border border-white/12 bg-white/6 px-4 py-3 text-center">
                            <div className="text-xs sm:text-sm opacity-80">Weekly Apps</div>
                            <div className="mt-1 text-lg sm:text-xl font-medium">6.2</div>
                        </div>
                        <div className="rounded-xl border border-white/12 bg-white/6 px-4 py-3 text-center">
                            <div className="text-xs sm:text-sm opacity-80">Follow-ups</div>
                            <div className="mt-1 text-lg sm:text-xl font-medium">72%</div>
                        </div>
                        <div className="rounded-xl border border-white/12 bg-white/6 px-4 py-3 text-center">
                            <div className="text-xs sm:text-sm opacity-80">Consistency</div>
                            <div className="mt-1 text-lg sm:text-xl font-medium">16/20d</div>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    )
}

export default GritCard;