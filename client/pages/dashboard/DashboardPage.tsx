import {
  Card,
  GritCard,
  AppsOverTimeCard,
  AppsByStageCard,
  SplitByStageCard,
  AvgTimeInStageCard,
  AvgAppsPerWeekCard,
  ActivityHeatmap
} from "./dashboard-components";
import { useDashboardRealtimeRefresh } from "@/pages/dashboard/hooks/useDashboardRealtimeRefresh";
import infoIcon from "@/assets/icons/info.svg";

export function DashboardPage() {
  const refreshKey = useDashboardRealtimeRefresh();

  return (
    <div className="w-full min-h-screen overflow-x-hidden">
      {/* Content Grid */}
      <main
        key={refreshKey}
        className="w-full px-4 py-5 md:px-6 md:py-6 xl:px-8"
      >
        {/* Top: Grit score + stage timing */}
        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="md:col-span-2">
            <GritCard height="14rem" />
          </div>
          <DashboardContextCard />
        </section>

        {/* Bento dashboard grid */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <AvgTimeInStageCard className="h-full" />
          <div className="md:col-span-2">
            <AppsOverTimeCard className="h-full" />
          </div>

          <div className="md:col-span-2">
            <AvgAppsPerWeekCard className="h-full" />
          </div>
          <ActivityHeatmap className="h-full" />

          <AppsByStageCard className="h-full" />
          <div className="md:col-span-2">
            <SplitByStageCard className="h-full" />
          </div>
        </section>
      </main>
    </div>
  )
}

function DashboardContextCard() {
  return (
    <Card
      title="Reading the Dashboard"
      subtitle="Quick reference"
      height="14rem"
    >
      <div className="flex h-full w-full flex-col justify-evenly gap-4 text-left">
        <p className="m-0 text-sm leading-relaxed opacity-85">
          This dashboard summarizes your recent job-search activity, application
          momentum, stage balance, and follow-through patterns.
        </p>
        <div className="flex items-center gap-3 rounded-md border border-[rgba(var(--primary-five-rgb),0.14)] bg-white/[0.045] px-3 py-2.5">
          <img
            src={infoIcon}
            alt=""
            aria-hidden="true"
            className="h-4 w-4 shrink-0"
            style={{ filter: "var(--icon-filter)", opacity: 0.78 }}
          />
          <p className="m-0 text-xs leading-relaxed opacity-80">
            Hover over each info icon to learn how JAICE measures each signal.
          </p>
        </div>
      </div>
    </Card>
  );
}

export default DashboardPage;
