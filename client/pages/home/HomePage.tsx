import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import { ControlBar } from "@/pages/home/home-components/ControlBar";
import { Column } from "@/pages/home/home-components/Column";
import { JobCard } from "@/pages/home/home-components/JobCards";
import type { JobCardType } from "@/types/jobCardType";
import { convertToJobCardArray } from "@/pages/home/utils/convertToJobCard";
import { api } from "@/global-services/api";
import { useJobRealtime } from "@/pages/home/hooks/useJobRealtime";
import { applyJobChange } from "@/pages/home/utils/applyJobChange";
import { getCurrentUserInfo } from "@/global-services/auth";
import { MultiSelectBar } from "@/pages/home/home-components/MultiSelectBar";
import Fuse from "fuse.js";

import TrashArchiveModal from "@/pages/home/home-components/TrashArchiveModal";
import { DropArea } from "@/pages/home/home-components/DropArea";
import Lottie from "lottie-react";
import { AnimatePresence, motion } from "framer-motion";
import NewApplication from "@/pages/home/home-components/ApplicationModal";
import ConnectEmailModal from "./home-components/ConnectEmailModal";
import { sortJobs } from "@/pages/home/hooks/sortJobs";
import { getThemeData } from "@/utils/getThemeData";
import { MultiSelectProvider } from "@/pages/home/providers/MultiSelectProvider";
import { SelectedJobsProvider } from "@/pages/home/providers/SelectedJobsProvider";
import { UndoRedo } from "@/pages/home/home-components/UndoRedo";
import { UndoRedoProvider } from "@/pages/home/providers/UndoRedoProvider";
import { DragProvider } from "@/pages/home/providers/DragProvider";
import { PageShadow } from "@/pages/home/home-components/PageShadow";

export function HomePage() {
  const themeData = getThemeData();

  // State Variables
  const [selectedOption, setSelectedOption] = useState("new"); // to track the selected sorting option
  const [searchQuery, setSearchQuery] = useState(""); // to track the current search query

  // trash/archive modal state
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isConnectEmailOpen, setIsConnectEmailOpen] = useState(false);

  const [trashItems, setTrashItems] = useState<JobCardType[]>([]);
  const [archiveItems, setArchiveItems] = useState<JobCardType[]>([]);

  const [isLoadingTrash, setIsLoadingTrash] = useState(false);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);

  const [isAlertOpen, setIsAlertOpen] = useState(false); // to track if the alert box is open
  const [newJobsCount, setNewJobsCount] = useState(0); // to track the count of new jobs
  const lastSeenCountRef = useRef<number>(0); // to track the last seen count of jobs
  const alertMessage =
    newJobsCount > 0 ? `You have ${newJobsCount} new jobs` : "No Alerts"; // to hold the current alert message

  // const [isInfoModalOpen, setInfoModalOpen] = useState(false); // to track if the info modal is open
  const [jobs, setJobs] = useState<JobCardType[]>([]); // to hold the list of job cards (initially set to mock data)
  const [emailsLoaded, setEmailsLoaded] = useState(false); // to track if emails have been loaded
  const [isLoadingEmails, setIsLoadingEmails] = useState(false); // to prevent multiple email load attempts
  const [rlsToken, setRlsToken] = useState<string | null>(null); // to hold the RLS JWT token
  const [sortedJobs, setSortedJobs] = useState<JobCardType[]>([]); // to hold the sorted list of job cards
  const [filteredJobs, setFilteredJobs] = useState<JobCardType[]>([]); // to hold the filtered list of job cards based on search
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

  const fuse = useMemo(() => {
    return new Fuse<JobCardType>(jobs, {
      keys: ["title", "column", "date"],
      includeScore: true,
      threshold: 0.1,
      ignoreLocation: true,
      useExtendedSearch: true,
    });
  }, [jobs]);

  useEffect(() => {
    const sorted = sortJobs(selectedOption, jobs);

    if (!searchQuery.trim()) {
      setSortedJobs(sorted);
      setFilteredJobs(sorted);
      return;
    }

    const results = fuse.search(searchQuery);

    const strongMatches = results.filter((r) => (r.score ?? 1) <= 0.4);
    const matchedIdsSet = new Set(strongMatches.map((r) => r.item.id));

    const filtered = sorted
      .filter((job) => matchedIdsSet.has(job.id))
      .map((job) => job);

    setSortedJobs(sorted);
    setFilteredJobs(filtered);
  }, [jobs, searchQuery, selectedOption, fuse, sortJobs]);

  //Loading user data from supabase and setting up web socket for real-time updates
  //THIS ORDER MATTERS DO NOT SHIFT THE LINES BETWEEN ################################
  // ###########################################################################################
  const userInfo = getCurrentUserInfo();
  const userId = userInfo?.uid || "";

  //Pull emails already in the job apps table
  useEffect(() => {
    loadEmails();
  }, []);

  async function loadEmails(force = false) {
    if (!force && (emailsLoaded || isLoadingEmails)) return; // Prevent multiple loads

    setIsLoadingEmails(true);

    try {
      const res = await api("/api/jobs/latest-jobs");

      if (res.status == "success") {
        const cards = convertToJobCardArray(res.jobs);
        console.log("Transformed Job Cards:", cards);
        setJobs(cards);
        lastSeenCountRef.current = cards.length;
        setNewJobsCount;
        setEmailsLoaded(true);
      }
    } catch (error) {
      console.error("Failed to load emails:", error);
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsLoadingEmails(false);
    }
  }

  // Load Trash and Archive Modal Items
  async function loadTrash() {
    if (isLoadingTrash) return;

    setIsLoadingTrash(true);

    try {
      const res = await api("/api/jobs/trash");

      if (res.status === "success" && Array.isArray(res.jobs)) {
        setTrashItems(convertToJobCardArray(res.jobs));
      } else {
        setTrashItems([]);
      }
    } catch (error) {
      console.error("Failed to load trash items:", error);
    } finally {
      setIsLoadingTrash(false);
    }
  }

  async function loadArchive() {
    if (isLoadingArchive) return;

    setIsLoadingArchive(true);

    try {
      const res = await api("/api/jobs/archive");

      if (res.status === "success" && Array.isArray(res.jobs)) {
        setArchiveItems(convertToJobCardArray(res.jobs));
      } else {
        setArchiveItems([]);
      }
    } catch (error) {
      console.error("Failed to load archive items:", error);
    } finally {
      setIsLoadingArchive(false);
    }
  }

  const openTrash = async () => {
    setIsTrashOpen(true);
    await loadTrash();
  };

  const openArchive = async () => {
    setIsArchiveOpen(true);
    await loadArchive();
  };

  // Mint rls jwt token for realtime subscription (30 min expiry)
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await api("/api/auth/setup-frontend-rls-session", {
          method: "POST",
        });
        if (!cancelled) setRlsToken(res?.rls_jwt ?? null);
      } catch (e) {
        console.error("Failed to mint RLS JWT:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Refresh the rls token every 25 minutes
  // a JWT token will be minted each time the user navigates to the home page
  // If the user leaves the home page up and running for long periods the token will be refreshed
  // This ensures that we dont invalidate or miss any realtime updates while the user is active.
  useEffect(() => {
    if (!userId) return;

    const REFRESH_MS = 25 * 60 * 1000;
    let alive = true;

    const tick = async () => {
      try {
        // Optional: skip refresh if tab hidden to reduce churn
        if (document.visibilityState === "hidden") return;

        const res = await api("/api/auth/setup-frontend-rls-session", {
          method: "POST",
        });
        if (alive) {
          setRlsToken(res?.rls_jwt ?? null);
          console.log("🔄 Refreshed RLS token");
        }
      } catch (e) {
        console.warn(
          "RLS token refresh failed; will retry on next interval:",
          e
        );
      }
    };
    const id = setInterval(tick, REFRESH_MS);

    // cleanup on unmount / user change
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [userId]);

  const handleRealtimeChange = useCallback((event: any) => {
    try {
      if (event.type === "INSERT") {
        setNewJobsCount((n) => n + 1);
      }
    } catch (error) {
      console.error("Error handling realtime job change:", error);
    }

    setJobs((prev) => applyJobChange(prev, event));
  }, []);
  //subscribe to realtime changes using the rls token
  useJobRealtime(userId, rlsToken, handleRealtimeChange);

  useEffect(() => {
    if (isAlertOpen) {
      // reset new jobs count after alert is viewed
      setNewJobsCount(0);
      lastSeenCountRef.current = jobs.length;
    }
  }, [isAlertOpen, jobs]);

  // track whether the Accepted column has been switched to Rejected
  const [acceptedSwitchedToRejected, setAcceptedSwitchedToRejected] =
    useState(true);

  // Column configuration for the Kanban board
  // Each column has an id, title, and background color
  const [baseConfig, setBaseConfig] = useState([
    { id: "applied", title: "Applied", bg: "var(--applied-column-bg)" },
    { id: "interview", title: "Interview", bg: "var(--interview-column-bg)" },
    { id: "offer", title: "Offer", bg: "var(--offer-column-bg)" },
    { id: "accepted", title: "Accepted", bg: "var(--accepted-column-bg)" },
  ]);

  const switchAcceptedToRejected = useCallback(() => {
    setBaseConfig((prevConfig) => {
      if (prevConfig[3].id === "accepted") {
        return [
          { id: "applied", title: "Applied", bg: "var(--applied-column-bg)" },
          {
            id: "interview",
            title: "Interview",
            bg: "var(--interview-column-bg)",
          },
          { id: "offer", title: "Offer", bg: "var(--offer-column-bg)" },
          {
            id: "rejected",
            title: "Rejected",
            bg: "var(--rejected-column-bg)",
          },
        ];
      } else {
        // Column configuration for the Kanban board
        // Each column has an id, title, and background color
        return [
          { id: "applied", title: "Applied", bg: "var(--applied-column-bg)" },
          {
            id: "interview",
            title: "Interview",
            bg: "var(--interview-column-bg)",
          },
          { id: "offer", title: "Offer", bg: "var(--offer-column-bg)" },
          {
            id: "accepted",
            title: "Accepted",
            bg: "var(--accepted-column-bg)",
          },
        ];
      }
    });
  }, []);

  useEffect(() => {
    switchAcceptedToRejected();
  }, [acceptedSwitchedToRejected]);

  const toggleAcceptedToRejected = () => {
    setAcceptedSwitchedToRejected((prev) => !prev);
  };

  const columnConfig = useMemo(() => {
    const hasStagingJobs = jobs.some(
      (job) => job.column?.toLowerCase() === "staging"
    );

    const columns = [...baseConfig];

    if (hasStagingJobs) {
      columns.push({
        id: "staging",
        title: "Processing",
        bg: "var(--color-light-gray)",
      });
    }
    return columns;
  }, [jobs, baseConfig]);

  const matchOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    filteredJobs.forEach((job, idx) => map.set(job.id, idx));
    return map;
  }, [filteredJobs]);

  const [jobAppModalPayload, setJobAppModalPayload] = useState<
    string | JobCardType | null
  >(null);

  const openJobAppModal = (payload: string | JobCardType | null) => {
    setJobAppModalPayload(payload);
    setIsJobAppModalOpen(true);
  };

  const jobsByColumn = useMemo(() => {
    return columnConfig.reduce<Record<string, JSX.Element[]>>((acc, column) => {
      const jobsInColumn = sortedJobs.filter(
        (job) => job.column?.toLowerCase?.() === column.id
      );

      const orderedJobs = [...jobsInColumn].sort((a, b) => {
        if (a.reviewNeeded && !b.reviewNeeded) return -1;
        if (!a.reviewNeeded && b.reviewNeeded) return 1;

        const aMatched = matchOrderMap.has(a.id);
        const bMatched = matchOrderMap.has(b.id);

        if (aMatched && !bMatched) return -1;
        if (!aMatched && bMatched) return 1;
        if (aMatched && bMatched)
          return (
            (matchOrderMap.get(a.id) ?? 0) - (matchOrderMap.get(b.id) ?? 0)
          );
        return 0;
      });

      acc[column.id] = orderedJobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          dimmed={!!searchQuery && !matchOrderMap.has(job.id)}
          openJobAppModal={openJobAppModal}
        />
      ));

      return acc;
    }, {});
  }, [sortedJobs, matchOrderMap, columnConfig, searchQuery]);

  // show loading state while emails are being fetched
  return (
    <AnimatePresence mode="wait">
      {isLoadingEmails ? (
        <motion.div
          key="loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full h-full flex items-center justify-center"
        >
          <Lottie
            animationData={themeData.loadingAnimation}
            loop
            className="flex w-150 h-150"
          />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full h-full flex items-center justify-center flex-col relative"
        >
          {/* ^ Page Container ^ */}
          <MultiSelectProvider>
            <UndoRedoProvider>
              <DragProvider>
                <SelectedJobsProvider>
                  <div className="w-full h-full flex flex-col items-center gap-4 p-4 overflow-y-auto">
                    {/* ^ Content Container ^ */}
                    <ControlBar // see ControlBar.tsx
                      selectedOption={selectedOption}
                      setSelectedOption={setSelectedOption}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      isAlertOpen={isAlertOpen}
                      setIsAlertOpen={setIsAlertOpen}
                      alertMessage={alertMessage}
                      setConnectEmailOpen={setIsConnectEmailOpen}
                      // infoModalLabel={isInfoModalOpen ? "Info" : ""}
                      // isInfoModalOpen={isInfoModalOpen}
                      // setInfoModalOpen={setInfoModalOpen}
                      onOpenTrash={openTrash}
                      onOpenArchive={openArchive}
                    />
                    {/* Kan Ban Columns */}
                    <div className="flex align-items:stretch gap-4 w-full">
                      {columnConfig.map(
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
                              column.id === "accepted" ||
                              column.id === "rejected"
                            }
                            onToggleReject={toggleAcceptedToRejected}
                            isHighlighted={isHighlighted}
                            openJobAppModal={openJobAppModal}
                          >
                            {jobsByColumn[column.id]}
                            {/* render the JobCards associated with the columns id */}
                          </Column>
                        )
                      )}
                    </div>
                  </div>

                  {/* Multi-Select Action Bar */}
                  <MultiSelectBar setIsHighlighted={setIsHighlighted} />

                  {/* Undo Bar*/}
                  <UndoRedo />

                  {/* Page Shadow */}
                  <PageShadow />

                  <NewApplication
                    isOpen={isJobAppModalOpen}
                    setIsOpen={setIsJobAppModalOpen}
                    payload={jobAppModalPayload}
                    onSave={(
                      updated: Partial<JobCardType> & { id?: string }
                    ) => {
                      // merge updated job into local state
                      if (updated?.id) {
                        setJobs((prev) =>
                          prev.map((j) =>
                            j.id === updated.id ? (updated as JobCardType) : j
                          )
                        );
                      } else {
                        // if backend returns no id try to update by some fallback
                        setJobs((prev) => [updated as JobCardType, ...prev]);
                      }
                    }}
                  />

                  <TrashArchiveModal
                    isOpen={isTrashOpen}
                    onClose={() => setIsTrashOpen(false)}
                    mode="trash"
                    items={trashItems}
                    onAction={async (action, ids) => {
                      if (!ids || ids.length === 0) return;

                      try {
                        if (action === "undelete") {
                          // toggle deleted state
                          await api("/api/jobs/set-delete", {
                            method: "POST",
                            body: JSON.stringify({ provider_message_ids: ids }),
                          });

                          // remove from modal list locally
                          setTrashItems((prev) =>
                            prev.filter((j) => !ids.includes(j.id))
                          );

                          // refresh main jobs list so restored items appear
                          await loadEmails(true);
                        } else if (action === "delete_permanently") {
                          // permanently delete
                          await api("/api/jobs/permanently-delete", {
                            method: "POST",
                            body: JSON.stringify({
                              provider_message_ids: ids,
                              confirm: true,
                            }),
                          });

                          setTrashItems((prev) =>
                            prev.filter((j) => !ids.includes(j.id))
                          );
                        }
                      } catch (err) {
                        console.error("Trash action failed:", err);

                        await loadTrash();
                      }
                    }}
                  />

                  <TrashArchiveModal
                    isOpen={isArchiveOpen}
                    onClose={() => setIsArchiveOpen(false)}
                    mode="archive"
                    items={archiveItems}
                    onAction={async (action, ids) => {
                      if (!ids || ids.length === 0) return;

                      try {
                        if (action === "unarchive") {
                          // toggle archived state on server
                          await api("/api/jobs/set-archive", {
                            method: "POST",
                            body: JSON.stringify({ provider_message_ids: ids }),
                          });

                          // remove from archive list locally
                          setArchiveItems((prev) =>
                            prev.filter((j) => !ids.includes(j.id))
                          );

                          // refresh main jobs list so unarchived items show
                          await loadEmails(true);
                        }
                      } catch (err) {
                        console.error("Archive action failed:", err);
                        await loadArchive();
                      }
                    }}
                  />

                  <ConnectEmailModal
                    isOpen={isConnectEmailOpen}
                    onClose={() => setIsConnectEmailOpen(false)}
                  />

                  <DropArea />
                </SelectedJobsProvider>
              </DragProvider>
            </UndoRedoProvider>
          </MultiSelectProvider>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
