import { useEffect, useState } from "react";
import { ControlBar } from "@/pages/home/home-components/control-bar/ControlBar";
import { Column } from "@/pages/home/home-components/column/Column";
import type { JobCardType } from "@/types/jobCardType";
import { getCurrentUserInfo } from "@/global-services/auth";
import { MultiSelectBar } from "@/pages/home/home-components/modal/MultiSelectBar";
import { AnimatePresence } from "framer-motion";
import { UndoRedo } from "@/pages/home/home-components/modal/UndoRedo";
import { ConnectEmailButton } from "@/pages/home/home-components/control-bar/ConnectEmailButton";
import { SearchBar } from "@/global-components/SearchBar";
import { ArchiveModalButton } from "@/pages/home/home-components/control-bar/ArchiveModalButton";
import { TrashModalButton } from "@/pages/home/home-components/control-bar/TrashModalButton";
import { MultiSelectButton } from "@/pages/home/home-components/control-bar/MultiSelectButton";
import { FilterButton } from "@/pages/home/home-components/control-bar/FilterButton";
import { NewApplicationButton } from "@/pages/home/home-components/control-bar/NewApplicationButton";
import { KanbanContent } from "@/pages/home/home-components/page/KanbanContent";
import { useTrashActions } from "@/pages/home/hooks/useTrashActions";
import { useArchiveActions } from "@/pages/home/hooks/useArchiveActions";
import { HomeLoadingSkeleton } from "@/pages/home/home-components/page/HomeLoadingSkeleton";
import { PageContent } from "@/pages/home/home-components/page/PageContent";
import { useJobsLoader } from "@/pages/home/hooks/useJobsLoader";
import { useJobSearchAndSort } from "@/pages/home/hooks/useJobSearchAndSort";
import { useRealtimeJobs } from "@/pages/home/hooks/useRealTimeJobs";
import { useKanbanColumns } from "@/pages/home/hooks/useKanbanColumns";
import { useKanbanJobs } from "@/pages/home/hooks/useKanbanJobs";
import { useJobActions } from "@/pages/home/hooks/useJobAction";
import { HomePageContentProviders } from "@/pages/home/home-components/page/HomePageContentProviders";
import TrashArchiveModal from "@/pages/home/home-components/modal/TrashArchiveModal";
import NewApplication from "@/pages/home/home-components/modal/ApplicationModal";
import ConnectEmailModal from "@/pages/home/home-components/modal/ConnectEmailModal";
import { ExpandCollapseButton } from "@/pages/home/home-components/control-bar/ExpandCollapseButton";
import {
  JOB_LOCAL_CHANGE_EVENT,
  type JobLocalChangeDetail,
} from "@/pages/home/utils/jobLocalChangeEvent";

export function HomePage() {
  const [jobAppModalPayload, setJobAppModalPayload] = useState<
    string | JobCardType | null
  >(null);

  const { jobs, setJobs, reloadJobs, isLoading } = useJobsLoader();
  const { saveJob } = useJobActions(setJobs);

  const trash = useTrashActions({
    onRestore: () => reloadJobs(),
  });

  const archive = useArchiveActions({
    onRestore: () => reloadJobs(),
  });

  const {
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    sortedJobs,
    matchOrderMap,
    hasSearch,
  } = useJobSearchAndSort(jobs);

  const { columns } = useKanbanColumns(jobs);

  const openJobAppModal = (payload: string | JobCardType | null) => {
    setJobAppModalPayload(payload);
    setIsJobAppModalOpen(true);
  };

  const jobsByColumn = useKanbanJobs({
    jobs: sortedJobs,
    columns,
    matchOrderMap,
    hasSearch,
    openJobAppModal,
  });

  const userInfo = getCurrentUserInfo();
  const userId = userInfo?.uid || "";
  useRealtimeJobs(userId, setJobs);

  // trash/archive modal state
  const [isConnectEmailOpen, setIsConnectEmailOpen] = useState(false);

  const [isJobAppModalOpen, setIsJobAppModalOpen] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState<string | null>(null); // to track if a column is highlighted

  useEffect(() => {
    const handleLocalJobChange = (event: Event) => {
      const { after } = (event as CustomEvent<JobLocalChangeDetail>).detail;

      setJobs((prev) => {
        if (after.isArchived || after.isDeleted) {
          return prev.filter((job) => String(job.id) !== String(after.id));
        }

        const exists = prev.some((job) => String(job.id) === String(after.id));
        if (!exists) return [after, ...prev];

        return prev.map((job) =>
          String(job.id) === String(after.id) ? after : job
        );
      });
    };

    window.addEventListener(JOB_LOCAL_CHANGE_EVENT, handleLocalJobChange);

    return () => {
      window.removeEventListener(JOB_LOCAL_CHANGE_EVENT, handleLocalJobChange);
    };
  }, [setJobs]);

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <HomeLoadingSkeleton />
      ) : (
        <HomePageContentProviders>
          {/* ^ Page Container ^ */}
          <PageContent>
            {/* Control Bar */}
            <div className="home-action-toolbar-wrap p-1">
              <ControlBar fitParent className="home-action-toolbar">
                <div className="home-action-group home-action-group-left">
                  <ExpandCollapseButton compact />
                  <SearchBar
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    className="home-action-search"
                  />
                  <FilterButton
                    selectedOption={sortOption}
                    setSelectedOption={setSortOption}
                    compact
                  />
                </div>
                <div className="home-action-group home-action-group-center">
                  <UndoRedo />
                </div>
                <div className="home-action-group home-action-group-right">
                  <ConnectEmailButton setIsOpen={setIsConnectEmailOpen} compact />
                  <NewApplicationButton
                    onClick={() => openJobAppModal("applied")}
                    compact
                  />
                  <ArchiveModalButton setIsOpen={archive.open} compact />
                  <TrashModalButton setIsOpen={trash.open} compact />
                  <MultiSelectButton compact />
                </div>
              </ControlBar>
            </div>
            <MultiSelectBar setIsHighlighted={setIsHighlighted} />
            {/* Kan Ban Columns */}
            <KanbanContent>
              {columns.map(
                (
                  column // iterate over each column in the config
                ) => (
                  <Column
                    column={column}
                    key={column.id} // unique key for React
                    count={jobsByColumn[column.id]?.length || 0} // pass down the count of job cards in the column
                    isHighlighted={isHighlighted}
                  >
                    {jobsByColumn[column.id]}
                  </Column>
                )
              )}
            </KanbanContent>
          </PageContent>

          {/* Modals and popups that exist outside the main page content */}
          <ConnectEmailModal
            isOpen={isConnectEmailOpen}
            onClose={() => setIsConnectEmailOpen(false)}
          />

          <NewApplication
            isOpen={isJobAppModalOpen}
            setIsOpen={setIsJobAppModalOpen}
            payload={jobAppModalPayload}
            onSave={saveJob}
          />

          <TrashArchiveModal
            isOpen={trash.isOpen}
            isLoading={trash.isLoading}
            onClose={trash.close}
            mode="trash"
            items={trash.items}
            onAction={trash.handleAction}
          />

          <TrashArchiveModal
            isOpen={archive.isOpen}
            isLoading={archive.isLoading}
            onClose={archive.close}
            mode="archive"
            items={archive.items}
            onAction={archive.handleAction}
          />
        </HomePageContentProviders>
      )}
    </AnimatePresence>
  );
}
