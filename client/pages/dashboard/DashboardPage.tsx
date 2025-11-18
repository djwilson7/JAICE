import {
  GritCard,
  AppsByCategoryCard,
  AppsOverTimeCard,
  AppsByStageCard,
  SplitByStageCard,
  AvgTimeInStageCard,
  AvgAppsPerWeekCard,
} from "./dashboard-components";

export function DashboardPage() {
  return (
    <div className="w-full h-screen overflow-hidden">
      {/* Content Grid */}
      <main className="pl-[11rem] px-6 py-6 w-full h-full">
        {/* Top: Grit score */}
        <section className="mb-6 grid grid-cols-1 xl:grid-cols-3">
          <div className="xl:col-span-3">
            <GritCard height="18rem"/>
          </div>
        </section>

        {/* 2 x 3 card grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 grid-rows-2 gap-6">
          <AppsOverTimeCard className="h-full" />          
          <AppsByCategoryCard className="h-full" />          
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