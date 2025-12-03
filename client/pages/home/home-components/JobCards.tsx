// import { localfiles } from "@/directory/path/to/localimport";

import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import downChevron from "@/assets/icons/angle-small-down.svg";
import uncheckIcon from "@/assets/icons/uncheck-icon.svg";
import checkIcon from "@/assets/icons/check-icon.svg";
import type { JobCardType } from "@/types/jobCardType";
import { auth } from "@/global-services/firebase";
import { api } from "@/global-services/api";
import { getCSSVar } from "@/utils/getCSSVar";
import editIcon from "@/assets/icons/edit.svg";
import viewIcon from "@/assets/icons/view.svg";
import reviewIcon from "@/assets/icons/reviewed.svg";
import trashIcon from "@/assets/icons/trash.svg";
import ConfirmModal from "@/global-components/ConfirmModal";

export function JobCard({
  job,
  onDragStart,
  onDragEnd,
  isMultiSelecting,
  handleMultiSelectClick,
  dimmed,
  onDelete,
  isDeleting,
  setIsDeleting,
  openJobAppModal,
}: {
  job: JobCardType;
  onDragStart: (job: JobCardType) => void;
  onDragEnd: () => void;
  isMultiSelecting: boolean;
  handleMultiSelectClick: (job: JobCardType) => void;
  dimmed: boolean;
  onDelete?: (id: string) => Promise<boolean>;
  isDeleting: boolean;
  setIsDeleting: (isDeleting: boolean) => void;
  openJobAppModal: (job: JobCardType) => void;
}) {
  const [isSelected, setIsSelected] = useState(false); // Placeholder for selection state
  const [isOpen, setIsOpen] = useState(false); // State to manage expanded/collapsed view
  const [localReviewNeeded, setLocalReviewNeeded] = useState<boolean>(
    !!job.reviewNeeded
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  const [editHovered, setEditHovered] = useState(false);
  const [viewHovered, setViewHovered] = useState(false);
  const [deleteHovered, setDeleteHovered] = useState(false);

  // If multi-select mode is turned off, clear selection state
  if (!isMultiSelecting && isSelected) {
    // This ensures that cycling multi-select resets all cards to unselected
    setIsSelected(false);
  }

  // Handlers for drag events
  const handleDragStart = useCallback(() => {
    // Notify parent component that drag has started with this jobs data
    onDragStart(job);
  }, [onDragStart, job]);

  const handleDragEnd = useCallback(() => {
    // Notify parent component that drag has ended (clears job data from parent)
    onDragEnd();
  }, [onDragEnd]);

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

  const hoverMessageForReview = localReviewNeeded
    ? "This job requires your review."
    : "";

  const markAsReviewed = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    setLocalReviewNeeded(false);

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
      setLocalReviewNeeded(true); // keep the review needed state if API call fails
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

  // // delete confirmation modal
  // const modalMarkup = (
  //   <div
  //     className="fixed inset-0 z-50 flex items-center justify-center"
  //     role="dialog"
  //     aria-modal="true"
  //     aria-labelledby={`delete-dialog-title-${job.id}`}
  //     onClick={() => setShowDeleteConfirm(false)}
  //   >
  //     {/* backdrop */}
  //     <div className="absolute inset-0 bg-black/60" />

  //     {/* dialog */}
  //     <div
  //       className="flex flex-col w-full z-60 max-w-md p-4 gap-4 glass"
  //       onClick={(e) => e.stopPropagation()}
  //     >
  //       <h3
  //         id={`delete-dialog-title-${job.id}`}
  //         className="primary-text font-semibold"
  //       >
  //         Do you want to delete this card?
  //       </h3>
  //       <p className="text-sm secondary-text">{job.title}</p>

  //       <div className="flex gap-2 mt-2 justify-end">
  //         <button
  //           onClick={(e) => {
  //             e.stopPropagation();
  //             e.preventDefault();
  //             setIsDeleting(false);
  //             setShowDeleteConfirm(false);
  //           }}
  //           type="button"
  //           className="small"
  //           aria-label="Cancel delete"
  //         >
  //           Cancel
  //         </button>

  //         <button
  //           onClick={async (e) => {
  //             e.stopPropagation();
  //             e.preventDefault();

  //             if (isDeleting || isMultiSelecting) return;

  //             if (!onDelete) {
  //               setShowDeleteConfirm(false);
  //               return;
  //             }

  //             setIsDeleting(true);
  //             try {
  //               const success = await onDelete(job.id);
  //               if (!success) {
  //                 console.error("Failed to delete job with id:", job.id);
  //               }
  //             } catch (error) {
  //               console.error(
  //                 "Error occurred while deleting job with id:",
  //                 job.id,
  //                 error
  //               );
  //             } finally {
  //               setIsDeleting(false);
  //               setShowDeleteConfirm(false);
  //             }
  //           }}
  //           type="button"
  //           className="small bg-red-600 text-white"
  //           aria-label="Confirm delete"
  //         >
  //           {isDeleting ? "Deleting..." : "Yes, delete"}
  //         </button>
  //       </div>
  //     </div>
  //   </div>
  // );

  const needsReview = localReviewNeeded ? "review" : "shadow";

  return (
    <motion.div
      key={`${job.id}-${job.applicationStage}`}
      id={job.id}
      className={`w-full flex items-center flex flex-col job-card animate-element ${needsReview}`}
      drag
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      variants={variants}
      animate={dimmed ? "dimmed" : "active"}
      whileHover={{
        scale: 1.02,
        cursor: "pointer",
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      // onTap cycles between expanding the card and selecting it based on isMultiSelecting

      whileTap={{ cursor: "grabbing" }}
      whileDrag={{
        cursor: "grabbing",
        scale: 1.05,
        pointerEvents: "none",
        zIndex: 1000,
      }}
      dragSnapToOrigin
      layout
    >
      {/* Tooltip for Review Needed */}
      <motion.small
        key="review-tooltip"
        initial={{
          opacity: 0,
          height: 0,
        }}
        animate={{
          opacity: localReviewNeeded && isHovered ? 1 : 0,
          height: localReviewNeeded && isHovered ? "auto" : 0,
        }}
        exit={{
          opacity: 0,
          height: 0,
        }}
        transition={{ duration: 0.12 }}
        role="tooltip"
        aria-hidden={!isHovered}
        className="w-full z-50 review-header"
      >
        {hoverMessageForReview}
      </motion.small>

      {/* Main Card Container Above (wraps all content) */}

      <motion.div
        className="flex justify-between w-full items-center text-left"
        onTap={() => {
          handleMultiSelectClick(job);
          if (isMultiSelecting) {
            setIsSelected(!isSelected);
            return;
          } else {
            setIsOpen(!isOpen);
          }
        }}
      >
        {/* This Motion Div (above) is to wrap the title and the checkbox so we get smooth animation without affecting the open/close chevron*/}

        <motion.div
          className="flex items-center gap-2 p-2 w-7/8"
          layout
          title="Click to open, close, or select this job card"
        >
          {/* This animates in the checkbox when we are in multi-select mode */}
          <motion.img
            src={isSelected ? checkIcon : uncheckIcon}
            alt={isSelected ? "Check Icon" : "Uncheck Icon"}
            className="w-4 h-4 opacity-50 icon"
            initial={{ opacity: 0, width: 0 }}
            animate={{
              opacity: isMultiSelecting ? 1 : 0,
              width: isMultiSelecting ? "auto" : 0,
            }}
            exit={{ opacity: 0, width: 0 }}
            layout
          />

          {/* Job Title and date*/}
          <motion.div className="flex flex-col flex-1 min-w-0">
            <p className="primary-text">{job.title}</p>
            {job.date && <small className="secondary-text">{job.date}</small>}
          </motion.div>
        </motion.div>

        {/* Chevron to expand/collapse job card details rotates via it's style argument */}
        <motion.div className="flex w-1/8 mr-2 justify-end">
          <motion.img
            src={downChevron}
            alt="Show Content Handle"
            className="w-5 h-5 icon"
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              duration: parseFloat(getCSSVar("--animation-duration")),
            }}
          />
        </motion.div>
      </motion.div>

      {/* Expanded Job Related Content */}
      <motion.div
        className="overflow-hidden w-full px-4"
        animate={{
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0,
        }}
        initial={false}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
      >
        <hr className="header-split" />
        <div className="flex flex-col text-left w-full gap-2 py-4">
          <small className="secondary-text font-semibold">
            {job.companyName ?? "Unknown Company"}
          </small>

          <p className="primary-text">
            {job.description ?? "No description provided for this job."}
          </p>

          <small className="secondary-text">
            {job.notes ?? "No additional notes."}
          </small>
        </div>
      </motion.div>

      <motion.div
        key="review-tooltip"
        initial={{ opacity: 0, height: 0 }}
        animate={{
          height: isHovered ? "auto" : 0,
          opacity: isHovered ? 1 : 0,
        }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.12 }}
        role="tooltip"
        aria-hidden={!isHovered}
        className="w-full z-50"
      >
        <hr className="header-split" />
        <motion.div
          className="flex flex-row gap-2 p-2 w-full"
          initial={{ opacity: 0, height: 0 }}
          animate={{
            height: isHovered ? "auto" : 0,
            opacity: isHovered ? 1 : 0,
          }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.12 }}
        >
          {/*TODO: make this open edit application modal that is almost the same as add application but different*/}
          <motion.button
            onClick={() => openJobAppModal(job)}
            type="button"
            className="small w-full"
            style={{ background: "transparent" }}
            onMouseEnter={() => setEditHovered(true)}
            onMouseLeave={() => setEditHovered(false)}
            aria-label="Edit Job"
            title="Edit job details and notes"
          >
            <motion.img
              src={editIcon}
              alt="Edit Icon"
              className={`inline w-4 h-4 icon ${
                editHovered ? "greenIcon" : ""
              }`}
            />
          </motion.button>

          {/* Delete button with confirmation */}
          <motion.button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              if (isMultiSelecting || isDeleting) return;
              setIsDeleting(true);
              setShowDeleteConfirm(true);
            }}
            type="button"
            className="small w-full outline-none bg-transparent"
            aria-label="Delete Job"
            style={{ background: "transparent" }}
            onMouseEnter={() => setDeleteHovered(true)}
            onMouseLeave={() => setDeleteHovered(false)}
            title="Delete this job card"
          >
            <motion.img
              src={trashIcon}
              alt="Trash Icon"
              className={`inline w-4 h-4 icon ${
                deleteHovered ? "redIcon" : ""
              }`}
            />
          </motion.button>

          {/* View Email button */}
          {job.providerSource !== "manual_entry" && (
            <motion.button
              onClick={(e) => {
                e.preventDefault();
                openMessage(job.id);
              }}
              type="button"
              className="small w-full"
              style={{ background: "transparent" }}
              onMouseEnter={() => setViewHovered(true)}
              onMouseLeave={() => setViewHovered(false)}
              aria-label="View Email"
              title="View this email in your inbox"
            >
              <motion.img
                src={viewIcon}
                alt="View Icon"
                className={`inline w-4 h-4 icon ${
                  viewHovered ? "blueIcon" : ""
                }`}
              />
            </motion.button>
          )}

          {/* Mark as Reviewed button */}
          <motion.button
            type="button"
            className={`small w-full ${
              localReviewNeeded ? "reviewed" : "hidden"
            }`}
            onClick={markAsReviewed}
            style={{ background: "transparent" }}
            aria-label="Mark as Reviewed"
            title="Mark this job as reviewed"
          >
            <motion.img
              src={reviewIcon}
              alt="Review Icon"
              className={`inline w-4 h-4 orangeIcon`}
            />
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Delete Confirmation Modal */}
       <ConfirmModal
              isOpen={showDeleteConfirm}
              title="Confirm Deletion"
              message="Are you sure you want to delete the selected item/s? You can undo this action from the Trash however it will be permanently deleted after 30 days."
              confirmLabel="Delete"
              isProcessing={isProcessingDelete}
              onCancel={() => setShowDeleteConfirm(false)}
              onConfirm={async () => {
                setIsProcessingDelete(true);
      
                try {
                  if (onDelete) await onDelete(job.id);
      
                } finally {
                  setIsProcessingDelete(false);
                  setShowDeleteConfirm(false);
                }
              }}
            />
    </motion.div>
  );
}
