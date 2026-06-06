import { useCallback, useEffect, useRef, useState } from "react";
import type { JobCardType } from "@/types/jobCardType";
import ConfirmModal from "@/global-components/ConfirmModal";
import { Modal } from "@/global-components/Modal";
import { JobCardButton } from "@/pages/home/home-components/job-card/JobCardButton";
import { JobCardButtonRow } from "@/pages/home/home-components/job-card/JobCardButtonRow";
import { JobCardContent } from "@/pages/home/home-components/job-card/JobCardContent";
import { JobCardReviewHeader } from "@/pages/home/home-components/job-card/JobCardReviewHeader";
import { JobCardTitle } from "@/pages/home/home-components/job-card/JobCardTitle";
import archiveIcon from "@/assets/icons/folder.svg";
import restoreIcon from "@/assets/icons/trash-undo.svg";
import trashIcon from "@/assets/icons/trash.svg";
import deleteIcon from "@/assets/icons/trash-x.svg";

type Mode = "trash" | "archive";
type ActionName = "undelete" | "delete_permanently" | "unarchive" | "archive" | "delete";
const SKELETON_CARD_COUNT = 3;
const SCROLL_EDGE_THRESHOLD = 8;

function TrashArchiveEmptyState({ mode }: { mode: Mode }) {
  const isTrash = mode === "trash";

  return (
    <div className="empty-column-placeholder trash-archive-empty-state">
      <p className="job-card-title-text empty-column-placeholder-title">
        {isTrash ? "Trash" : "Archive"} is empty
      </p>
      <p className="job-card-body-text empty-column-placeholder-copy">
        No {isTrash ? "deleted" : "archived"} jobs are currently stored here.
      </p>
      <p className="job-card-body-text empty-column-placeholder-action">
        Jobs you {isTrash ? "delete" : "archive"} will appear here.
      </p>
    </div>
  );
}

function TrashArchiveModalSkeleton() {
  return (
    <div
      className="home-loading-skeleton w-full space-y-2 px-2"
      role="status"
      aria-live="polite"
      aria-label="Loading jobs"
    >
      {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
        <div
          key={index}
          className="job-card home-skeleton-card"
          aria-hidden="true"
        >
          <div className="flex w-full items-center justify-center p-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <span
                className={`home-skeleton-block home-skeleton-title-line home-skeleton-title-line-${index}`}
              />
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span className="home-skeleton-block home-skeleton-date-line" />
                <span className="home-skeleton-block home-skeleton-time-line" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TrashArchiveJobCard({
  job,
  mode,
  onAction,
  onPermanentDelete,
}: {
  job: JobCardType;
  mode: Mode;
  onAction?: (action: ActionName, ids: string[]) => Promise<void>;
  onPermanentDelete: (job: JobCardType) => void;
}) {
  const [localOpen, setLocalOpen] = useState<boolean | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const isOpen = localOpen ?? false;
  const runCardAction = (
    event: React.MouseEvent<HTMLButtonElement>,
    action: ActionName
  ) => {
    event.preventDefault();
    event.stopPropagation();
    void onAction?.(action, [job.id]);
  };

  return (
    <div
      id={job.id}
      className={`flex w-full shrink-0 select-none items-center flex-col job-card min-h-[2rem] overflow-hidden p-0 ${
        job.reviewNeeded ? "review" : ""
      }`}
      style={{
        background: "var(--job-card-bg)",
        border: "1px solid rgba(var(--primary-five-rgb), 0.14)",
        boxShadow: "none",
        cursor: "pointer",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <JobCardReviewHeader isVisible={job.reviewNeeded!} />
      <JobCardTitle
        job={job}
        isSelected={false}
        setIsSelected={() => undefined}
        isOpen={isOpen}
        isHovered={isHovered}
        setLocalOpen={setLocalOpen}
        allowSelection={false}
      />
      <JobCardContent isOpen={isOpen} job={job} />
      <JobCardButtonRow isHovered={isHovered}>
        <JobCardButton
          onClick={(event) =>
            runCardAction(event, mode === "trash" ? "undelete" : "unarchive")
          }
          icon={restoreIcon}
          iconHoverColor="greenIcon"
          label="Restore"
          title="Restore"
        />

        {mode === "trash" ? (
          <>
            <JobCardButton
              onClick={(event) => runCardAction(event, "archive")}
              icon={archiveIcon}
              iconHoverColor="purpleIcon"
              label="Archive"
              title="Archive"
            />
            <JobCardButton
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onPermanentDelete(job);
              }}
              icon={deleteIcon}
              iconHoverColor="redIcon"
              label="Delete permanently"
              title="Delete permanently"
            />
          </>
        ) : (
          <JobCardButton
            onClick={(event) => runCardAction(event, "delete")}
            icon={trashIcon}
            iconHoverColor="redIcon"
            label="Delete"
            title="Delete"
          />
        )}
      </JobCardButtonRow>
    </div>
  );
}

export default function TrashArchiveModal({
  isOpen,
  isLoading = false,
  onClose,
  mode = "trash",
  items = [],
  onAction,
}: {
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  mode?: Mode;
  items: JobCardType[]; // source data
  onAction?: (action: ActionName, ids: string[]) => Promise<void>;
}) {
  const [list, setList] = useState<JobCardType[]>(items);
  const [pendingPermanentDelete, setPendingPermanentDelete] =
    useState<JobCardType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollContentRef = useRef<HTMLUListElement | null>(null);
  const [scrollShadow, setScrollShadow] = useState({
    top: false,
    bottom: false,
  });

  const updateScrollShadow = useCallback(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const maxScrollTop = scrollEl.scrollHeight - scrollEl.clientHeight;
    const hasOverflow = maxScrollTop > SCROLL_EDGE_THRESHOLD;

    setScrollShadow({
      top: hasOverflow && scrollEl.scrollTop > SCROLL_EDGE_THRESHOLD,
      bottom:
        hasOverflow &&
        scrollEl.scrollTop < maxScrollTop - SCROLL_EDGE_THRESHOLD,
    });
  }, []);

  // reset list when items or mode change
  useEffect(() => {
    setList(items);
  }, [items, mode, isOpen]);

  useEffect(() => {
    updateScrollShadow();

    const scrollEl = scrollRef.current;
    const scrollContentEl = scrollContentRef.current;
    if (
      !scrollEl ||
      !scrollContentEl ||
      typeof ResizeObserver === "undefined"
    ) {
      return;
    }

    const resizeObserver = new ResizeObserver(updateScrollShadow);
    resizeObserver.observe(scrollEl);
    resizeObserver.observe(scrollContentEl);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isLoading, list, updateScrollShadow]);

  // escape key and lock scroll while open
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const title = mode === "trash" ? "Trash" : "Archive";

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} modalTitle={title} className="w-lg">
        <div className="h-[36rem] max-h-[calc(100vh-8rem)] mb-4">
          {isLoading ? (
            <TrashArchiveModalSkeleton />
          ) : list.length === 0 ? (
            <div className="px-2">
              <TrashArchiveEmptyState mode={mode} />
            </div>
          ) : (
            <div
              className={`kanban-column-scroll-frame ${
                scrollShadow.top ? "kanban-column-scroll-shadow-top" : ""
              } ${
                scrollShadow.bottom
                  ? "kanban-column-scroll-shadow-bottom"
                  : ""
              } h-full`}
            >
              <div
                ref={scrollRef}
                onScroll={updateScrollShadow}
                className="kanban-column-scroll h-full px-2"
              >
                <ul ref={scrollContentRef} className="space-y-2">
                  {list.map((job) => (
                    <li key={job.id} className="p-0">
                      <TrashArchiveJobCard
                        job={job}
                        mode={mode}
                        onAction={onAction}
                        onPermanentDelete={setPendingPermanentDelete}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </Modal>
      <ConfirmModal
        isOpen={Boolean(pendingPermanentDelete)}
        title="Confirm Permanent Deletion"
        message="Are you sure you want to permanently delete this item? This action cannot be undone."
        confirmLabel="Delete"
        isProcessing={isProcessing}
        onCancel={() => setPendingPermanentDelete(null)}
        onConfirm={async () => {
          if (!pendingPermanentDelete) return;

          setIsProcessing(true);
          try {
            await onAction?.("delete_permanently", [pendingPermanentDelete.id]);
            setPendingPermanentDelete(null);
          } finally {
            setIsProcessing(false);
          }
        }}
      />
    </>
  );
}
