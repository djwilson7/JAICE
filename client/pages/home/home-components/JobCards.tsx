// import { localfiles } from "@/directory/path/to/localimport";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import downChevron from "@/assets/icons/angle-small-down.svg";
import uncheckIcon from "@/assets/icons/uncheck-icon.svg";
import checkIcon from "@/assets/icons/check-icon.svg";
import type { JobCardType } from "@/types/jobCardType";
import { auth } from "@/global-services/firebase";
import { api } from "@/global-services/api";
import { createPortal } from "react-dom";

export function JobCard({
  job,
  onDragStart,
  onDragEnd,
  isMultiSelecting,
  handleMultiSelectClick,
  dimmed,
  onEdit,
  onDelete,
}: {
  job: JobCardType;
  onDragStart: (job: JobCardType) => void;
  onDragEnd: () => void;
  isMultiSelecting: boolean;
  handleMultiSelectClick: (job: JobCardType) => void;
  dimmed: boolean;
  onEdit?: (job: JobCardType) => void;
  onDelete?: (id: string) => Promise<boolean>;
}) {
  const [isSelected, setIsSelected] = useState(false); // Placeholder for selection state
  const [isOpen, setIsOpen] = useState(false); // State to manage expanded/collapsed view
  const [localReviewNeeded, setLocalReviewNeeded] = useState<boolean>(!!job.reviewNeeded);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // Needs elevated to global css
  const iconStyle = {
    filter:
      "brightness(0) saturate(100%) invert(81%) sepia(11%) saturate(464%) hue-rotate(170deg) brightness(95%) contrast(85%)",
    ...(isOpen ? { transform: "rotate(180deg)" } : {}),
  };

  const [isHovered, setIsHovered] = useState(false);

  // open email in new window
  const openMessage = (messageId: string): void => {
    // get the current user's email from Firebase Authentication
    const userEmail = auth.currentUser?.email;

    // if the user is not authenticated, we cannot open the email, so we log an error and return early
    if (!userEmail) 
    {
      console.error("User is not authenticated. Cannot open email.");
      return;
    }

    // open the email in a new window
    const url = `https://mail.google.com/mail/u/${userEmail}/#inbox/${messageId}`;
    window.open(url, "_blank");
  };

  const cardBorderColor = useMemo (() => {
    const color =
    //   // if email is marked as accepted make the card border green
    //  job.applicationStage === "Accepted" ? "#10B981" :

    //  // if email is marked as rejected make the card border red
    //   job.applicationStage === "Rejected" ? "#EF4444" :

      "transparent";
    
    return {
      border: color ===  "transparent" ? "1px solid transparent" : `1px solid ${color}`,
      transition: "border 0.3s ease",
    };

  }, [job.applicationStage]);

  const reviewBorderColor = useMemo (() => {
    // if email is marked as review needed make the card border orange
    return {
      boxShadow: localReviewNeeded ? "0 0 0 1px rgba(249,115,22,1)" : "none",
      transition: "box-shadow 0.0s ease",
    };
    
  }, [localReviewNeeded]);

  const combinedStyle = {
    ...cardBorderColor,
    ...reviewBorderColor,
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
    ? "This job requires your review. Mark it as reviewed when done." 
    : "";

  const markAsReviewed = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    setLocalReviewNeeded(false);
    setIsOpen(true); // keep the card open to show the change

    // mark job as reviewed
    try {
      await api("/api/jobs/set-review-needed", {
        method: "POST",
        body: JSON.stringify({
          provider_message_ids: [job.id],
          needs_review: false,
      }),
      });
    } catch (error) {
      console.error("Failed to mark job as reviewed:", error);
      setLocalReviewNeeded(true); // keep the review needed state if API call fails
    }
  };

  // close modal with escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "escape") setShowDeleteConfirm(false);
    };

    if (showDeleteConfirm) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showDeleteConfirm]);

  // delete confirmation modal
  const modalMarkup = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`delete-dialog-title-${job.id}`}
      onClick={() => setShowDeleteConfirm(false)}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* dialog */}
      <div
        className="relative z-60 bg-[#111014] rounded p-6 w-11/12 max-w-md shadow-lg border"
        onClick={(e) => e.stopPropagation()}
      >

        <h3 id={`delete-dialog-title-${job.id}`} className="mb-2 text-lg font-semibold">
          Do you want to delete this card?
        </h3>

        <p className="text-sm text-gray-300 mb-4 truncate">{job.title}</p>

        <div className="flex gap-2 justify-end">

          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowDeleteConfirm(false);
            }}
            type="button"
            className="small"
            aria-label="Cancel delete"
          >
            Cancel
          </button>

          <button
            onClick={async (e) => {
              e.stopPropagation();
              e.preventDefault();

              if (isDeleting || isMultiSelecting) return;

              if (!onDelete) 
              {
                setShowDeleteConfirm(false);
                return;
              }

              setIsDeleting(true);
              try {
                const success = await onDelete(job.id);
                if (!success) 
                {
                  console.error("Failed to delete job with id:", job.id);
                }

              } catch (error) {
                console.error("Error occurred while deleting job with id:", job.id, error);

              } finally {
                setIsDeleting(false);
                setShowDeleteConfirm(false);
              }
            }}

            type="button"
            className="small bg-red-600 text-white"
            aria-label="Confirm delete"
          >
            
            {isDeleting ? "Deleting..." : "Yes, delete"}
          </button>
        </div>
      </div>
    </div>
  );


  return (
    <motion.div
      key={`${job.id}-${job.applicationStage}`}
      id={job.id}
      title={isHovered && hoverMessageForReview ? hoverMessageForReview : ""}
      className={`relative border w-full p-4 rounded shadow-sm bg-[#1D1B20] flex items-center flex flex-col`}
      style={combinedStyle}
      drag
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      variants={variants}
      animate={dimmed ? "dimmed" : "active"}
      whileHover={{
        scale: 1.02,
        boxShadow: "0px 3px 10px rgba(0,0,0,0.2)",
        cursor: "pointer",
        borderColor: localReviewNeeded ? "#F97316" : 
        
        // if email is marked as accepted make the card border green
        job.applicationStage === "Accepted" ? "#10B981" :

        // if email is marked as rejected make the card border red
        job.applicationStage === "Rejected" ? "#EF4444" : 
        "#dfdfdfff",
      }}

      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      

      // onTap cycles between expanding the card and selecting it based on isMultiSelecting
      onTap={() => {
        handleMultiSelectClick(job);
        if (isMultiSelecting) {
          setIsSelected(!isSelected);
          return;
        } else {
          setIsOpen(!isOpen);
        }
      }}
      whileTap={{ cursor: "grabbing" }}
      whileDrag={{
        cursor: "grabbing",
        scale: 1.05,
        boxShadow: "0px 5px 15px rgba(0,0,0,0.3)",
        pointerEvents: "none",
        zIndex: 1000,
      }}
      dragSnapToOrigin
      layout
    >
    {/* Tooltip for Review Needed */}
    <AnimatePresence>
      {localReviewNeeded && isHovered && (
        <motion.div
          key="review-tooltip"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.12 }}
          role="tooltip"
          aria-hidden={!isHovered}
          className="absolute right-3 top-3 z-50 bg-orange-600 text-white text-xs rounded px-2 py-1"
        >
          {hoverMessageForReview}
        </motion.div>
      )}
    </AnimatePresence>

      {/* Main Card Container Above (wraps all content) */}
      
      <div className="flex justify-between w-full items-center text-left">
        <motion.div className="flex items-center gap-2 " layout>
          {/* This Motion Div (above) is to wrap the title and the checkbox so we get smooth animation without affecting the open/close chevron*/}

          <AnimatePresence>
            {/* This animates in the checkbox when we are in multi-select mode */}
            {isMultiSelecting ? (
              <motion.img
                src={isSelected ? checkIcon : uncheckIcon}
                alt={isSelected ? "Check Icon" : "Uncheck Icon"}
                style={iconStyle}
                className="w-4 h-4 opacity-50"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                layout
              />
            ) : null}
          </AnimatePresence>

          {/* Job Title and date*/}
          <div className="flex flex-col flex-1 min-w-0">
            <p className="truncate">{job.title}</p>
            {job.date && (
              <small className="text-gray-400 opacity-75">{job.date}</small>
            )}
          </div>
        </motion.div>

        {/* Chevron to expand/collapse job card details rotates via it's style argument */}
        <img
          src={downChevron}
          alt="Show Content Handle"
          style={iconStyle}
          className="w-5 h-5 opacity-50"
        />
      </div>

      {/* Expanded Job Related Content */}
      <motion.div
        className="overflow-hidden w-full"
        animate={{
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0,
        }}
        initial={false}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
      >
        <div className="w-99/100 border-b my-2" />
        <div className="flex flex-col text-left w-full gap-1 pb-2">
          
          <small style={{ color: "var(--color-blue-4)" }}>
            {job.companyName ?? "Unknown Company"}
          </small>

          <small className="text-sm text-white opacity-75">
              {job.notes ?? "No additional notes."}
          </small>

          <div className="flex 2xl:flex-row flex-col gap-2 w-full" >

            <button
              onClick={(e) => {
                e.preventDefault();
                onEdit?.(job);
              }}
              type="button"
              className="small w-full 2xl:w-1/3"
            >
              Edit Application
            </button>

            {/* Delete button with confirmation */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                if (isMultiSelecting || isDeleting) return;

                setShowDeleteConfirm(true);
              }}
              
              type="button"
              className="small w-full 2xl:w-1/3"
              aria-label="Delete Job"
            >
              Delete
            </button>

            {/* View Email button */}
            {job.providerSource !== "manual_entry" && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  openMessage(job.id);
                }}
                type="button"
                className="small w-full 2xl:w-1/3"
              >
                View Email
              </button>
            )}

            
          </div>
            <button
                type="button"
                className={`small w-full 2xl:w-1/3 ${localReviewNeeded ? "reviewed" : "hidden"}`}
                onClick={markAsReviewed}
              >
                Mark as Reviewed
              </button>
        </div>
      </motion.div>
      {showDeleteConfirm && typeof window !== "undefined" && createPortal(modalMarkup, document.body)}
    </motion.div>
  );
}
