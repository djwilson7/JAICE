// import { localfiles } from "@/directory/path/to/localimport";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
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

export function JobCard({
  job,
  onDragStart,
  onDragEnd,
  isMultiSelecting,
  handleMultiSelectClick,
  dimmed,
  onEdit,
}: {
  job: JobCardType;
  onDragStart: (job: JobCardType) => void;
  onDragEnd: () => void;
  isMultiSelecting: boolean;
  handleMultiSelectClick: (job: JobCardType) => void;
  dimmed: boolean;
  onEdit?: (job: JobCardType) => void;
}) {
  const [isSelected, setIsSelected] = useState(false); // Placeholder for selection state
  const [isOpen, setIsOpen] = useState(false); // State to manage expanded/collapsed view
  const [localReviewNeeded, setLocalReviewNeeded] = useState<boolean>(
    !!job.reviewNeeded
  );

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
    if (!userEmail) {
      console.error("User is not authenticated. Cannot open email.");
      return;
    }

    // open the email in a new window
    const url = `https://mail.google.com/mail/u/${userEmail}/#inbox/${messageId}`;
    window.open(url, "_blank");
  };

  const cardBorderColor = useMemo(() => {
    const color =
      //   // if email is marked as accepted make the card border green
      //  job.applicationStage === "Accepted" ? "#10B981" :

      //  // if email is marked as rejected make the card border red
      //   job.applicationStage === "Rejected" ? "#EF4444" :

      "transparent";

    return {
      border:
        color === "transparent"
          ? "1px solid transparent"
          : `1px solid ${color}`,
      transition: "border 0.3s ease",
    };
  }, [job.applicationStage]);

  const reviewBorderColor = useMemo(() => {
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
    ? "This job requires your review."
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

  return (
    <motion.div
      key={`${job.id}-${job.applicationStage}`}
      id={job.id}
      title={isHovered && hoverMessageForReview ? hoverMessageForReview : ""}
      className={`relative border w-full rounded shadow-sm flex items-center flex flex-col ${cardBorderColor}`}
      style={{ ...combinedStyle, background: "var(--job-card-background)" }}
      drag
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      variants={variants}
      animate={dimmed ? "dimmed" : "active"}
      whileHover={{
        scale: 1.02,
        boxShadow: "0px 3px 10px rgba(0,0,0,0.2)",
        cursor: "pointer",
        borderColor: localReviewNeeded
          ? "#F97316"
          : // if email is marked as accepted make the card border green
          job.applicationStage === "Accepted"
          ? "#10B981"
          : // if email is marked as rejected make the card border red
          job.applicationStage === "Rejected"
          ? "#EF4444"
          : "#dfdfdfff",
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      // onTap cycles between expanding the card and selecting it based on isMultiSelecting

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
        className="w-full z-50 border-b border-orange-600 text-orange-600"
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
        <motion.div className="flex items-center gap-2 p-2 w-7/8" layout>
          {/* This Motion Div (above) is to wrap the title and the checkbox so we get smooth animation without affecting the open/close chevron*/}

          {/* This animates in the checkbox when we are in multi-select mode */}
          <motion.img
            src={isSelected ? checkIcon : uncheckIcon}
            alt={isSelected ? "Check Icon" : "Uncheck Icon"}
            style={iconStyle}
            className="w-4 h-4 opacity-50"
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
            <p className="">{job.title}</p>
            {job.date && (
              <small className="text-gray-400 opacity-75">{job.date}</small>
            )}
          </motion.div>
        </motion.div>

        {/* Chevron to expand/collapse job card details rotates via it's style argument */}
        <motion.div className="flex w-1/8 mr-2 justify-end">
          <motion.img
            src={downChevron}
            alt="Show Content Handle"
            className="w-5 h-5 opacity-50 icon"
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
        <hr className="flex w-full my-2 opacity-20" />
        <div className="flex flex-col text-left w-full gap-1 pb-2">
          <small style={{ color: "var(--color-blue-4)" }}>
            {job.companyName ?? "Unknown Company"}
          </small>

          <small className="text-sm text-white opacity-75">
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
        <hr className="flex w-full opacity-20" />
        <motion.div className="flex flex-row gap-2 p-2 w-full"
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
            onClick={(e) => {
              e.preventDefault();
              onEdit?.(job);
            }}
            type="button"
            className="small w-full"
          >
            <img
              src={editIcon}
              alt="Edit Icon"
              className="inline w-4 h-4 mr-1"
            />
          </motion.button>

          {job.providerSource !== "manual_entry" && (
            <motion.button
              onClick={(e) => {
                e.preventDefault();
                openMessage(job.id);
              }}
              type="button"
              className="small w-full"
            >
              <img
                src={viewIcon}
                alt="View Icon"
                className="inline w-4 h-4 mr-1"
              />
            </motion.button>
          )}

          <motion.button
            type="button"
            className={`small w-full ${
              localReviewNeeded ? "reviewed" : "hidden"
            }`}
            onClick={markAsReviewed}
          >
            <img
              src={reviewIcon}
              alt="Review Icon"
              className="inline w-4 h-4 mr-1"
            />
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
