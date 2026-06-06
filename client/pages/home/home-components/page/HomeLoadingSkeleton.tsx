import { motion } from "framer-motion";
import { kanBanColumns } from "@/pages/home/home-components/column/KanBanColumn";
import { PageContent } from "@/pages/home/home-components/page/PageContent";

const SKELETON_CARDS_PER_COLUMN = 3;
const HOME_LOADING_COLUMN_IDS = new Set([
  "applied",
  "interview",
  "offer",
  "accepted",
  "rejected",
]);
const skeletonCards = Array.from({ length: SKELETON_CARDS_PER_COLUMN });

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`home-skeleton-block ${className}`} />;
}

function HomeControlBarSkeleton() {
  return (
    <div className="home-action-toolbar-wrap p-1" aria-hidden="true">
      <div className="control-bar home-action-toolbar home-skeleton-toolbar">
        <div className="home-action-group home-action-group-left">
          <SkeletonBlock className="home-skeleton-control-square" />
          <SkeletonBlock className="home-skeleton-control-search" />
          <SkeletonBlock className="home-skeleton-control-square" />
        </div>
        <div className="home-action-group home-action-group-center">
          <SkeletonBlock className="home-skeleton-control-square" />
          <SkeletonBlock className="home-skeleton-control-square" />
        </div>
        <div className="home-action-group home-action-group-right">
          <SkeletonBlock className="home-skeleton-control-square" />
          <SkeletonBlock className="home-skeleton-control-square" />
          <SkeletonBlock className="home-skeleton-control-square" />
          <SkeletonBlock className="home-skeleton-control-square" />
          <SkeletonBlock className="home-skeleton-control-square" />
        </div>
      </div>
    </div>
  );
}

function HomeCardSkeleton({ index }: { index: number }) {
  return (
    <div className="job-card home-skeleton-card" aria-hidden="true">
      <div className="flex w-full items-center justify-center p-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <SkeletonBlock className={`home-skeleton-title-line home-skeleton-title-line-${index}`} />
          <div className="flex min-w-0 items-center justify-between gap-3">
            <SkeletonBlock className="home-skeleton-date-line" />
            <SkeletonBlock className="home-skeleton-time-line" />
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeColumnSkeleton({
  column,
}: {
  column: (typeof kanBanColumns)[number];
}) {
  return (
    <div className="flex h-full min-h-full min-w-[19rem] flex-[0_0_19rem] self-stretch 2xl:min-w-[21rem] 2xl:flex-[1_0_21rem]">
      <div
        className="kanban-column-surface home-skeleton-column flex h-full min-h-full w-full flex-col px-2 py-4 corner-radius"
        style={{ background: column.bg }}
      >
        <div className="flex w-full flex-col items-center justify-center gap-[2px] overflow-hidden text-center">
          <h2 className="column-title-text w-full overflow-hidden whitespace-nowrap text-center text-ellipsis">
            {column.title}
          </h2>
          <SkeletonBlock className="home-skeleton-column-description" />
          <SkeletonBlock className="home-skeleton-column-count" />
        </div>

        <div className="flex w-full py-4">
          <div className="column-divider w-full" />
        </div>

        <div className="kanban-column-scroll-frame flex min-h-0 w-full flex-1">
          <div className="kanban-column-scroll flex h-full min-h-0 w-full flex-col items-center gap-2 py-0 pl-0 pr-0.5">
            <div className="flex w-full flex-col items-center gap-2">
              {skeletonCards.map((_, cardIndex) => (
                <HomeCardSkeleton key={cardIndex} index={cardIndex} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeLoadingSkeleton() {
  const visibleColumns = kanBanColumns.filter(
    (column) =>
      column.visible !== false && HOME_LOADING_COLUMN_IDS.has(column.id)
  );

  return (
    <motion.div
      key="loader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="home-loading-skeleton flex h-full min-h-0 w-full"
      role="status"
      aria-live="polite"
      aria-label="Loading job applications"
    >
      <PageContent>
        <HomeControlBarSkeleton />
        <div className="kanban-content-frame flex min-h-0 w-full flex-1" aria-hidden="true">
          <div className="kanban-content-scroll flex min-h-0 w-full flex-1 overflow-x-auto overflow-y-visible">
            <div className="flex min-h-0 min-w-full items-stretch gap-4 p-1">
              {visibleColumns.map((column) => (
                <HomeColumnSkeleton key={column.id} column={column} />
              ))}
            </div>
          </div>
        </div>
      </PageContent>
    </motion.div>
  );
}
