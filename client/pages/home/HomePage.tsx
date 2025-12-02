// import { localfiles } from "@/directory/path/to/localimport";

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
import loadingAnimationDark from "@/assets/loaders/CircleVenn.json";
import loadingAnimationLight from "@/assets/loaders/CircleVennLight.json";
import loadingAnimationBW from "@/assets/loaders/CircleVennBW.json";

import Lottie from "lottie-react";
import { AnimatePresence, motion } from "framer-motion";
import NewApplication from "@/pages/home/home-components/ApplicationModal";
import undo from "@/assets/icons/undo-alt.svg";
import redo from "@/assets/icons/redo-alt.svg";
import Button from "@/global-components/button";
// import { fetchJobById } from "@/global-services/database";

export function HomePage() {
  // State Variables
  const [isMultiSelecting, setIsMultiSelecting] = useState(false); // to track if multi-select mode is active
  const [selectedJobs, setSelectedJobs] = useState<JobCardType[]>([]); // to track the selected job cards
  const [selectedOption, setSelectedOption] = useState("default"); // to track the selected sorting option
  const [isMenuOpen, setMenuOpen] = useState(false); // to track if the options menu is open
  const [isSearching, setIsSearching] = useState(false); // to track if the search bar is active
  const [searchQuery, setSearchQuery] = useState(""); // to track the current search query

  const [isAlertOpen, setIsAlertOpen] = useState(false); // to track if the alert box is open
  const [newJobsCount, setNewJobsCount] = useState(0); // to track the count of new jobs
  const lastSeenCountRef = useRef<number>(0); // to track the last seen count of jobs
  const alertMessage =
    newJobsCount > 0 ? `You have ${newJobsCount} new jobs` : "No Alerts"; // to hold the current alert message

  const [isInfoModalOpen, setInfoModalOpen] = useState(false); // to track if the info modal is open
  const [jobs, setJobs] = useState<JobCardType[]>([]); // to hold the list of job cards (initially set to mock data)
  const itemDraggedRef = useRef<JobCardType | null>(null); // to track the item being dragged
  const isOverRef = useRef<string | null>(null); // to track which column is being hovered over during drag-and-drop
  const [isDragging, setIsDragging] = useState(false); // to track if an item is being dragged
  const [emailsLoaded, setEmailsLoaded] = useState(false); // to track if emails have been loaded
  const [isLoadingEmails, setIsLoadingEmails] = useState(false); // to prevent multiple email load attempts
  const [rlsToken, setRlsToken] = useState<string | null>(null); // to hold the RLS JWT token
  const [sortedJobs, setSortedJobs] = useState<JobCardType[]>([]); // to hold the sorted list of job cards
  const [filteredJobs, setFilteredJobs] = useState<JobCardType[]>([]); // to hold the filtered list of job cards based on search
  const [isDeleting, setIsDeleting] = useState(false); // to track if the delete confirmation modal is open
  const [isJobAppModalOpen, setIsJobAppModalOpen] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState<string | null>(null); // to track if a column is highlighted

  const [viewportHeight, setViewportHeight] = useState(
    () => window.innerHeight
  );

  // undo action for last change (delete or move)
  type UndoAction =
    | { type: "delete"; job: JobCardType }
    | { type: "move"; id: string; from: string; to: string; job?: JobCardType }
    | { type: "deleteMultiple"; jobs: JobCardType[] }
    | { type: "moveMultiple"; jobs: JobCardType[]; to: string }
    | { type: "archiveMultiple"; jobs: JobCardType[] };

  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);

  // mirror the stack in a ref for syncronus pop and push actions
  const undoRef = useRef<UndoAction[]>([]);
  const redoRef = useRef<UndoAction[]>([]);

  //This hides the redo/undo button during alternate interactions.
  // Searching, multiselecting, info modal, dragging, editing, deleting, adding new apps
  const [showRedoUndo, setShowRedoUndo] = useState(
    undoStack.length > 0 || redoStack.length > 0
  );
  useEffect(() => {
    const hasRedoUndo = undoStack.length > 0 || redoStack.length > 0; // If either stack has items
    const userIsSearching = searchQuery.trim().length > 0; // If the user is actively searching
    const userIsMultiSelecting = isMultiSelecting; // If the user is multi selecting jobs
    const userHasInfoModalOpen = isInfoModalOpen; // If the user has the info modal open
    const userIsDragging = isDragging; // If the user is not currently dragging an item
    const userIsDeleting = isDeleting;
    const userHasNewAppOpen = isJobAppModalOpen;
    const shouldShow =
      hasRedoUndo &&
      !userIsSearching &&
      !userIsMultiSelecting &&
      !userHasInfoModalOpen &&
      !userIsDragging &&
      !userHasNewAppOpen &&
      !userIsDeleting;
    setShowRedoUndo(shouldShow);
  }, [
    undoStack,
    redoStack,
    isMultiSelecting,
    searchQuery,
    isInfoModalOpen,
    isDragging,
    isDeleting,
    isJobAppModalOpen,
  ]);

  const isBWMode =
    document.documentElement.getAttribute("data-contrast") === "bw";
  const initialTheme =
    document.documentElement.getAttribute("data-theme") === "light";
  const [loadingAnimation, setLoadingAnimation] = useState<any>(
    isBWMode
      ? loadingAnimationBW
      : initialTheme
      ? loadingAnimationLight
      : loadingAnimationDark
  );

  useEffect(() => {
    const updateLoadingSpinner = () => {
      const htmlTheme = document.documentElement.getAttribute("data-theme");
      const htmlContrast =
        document.documentElement.getAttribute("data-contrast");
      if (htmlContrast === "bw") {
        setLoadingAnimation(loadingAnimationBW);
        return;
      }
      setLoadingAnimation(
        htmlTheme === "light" ? loadingAnimationLight : loadingAnimationDark
      );
    };
    updateLoadingSpinner();
    window.addEventListener("themechange", updateLoadingSpinner);
    return () =>
      window.removeEventListener("themechange", updateLoadingSpinner);
  }, []);

  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sortByOptions = [
    { value: "default", label: "Sort by" },
    { value: "new", label: "Newest First" },
    { value: "old", label: "Oldest First" },
    { value: "az", label: "A - Z" },
    { value: "za", label: "Z - A" },
  ];

  const sortJobs = useCallback(
    (list: JobCardType[]) => {
      switch (selectedOption) {
        case "new":
          return [...list].sort(
            (a, b) =>
              new Date(b.date ?? "").getTime() -
              new Date(a.date ?? "").getTime()
          );
        case "old":
          return [...list].sort(
            (a, b) =>
              new Date(a.date ?? "").getTime() -
              new Date(b.date ?? "").getTime()
          );
        case "az":
          return [...list].sort((a, b) => a.title.localeCompare(b.title));
        case "za":
          return [...list].sort((a, b) => b.title.localeCompare(a.title));
        default:
          return list;
      }
    },
    [selectedOption]
  );

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
    const sorted = sortJobs(jobs);

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

  async function loadEmails() {
    if (emailsLoaded || isLoadingEmails) return; // Prevent multiple loads

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

  // ###########################################################################################

  // Clear selected jobs when multi-select mode is turned off
  useEffect(() => {
    if (!isMultiSelecting) {
      setSelectedJobs([]);
    }
  }, [isMultiSelecting]);

  const handleJobCardClick = useCallback(
    (job: JobCardType) => {
      if (isMultiSelecting) {
        // If in multi-select mode, toggle selection of the clicked job card
        setSelectedJobs((prevSelected) => {
          if (prevSelected.includes(job)) {
            // If the job is already selected, remove it from the selection
            return prevSelected.filter((j) => j !== job);
          } else {
            // If the job is not selected, add it to the selection
            return [...prevSelected, job];
          }
        });
      } else {
        setSelectedJobs([]); // If not in multi-select mode, clear the selection
      }
    },
    [isMultiSelecting]
  );

  // Log selected jobs for debugging purposes
  useEffect(() => {
    console.log("Selected Jobs Updated:", selectedJobs);
  }, [selectedJobs]);

  const handleDragStart = (JobCard: JobCardType) => {
    setIsMultiSelecting(false);
    setIsDragging(true);
    itemDraggedRef.current = JobCard;
  };

  const handleDragEnterColumn = (columnId: string) => {
    isOverRef.current = columnId;
  };

  const handleDragLeaveColumn = () => {
    isOverRef.current = null;
  };

  const handleDragEnd = async () => {
    // If an item was dragged and is over a different column, update its column
    setIsDragging(false);
    const itemDragged = itemDraggedRef.current;
    const isOver = isOverRef.current;

    if (itemDragged && isOver && itemDragged.column !== isOver) {
      console.log(`Dropped item ${itemDragged.id} into column ${isOver}`);

      const prevColumn = itemDragged.column;
      const updatedCard = { ...itemDragged, column: isOver };

      setJobs((prev) =>
        prev.map((job) =>
          job.id === itemDragged.id ? { ...job, column: isOver } : job
        )
      );

      try {
        await api("/api/jobs/update-stage", {
          method: "POST",
          body: JSON.stringify({
            provider_message_ids: [updatedCard.id],
            app_stage: updatedCard.column,
          }),
        });

        // undo action
        pushUndo({
          type: "move",
          id: itemDragged.id,
          from: prevColumn ?? "",
          to: isOver,
          job: itemDragged,
        });

        console.log("Job stage updated successfully");
      } catch (error) {
        console.error("Failed to update job stage:", error);

        setJobs((prev) =>
          prev.map((job) =>
            job.id === itemDragged.id ? { ...job, column: prevColumn } : job
          )
        );
      }
    }
    itemDraggedRef.current = null;
    isOverRef.current = null;
  };
  const [columnHeights, setColumnHeights] = useState<Record<string, number>>(
    {}
  );

  const sharedHeight = useMemo(
    () => Math.max(0, ...Object.values(columnHeights)),
    [columnHeights]
  );

  const handleReportHeight = useCallback((columnId: string, height: number) => {
    setColumnHeights((prev) => {
      if (prev[columnId] === height) return prev;
      return { ...prev, [columnId]: height };
    });
  }, []);

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

  const handleDelete = async (id: string): Promise<boolean> => {
    const jobToDelete = jobs.find((job) => job.id === id);
    try {
      const res = await api("/api/jobs/set-delete", {
        method: "POST",
        body: JSON.stringify({
          provider_message_ids: [id],
        }),
      });

      if (!(res && res.status === "success" && res.count > 0)) {
        console.error("Delete API responded but did not delete any rows:", res);
        return false;
      }
      // remove job locally
      setJobs((prev) => prev.filter((job) => job.id !== id));

      setSelectedJobs((prev) => prev.filter((j) => j.id !== id));
      setIsMultiSelecting(false);

      if (jobToDelete) {
        // set undo action
        pushUndo({ type: "delete", job: jobToDelete });
      }

      return true;
    } catch (error) {
      console.error("Failed to delete job with id:", id, error);
      return false;
    }
  };

  // -----------------------------------------------------------------------------------
  // handle Multiple Delete, move, archive actions from MultiSelectBar
  // -----------------------------------------------------------------------------------
  const handleDeleteMultiple = async (ids: string[]): Promise<boolean> => {
    const jobsToDelete = jobs.filter((job) => ids.includes(job.id));

    if (jobsToDelete.length === 0) return false;

    try {
      await api("/api/jobs/set-delete", {
        method: "POST",
        body: JSON.stringify({
          provider_message_ids: ids,
        }),
      });

      // remove jobs locally
      setJobs((prev) => prev.filter((job) => !ids.includes(job.id)));

      // clear selection and multi select
      setSelectedJobs((prev) => prev.filter((j) => !ids.includes(j.id)));
      setIsMultiSelecting(false);

      // push undo action
      pushUndo({ type: "deleteMultiple", jobs: jobsToDelete });
      return true;
    } catch (error) {
      console.error("Failed to delete multiple jobs with ids:", ids, error);
      return false;
    }
  };

  const handleMoveMultiple = async (
    ids: string[],
    to: string
  ): Promise<boolean> => {
    const jobsToMove = jobs.filter((job) => ids.includes(job.id));

    if (jobsToMove.length === 0) return false;

    // snapshot of original columns
    const snapshot = jobsToMove.map((job) => ({ ...job }));

    try {
      await api("/api/jobs/update-stage", {
        method: "POST",
        body: JSON.stringify({
          provider_message_ids: ids,
          app_stage: to,
        }),
      });

      // update jobs locally
      setJobs((prev) =>
        prev.map((job) => (ids.includes(job.id) ? { ...job, column: to } : job))
      );

      setSelectedJobs([]);
      setIsMultiSelecting(false);

      pushUndo({ type: "moveMultiple", jobs: snapshot, to });

      return true;
    } catch (error) {
      console.error("Failed to move multiple jobs with ids:", ids, error);
      return false;
    }
  };

  const handleArchiveMultiple = async (ids: string[]): Promise<boolean> => {
    const jobsToArchive = jobs.filter((job) => ids.includes(job.id));
    if (jobsToArchive.length === 0) return false;

    try {
      await api("/api/jobs/set-archive", {
        method: "POST",
        body: JSON.stringify({
          provider_message_ids: ids,
        }),
      });

      // remove jobs locally
      setJobs((prev) => prev.filter((job) => !ids.includes(job.id)));

      setSelectedJobs([]);
      setIsMultiSelecting(false);

      pushUndo({ type: "archiveMultiple", jobs: jobsToArchive });

      return true;
    } catch (error) {
      console.error("Failed to archive multiple jobs with ids:", ids, error);
      return false;
    }
  };

  // ----------------------------------------------------------------------------------
  //  UNDO / REDO FUNCTIONALITY
  // ----------------------------------------------------------------------------------

  // Undo last action (delete or move)
  const pushUndo = (action: UndoAction) => {
    setUndoStack((prev) => {
      const next = [...prev, action];
      undoRef.current = next;
      return next;
    });

    // clear redo stack on new action
    setRedoStack([]);
    redoRef.current = [];
  };

  // remove and return top undo action both undoStack and UndoRef
  const popUndo = (): UndoAction | undefined => {
    // get current undo stack from ref
    const prevStack = undoRef.current;

    // check if undo stack is empty
    if (!prevStack || prevStack.length === 0) return undefined;

    // get the top undo action
    const action = prevStack[prevStack.length - 1];

    // create next stack without the top action
    const nextStack = prevStack.slice(0, prevStack.length - 1);

    // keep ref and state in sync
    undoRef.current = nextStack;
    setUndoStack(nextStack);

    return action;
  };

  // perform the undo action
  async function performUndo() {
    // sync pop from ref
    const action = popUndo();

    if (!action) return;

    // perform the undo based on action type
    try {
      // undo delete
      if (action.type === "delete") {
        const jobToRestore = action.job;

        // toggle deleted state back
        await api("/api/jobs/set-delete", {
          method: "POST",
          body: JSON.stringify({
            provider_message_ids: [jobToRestore.id],
          }),
        });

        // re insert job locally
        setJobs((prev) => [jobToRestore, ...prev]);

        // undo move
      } else if (action.type === "move") {
        const { id, from } = action;

        // move job back to original column
        await api("/api/jobs/update-stage", {
          method: "POST",
          body: JSON.stringify({
            provider_message_ids: [id],
            app_stage: from,
          }),
        });
        // update job locally
        setJobs((prev) =>
          prev.map((job) => (job.id === id ? { ...job, column: from } : job))
        );
        // undo multiple delete
      } else if (action.type === "deleteMultiple") {
        const ids = action.jobs.map((job) => job.id);

        try {
          await api("/api/jobs/set-delete", {
            method: "POST",
            body: JSON.stringify({
              provider_message_ids: ids,
            }),
          });
          // re insert jobs locally
          setJobs((prev) => [...action.jobs, ...prev]);
        } catch (error) {
          console.error("Failed to undo multiple delete:", error);
        }
        // undo multiple move
      } else if (action.type === "moveMultiple") {
        // restore multiple moved jobs
        for (const job of action.jobs) {
          try {
            await api("/api/jobs/update-stage", {
              method: "POST",
              body: JSON.stringify({
                provider_message_ids: [job.id],
                app_stage: job.column,
              }),
            });
          } catch (error) {
            console.error("Failed to undo multiple move", error);
          }
        }
        // update jobs locally
        setJobs((prev) =>
          prev.map((job) => {
            const originalJob = action.jobs.find((j) => j.id === job.id);
            return originalJob ? { ...job, column: originalJob.column } : job;
          })
        );
        // undo multiple archive
      } else if (action.type === "archiveMultiple") {
        const ids = action.jobs.map((job) => job.id);
        try {
          await api("/api/jobs/set-archive", {
            method: "POST",
            body: JSON.stringify({
              provider_message_ids: ids,
            }),
          });
        } catch (error) {
          console.error("Failed to undo multiple archive:", error);
        }
        // re insert jobs locally
        setJobs((prev) => [...action.jobs, ...prev]);
      }
      // push redo action
      pushRedo(action);
    } catch (error) {
      console.error("Failed to undo action:", error);
    }
  }

  // Listen for Ctrl+Z to trigger undo
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isUndo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z";

      // only perform undo if there is an action to undo
      if (isUndo) {
        e.preventDefault();
        performUndo();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---------------------------------------------------------------------------------------
  // redo last undo (delete or move)
  const pushRedo = (action: UndoAction) => {
    setRedoStack((prev) => {
      const next = [...prev, action];
      redoRef.current = next;
      return next;
    });
  };

  // remove and return top undo action both undoStack and UndoRef
  const popRedo = (): UndoAction | undefined => {
    // get current undo stack from ref
    const prevStack = redoRef.current;

    // check if undo stack is empty
    if (!prevStack || prevStack.length === 0) return undefined;

    // get the top undo action
    const action = prevStack[prevStack.length - 1];

    // create next stack without the top action
    const nextStack = prevStack.slice(0, prevStack.length - 1);

    // keep ref and state in sync
    redoRef.current = nextStack;
    setRedoStack(nextStack);

    return action;
  };

  // perform the redo action
  async function performRedo() {
    // sync pop from ref
    const action = popRedo();

    if (!action) return;

    // perform the redo based on action type
    try {
      // redo delete
      if (action.type === "delete") {
        const jobToDelete = action.job;

        // toggle deleted state back
        await api("/api/jobs/set-delete", {
          method: "POST",
          body: JSON.stringify({
            provider_message_ids: [jobToDelete.id],
          }),
        });

        setJobs((prev) => prev.filter((job) => job.id !== jobToDelete.id));

        // undo move
      } else if (action.type === "move") {
        const { id, to } = action;

        // move job back to column
        await api("/api/jobs/update-stage", {
          method: "POST",
          body: JSON.stringify({
            provider_message_ids: [id],
            app_stage: to,
          }),
        });
        // update job locally
        setJobs((prev) =>
          prev.map((job) => (job.id === id ? { ...job, column: to } : job))
        );
      } else if (action.type === "deleteMultiple") {
        const ids = action.jobs.map((job) => job.id);

        try {
          await api("/api/jobs/set-delete", {
            method: "POST",
            body: JSON.stringify({
              provider_message_ids: ids,
            }),
          });
        } catch (error) {
          console.error("Failed to redo multiple delete:", error);
        }
        setJobs((prev) => prev.filter((job) => !ids.includes(job.id)));
      } else if (action.type === "moveMultiple") {
        const ids = action.jobs.map((job) => job.id);

        try {
          await api("/api/jobs/update-stage", {
            method: "POST",
            body: JSON.stringify({
              provider_message_ids: ids,
              app_stage: action.to,
            }),
          });
        } catch (error) {
          console.error("Failed to redo multiple move", error);
        }
        setJobs((prev) =>
          prev.map((job) =>
            ids.includes(job.id) ? { ...job, column: action.to } : job
          )
        );
      } else if (action.type === "archiveMultiple") {
        const ids = action.jobs.map((job) => job.id);

        try {
          await api("/api/jobs/set-archive", {
            method: "POST",
            body: JSON.stringify({
              provider_message_ids: ids,
            }),
          });
        } catch (error) {
          console.error("Failed to redo multiple archive:", error);
        }
        setJobs((prev) => prev.filter((job) => !ids.includes(job.id)));
      }
    } catch (error) {
      console.error("Failed to redo action:", error);
    }
  }

  // Listen for Ctrl+y to trigger redo
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isRedo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y";

      // only perform redo if there is an action to redo
      if (isRedo) {
        e.preventDefault();
        performRedo();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ----------------------------------------------------------------------------------
  //  END UNDO / REDO FUNCTIONALITY
  // ----------------------------------------------------------------------------------

  // This sets the job app modal's payload.
  // String -> Column ID
  // JobCardType -> A specific job to load
  // null -> Empty state / closing the modal
  const [jobAppModalPayload, setJobAppModalPayload] = useState<
    string | JobCardType | null
  >(null);

  // The trigger to open the job apps modal and set it's payload
  // Passed to the column and job card components
  // Column will assign the column id as the payload
  // JobCard will assign the specific job card as the payload
  // Null is for empty state / closing
  // This is strictly for opening the modal, closing is handled within the modal component itself
  const openJobAppModal = (payload: string | JobCardType | null) => {
    setJobAppModalPayload(payload);
    setIsJobAppModalOpen(true);
  };

  // Group jobs by their column for rendering
  // This creates a mapping of column ids to arrays of JobCard components
  // useMemo is used to memoize the result and only recalculate when jobs or columnConfig change
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
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          isMultiSelecting={isMultiSelecting}
          handleMultiSelectClick={handleJobCardClick}
          dimmed={!!searchQuery && !matchOrderMap.has(job.id)}
          onDelete={handleDelete}
          isDeleting={isDeleting}
          setIsDeleting={setIsDeleting}
          openJobAppModal={openJobAppModal}
        />
      ));

      return acc;
    }, {});
  }, [
    sortedJobs,
    matchOrderMap,
    columnConfig,
    isMultiSelecting,
    handleJobCardClick,
    searchQuery,
  ]);

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
            animationData={loadingAnimation}
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
          className="w-full h-full flex items-center justify-center flex-col"
        >
          {/* ^ Page Container ^ */}
          <div className="w-full h-full flex flex-col items-center gap-4 p-4 overflow-y-auto">
            {/* ^ Content Container ^ */}
            <ControlBar // see ControlBar.tsx
              isMultiSelecting={isMultiSelecting}
              setIsMultiSelecting={setIsMultiSelecting}
              multiSelectLabel={isMultiSelecting ? "Multi Select" : ""}
              options={sortByOptions}
              isMenuOpen={isMenuOpen}
              setMenuOpen={setMenuOpen}
              selectedOption={selectedOption}
              setSelectedOption={setSelectedOption}
              isSearching={isSearching}
              setIsSearching={setIsSearching}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isAlertOpen={isAlertOpen}
              setIsAlertOpen={setIsAlertOpen}
              alertMessage={alertMessage}
              infoModalLabel={isInfoModalOpen ? "Info" : ""}
              isInfoModalOpen={isInfoModalOpen}
              setInfoModalOpen={setInfoModalOpen}
            />
            {/* Kan Ban Columns */}
            <div className="flex gap-4 w-full">
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
                    onDragEnter={handleDragEnterColumn} // pass down drag enter handler
                    onDragLeave={handleDragLeaveColumn} // pass down drag leave handler
                    sharedHeight={sharedHeight}
                    reportHeight={handleReportHeight}
                    viewportHeight={viewportHeight}
                    showToggleRejectButton={
                      column.id === "accepted" || column.id === "rejected"
                    }
                    onToggleReject={toggleAcceptedToRejected}
                    isHighlighted={isHighlighted}
                    openJobAppModal={openJobAppModal}
                  >
                    {jobsByColumn[column.id]}{" "}
                    {/* render the JobCards associated with the columns id */}
                  </Column>
                )
              )}
            </div>
          </div>
          {isMultiSelecting && (
            <MultiSelectBar
              selectedJobs={selectedJobs}
              setSelectedJobs={setSelectedJobs}
              setIsMultiSelecting={setIsMultiSelecting}
              onDelete={handleDeleteMultiple}
              onMove={handleMoveMultiple}
              onArchive={handleArchiveMultiple}
              setIsHighlighted={setIsHighlighted}
            />
          )}

          {/* Undo bar (stay until refresh or all undos performed) */}
          {showRedoUndo && !isMultiSelecting && (
            <div
              className="flex flex-row fixed bottom-6 justify-center items-center flex gap-1 rounded-xl p-1 glass z-2"
              role="status"
              aria-live="polite"
            >
              <span
                title={
                  undoStack.length === 0
                    ? "No actions to undo"
                    : "Undo (Ctrl+Z)"
                }
                className="rounded"
              >
                <Button
                  type="button"
                  onClick={performUndo}
                  aria-label="Undo last action"
                  disabled={undoStack.length === 0}
                  className={`p-2 undoRedo`}
                >
                  <img src={undo} alt="Undo" className="w-5 h-5 icon" />
                </Button>
              </span>

              <span
                title={
                  redoStack.length === 0
                    ? "No actions to redo"
                    : "Redo (Ctrl+Y)"
                }
                className="rounded"
              >
                <button
                  type="button"
                  onClick={performRedo}
                  aria-label="Redo last action"
                  disabled={redoStack.length === 0}
                  className={`p-2 undoRedo`}
                >
                  <img src={redo} alt="Redo" className="w-5 h-5 icon" />
                </button>
              </span>
            </div>
          )}

          <div
            className="fixed bottom-0 w-full bg-transparent z-1"
            style={{ boxShadow: "var(--page-shadow)" }}
          ></div>

          <NewApplication
            isOpen={isJobAppModalOpen}
            setIsOpen={setIsJobAppModalOpen}
            payload={jobAppModalPayload}
            onSave={(updated: Partial<JobCardType> & { id?: string }) => {
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
