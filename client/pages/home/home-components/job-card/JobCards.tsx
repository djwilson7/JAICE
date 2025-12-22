import { useEffect, useRef, useState } from "react";
import type { JobCardType } from "@/types/jobCardType";
import { auth } from "@/global-services/firebase";
import { api } from "@/global-services/api";
import editIcon from "@/assets/icons/edit.svg";
import viewIcon from "@/assets/icons/view.svg";
import reviewIcon from "@/assets/icons/reviewed.svg";
import trashIcon from "@/assets/icons/trash.svg";
import ConfirmModal from "@/global-components/ConfirmModal";
import archiveIcon from "@/assets/icons/folder.svg";
import { useIsMultiSelecting } from "@/pages/home/hooks/useIsMultiSelecting";
import { useSelectedJobs } from "@/pages/home/hooks/useSelectedJobs";
import { useDeleteByJobId } from "@/pages/home/hooks/useDeleteByJobId";
import { useUndoRedo } from "@/pages/home/hooks/useUndoRedo";
import { useDrag } from "@/pages/home/hooks/useDrag";
import { useDragEndHandler } from "@/pages/home/hooks/useOnDragEnd";
import { useJobCard } from "../../hooks/useJobCard";
import { ValidColumns } from "@/types/validColumns";
import { JobCardButtonRow } from "./JobCardButtonRow";
import { JobCardButton } from "./JobCardButton";
import { JobCardContent } from "./JobCardContent";
import { JobCardTitle } from "./JobCardTitle";
import { JobCardReviewHeader } from "./JobCardReviewHeader";
import { JobCardContainer } from "./JobCardContainer";

export function JobCard({
  job,
  dimmed,
  openJobAppModal,
}: {
  job: JobCardType;
  dimmed: boolean;
  openJobAppModal: (job: JobCardType) => void;
}) {
  const { isMultiSelecting } = useIsMultiSelecting();
  const { toggleJobSelection } = useSelectedJobs();
  const { deleteJob } = useDeleteByJobId();
  const { pushUndo } = useUndoRedo();
  const { setIsDragging, setDraggedId, dragTarget, dragStart, setDragStart } =
    useDrag();

  const { processDragEnd } = useDragEndHandler({ job: job });

  const { expandAll, commandId, registerOpen, registerClose } = useJobCard();

  const [localOpen, setLocalOpen] = useState<boolean | null>(null);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    setLocalOpen(null);
  }, [commandId]);

  const isOpen = localOpen ?? expandAll;

  useEffect(() => {
    if (isOpen !== prevOpenRef.current) {
      isOpen ? registerOpen() : registerClose();
      prevOpenRef.current = isOpen;
    }
  }, [isOpen, registerOpen, registerClose]);

  const toggle = () => {
    setLocalOpen((prev) => !(prev ?? expandAll));
  };

  const [isSelected, setIsSelected] = useState(false); // Placeholder for selection state
  const [isDeleting, setIsDeleting] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  const reviewClass = job.reviewNeeded ? "review" : "shadow";

  // If multi-select mode is turned off, clear selection state
  if (!isMultiSelecting && isSelected) {
    // This ensures that cycling multi-select resets all cards to unselected
    setIsSelected(false);
  }

  // Handlers for drag events
  const handleDragStart = () => {
    setIsDragging(true);
    setDraggedId(job.id);
    setDragStart(job.reviewNeeded ? "review" : job.column.toLowerCase());
  };

  const handleDragEnd = () => {
    const beforeJobState = [job];
    let afterJobState: JobCardType[];

    switch (dragTarget) {
      case "archive":
        afterJobState = [{ ...job, isArchived: true }];
        break;
      case "delete":
        afterJobState = [{ ...job, isDeleted: true }];
        break;
      default:
        afterJobState = [{ ...job, applicationStage: dragTarget! }];
    }

    const addToUndo =
      dragTarget !== dragStart &&
      dragTarget !== null &&
      ValidColumns.includes(dragTarget);

    if (addToUndo) {
      if (isSelected) {
        toggleJobSelection(job);
      }
      pushUndo({
        label: "Drag & Drop",
        before: beforeJobState,
        after: afterJobState,
      });
    }

    processDragEnd();
  };

  const [isHovered, setIsHovered] = useState(false);

  // open email in new window
  const openMessage = (messageId: string): void => {
    // get the current user's email from Firebase Authentication
    const userEmail = auth.currentUser?.email;

    // if the user is not authenticated, we cannot open the email, so we log an error and return early
    if (!userEmail) {
      console.error("User is not authenticated. Cannot open email.");
      return;
    }

    // open the email in a new window
    const url = `https://mail.google.com/mail/u/${userEmail}/#inbox/${messageId}`;
    window.open(url, "_blank");
  };

  const variants = {
    active: { opacity: 1, scale: 1, filter: "none" },
    dimmed: {
      opacity: 0.35,
      scale: 0.98,
      filter: "grayscale(40%) brightness(80%)",
    },
  };

  const markAsReviewed = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // mark job as reviewed
    try {
      await api("/api/jobs/set-review-needed", {
        method: "POST",
        body: JSON.stringify({
          provider_message_ids: [job.id],
          needs_review: false,
        }),
      });
      setIsHovered(false);
    } catch (error) {
      console.error("Failed to mark job as reviewed:", error);
    }
  };

  // close modal with escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "escape") {
        setShowDeleteConfirm(false);
        setIsDeleting(false);
      }
    };

    if (showDeleteConfirm) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showDeleteConfirm]);

  //const needsReview = localReviewNeeded ? "review" : "shadow";

  const closeDelete = () => {
    setShowDeleteConfirm(false);
    setIsDeleting(false);
  };

  const onArchiveClicked = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const beforeJobState = [job];
      const afterJobState = [{ ...job, isArchived: true }];
      await api("/api/jobs/set-archive", {
        method: "POST",
        body: JSON.stringify({
          provider_message_ids: [job.id],
        }),
      });
      setIsHovered(false);
      pushUndo({
        label: "Archive",
        before: beforeJobState,
        after: afterJobState,
      });
    } catch (error) {
      console.error("Failed to archive job:", error);
    }
  };

  const onExternalLinkClicked = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    openMessage(job.id);
  };

  const onTrashClicked = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (isMultiSelecting || isDeleting) return;
    setIsDeleting(true);
    setShowDeleteConfirm(true);
  };

  const onConfirmDelete = async () => {
    setIsProcessingDelete(true);

    try {
      await deleteJob(job);
    } finally {
      setIsProcessingDelete(false);
      closeDelete();
    }
  };

  const handleOnTap = () => {
    if (isMultiSelecting) {
      toggleJobSelection(job);
      setIsSelected(!isSelected);
    } else {
      toggle();
    }
  };

  const cardClass = !isMultiSelecting
    ? ""
    : isSelected
    ? "selectedJobCard"
    : "unselectedJobCard";

  return (
    <JobCardContainer
      key={`${job.id}-${job.applicationStage}`}
      id={job.id}
      handleDragStart={handleDragStart}
      handleDragEnd={handleDragEnd}
      dimmed={dimmed}
      isMultiSelecting={isMultiSelecting}
      setIsHovered={setIsHovered}
      variants={variants}
      reviewClass={reviewClass}
      cardClass={cardClass}
    >
      <JobCardReviewHeader isVisible={job.reviewNeeded!} />

      <JobCardTitle
        job={job}
        isSelected={isSelected}
        isOpen={isOpen}
        handleTap={handleOnTap}
      />

      <JobCardContent isOpen={isOpen} job={job} />

      <JobCardButtonRow isHovered={isHovered}>
        <JobCardButton
          onClick={() => openJobAppModal(job)}
          icon={editIcon}
          iconHoverColor="greenIcon"
        />

        <JobCardButton
          onClick={onTrashClicked}
          icon={trashIcon}
          iconHoverColor="redIcon"
        />

        <JobCardButton
          onClick={onArchiveClicked}
          icon={archiveIcon}
          iconHoverColor="purpleIcon"
        />

        <JobCardButton
          onClick={onExternalLinkClicked}
          icon={viewIcon}
          iconHoverColor="blueIcon"
          isVisible={job.providerSource !== "manual_entry"}
        />

        <JobCardButton
          onClick={markAsReviewed}
          icon={reviewIcon}
          iconHoverColor="orangeIcon"
          isVisible={job.reviewNeeded}
        />
      </JobCardButtonRow>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Confirm Deletion"
        message="Are you sure you want to delete the selected item/s? You can undo this action from the Trash however it will be permanently deleted after 30 days."
        confirmLabel="Delete"
        isProcessing={isProcessingDelete}
        onCancel={closeDelete}
        onConfirm={onConfirmDelete}
      />
    </JobCardContainer>
  );
}
