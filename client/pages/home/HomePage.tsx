import { useEffect, useState } from "react";
import { ControlBar } from "@/pages/home/home-components/ControlBar";
import { Column } from "@/pages/home/home-components/Column";
import type { JobCardType } from "@/types/jobCardType";
import { getCurrentUserInfo } from "@/global-services/auth";
import { MultiSelectBar } from "@/pages/home/home-components/MultiSelectBar";
import { DropArea } from "@/pages/home/home-components/DropArea";
import { AnimatePresence } from "framer-motion";
import { UndoRedo } from "@/pages/home/home-components/UndoRedo";
import { PageShadow } from "@/pages/home/home-components/PageShadow";
import { ConnectEmailButton } from "@/pages/home/home-components/ConnectEmailButton";
import { SearchBar } from "@/global-components/SearchBar";
import { ArchiveModalButton } from "@/pages/home/home-components/ArchiveModalButton";
import { TrashModalButton } from "@/pages/home/home-components/TrashModalButton";
import { MultiSelectButton } from "@/pages/home/home-components/MultiSelectButton";
import { FilterButton } from "@/pages/home/home-components/FilterButton";
import { AlertBox } from "@/pages/home/home-components/AlertBox";
import { KanbanContent } from "@/pages/home/home-components/KanbanContent";
import { useTrashActions } from "@/pages/home/hooks/useTrashActions";
import { useArchiveActions } from "@/pages/home/hooks/useArchiveActions";
import { LoadingAnimation } from "@/pages/home/home-components/LoadingAnimation";
import { PageContent } from "@/pages/home/home-components/PageContent";
import { useJobsLoader } from "@/pages/home/hooks/useJobsLoader";
import { useJobSearchAndSort } from "@/pages/home/hooks/useJobSearchAndSort";
import { useRealtimeJobs } from "@/pages/home/hooks/useRealTimeJobs";
import { useKanbanColumns } from "@/pages/home/hooks/useKanbanColumns";
import { useKanbanJobs } from "@/pages/home/hooks/useKanbanJobs";
import { useJobActions } from "@/pages/home/hooks/useJobAction";
import { HomePageContentProviders } from "@/pages/home/home-components/HomePageContentProviders";
import TrashArchiveModal from "@/pages/home/home-components/TrashArchiveModal";
import NewApplication from "@/pages/home/home-components/ApplicationModal";
import ConnectEmailModal from "@/pages/home/home-components/ConnectEmailModal";
import { ExpandCollapseButton } from "@/pages/home/home-components/ExpandCollapseButton";

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

  const { columns, toggleAcceptedRejected } = useKanbanColumns(jobs);

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
                    key={column.id} // unique key for React
                    id={column.id} // column id
                    title={column.title} // column title
                    bg={column.bg} // column background color
                    count={jobsByColumn[column.id]?.length || 0} // pass down the count of job cards in the column
                    viewportHeight={viewportHeight}
                    showToggleRejectButton={
                      column.id === "accepted" || column.id === "rejected"
                    }
                    onToggleReject={toggleAcceptedRejected}
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
