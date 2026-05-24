import {
  GritCard,
  AppsOverTimeCard,
  AppsByStageCard,
  SplitByStageCard,
  AvgTimeInStageCard,
  AvgAppsPerWeekCard,
  ActivityHeatmap
} from "./dashboard-components";
import { useDashboardRealtimeRefresh } from "@/pages/dashboard/hooks/useDashboardRealtimeRefresh";

export function DashboardPage() {
  const refreshKey = useDashboardRealtimeRefresh();

  return (
    <div className="w-full min-h-screen">
      {/* Content Grid */}
      <main
        key={refreshKey}
        className="w-full p-2"
      >
        {/* Top: Grit score */}
        <section className="mb-6 grid grid-cols-1 xl:grid-cols-3">
          <div className="xl:col-span-3">
            <GritCard height="18rem"/>
          </div>
        </section>

        {/* 2 x 3 card grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 grid-rows-2 gap-6">
          <AppsOverTimeCard className="h-full" />          
          <ActivityHeatmap className="h-full" />
          <SplitByStageCard className="h-full" />          
          <AvgTimeInStageCard className="h-full" />          
          <AppsByStageCard className="h-full" />          
          <AvgAppsPerWeekCard className="h-full" />      
        </section>
      </main>
    </div>
  )
}

export default DashboardPage;
