import { useEffect, useState } from "react";
import { ControlBar } from "@/pages/home/home-components/control-bar/ControlBar";
import { Column } from "@/pages/home/home-components/column/Column";
import type { JobCardType } from "@/types/jobCardType";
import { getCurrentUserInfo } from "@/global-services/auth";
import { MultiSelectBar } from "@/pages/home/home-components/modal/MultiSelectBar";
import { DropArea } from "@/pages/home/home-components/column/DropArea";
import { AnimatePresence } from "framer-motion";
import { UndoRedo } from "@/pages/home/home-components/modal/UndoRedo";
import { PageShadow } from "@/pages/home/home-components/page/PageShadow";
import { ConnectEmailButton } from "@/pages/home/home-components/control-bar/ConnectEmailButton";
import { SearchBar } from "@/global-components/SearchBar";
import { ArchiveModalButton } from "@/pages/home/home-components/control-bar/ArchiveModalButton";
import { TrashModalButton } from "@/pages/home/home-components/control-bar/TrashModalButton";
import { MultiSelectButton } from "@/pages/home/home-components/control-bar/MultiSelectButton";
import { FilterButton } from "@/pages/home/home-components/control-bar/FilterButton";
import { AlertBox } from "@/pages/home/home-components/control-bar/AlertBox";
import { KanbanContent } from "@/pages/home/home-components/page/KanbanContent";
import { useTrashActions } from "@/pages/home/hooks/useTrashActions";
import { useArchiveActions } from "@/pages/home/hooks/useArchiveActions";
import { LoadingAnimation } from "@/pages/home/home-components/page/LoadingAnimation";
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
    sortOption,
  });

  const userInfo = getCurrentUserInfo();
  const userId = userInfo?.uid || "";
  const { newJobsCount, resetNewJobsCount } = useRealtimeJobs(userId, setJobs);

  // trash/archive modal state
  const [isConnectEmailOpen, setIsConnectEmailOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false); // to track if the alert box is open
  const alertMessage =
    newJobsCount > 0 ? `You have ${newJobsCount} new jobs` : "No Alerts"; // to hold the current alert message

  const [isJobAppModalOpen, setIsJobAppModalOpen] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState<string | null>(null); // to track if a column is highlighted

  const [viewportHeight, setViewportHeight] = useState(
    () => window.innerHeight
  );

  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isAlertOpen) resetNewJobsCount();
  }, [isAlertOpen]);

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <LoadingAnimation />
      ) : (
        <HomePageContentProviders>
          {/* ^ Page Container ^ */}
          <PageContent>
            {/* Control Bar */}
            <ControlBar>
              <AlertBox
                isOpen={isAlertOpen}
                setIsOpen={setIsAlertOpen}
                alertMessage={alertMessage}
              />
              <div className="flex relative gap-4 w-full h-full justify-end items-center">
                <ConnectEmailButton setIsOpen={setIsConnectEmailOpen} />
                <ArchiveModalButton setIsOpen={archive.open} />
                <TrashModalButton setIsOpen={trash.open} />
                <MultiSelectButton />
              </div>
            </ControlBar>
            <ControlBar>
              <ExpandCollapseButton />
              <div className="flex relative gap-4 w-full h-full justify-end items-center">
                <SearchBar
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
                <FilterButton
                  selectedOption={sortOption}
                  setSelectedOption={setSortOption}
                />
              </div>
            </ControlBar>
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
                    viewportHeight={viewportHeight}
                    isHighlighted={isHighlighted}
                    openJobAppModal={openJobAppModal}
                  >
                    {jobsByColumn[column.id]}
                  </Column>
                )
              )}
            </KanbanContent>
          </PageContent>

          {/* Modals and popups that exist outside the main page content */}
          <MultiSelectBar setIsHighlighted={setIsHighlighted} />
          <UndoRedo />
          <PageShadow />

          <ConnectEmailModal
            isOpen={isConnectEmailOpen}
            onClose={() => setIsConnectEmailOpen(false)}
          />

          <DropArea />

          <NewApplication
            isOpen={isJobAppModalOpen}
            setIsOpen={setIsJobAppModalOpen}
            payload={jobAppModalPayload}
            onSave={saveJob}
          />

          <TrashArchiveModal
            isOpen={trash.isOpen}
            onClose={trash.close}
            mode="trash"
            items={trash.items}
            onAction={trash.handleAction}
          />

          <TrashArchiveModal
            isOpen={archive.isOpen}
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
