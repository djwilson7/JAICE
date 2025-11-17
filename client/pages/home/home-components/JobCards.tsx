// import { localfiles } from "@/directory/path/to/localimport";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState } from "react";
import downChevron from "@/assets/icons/angle-small-down.svg";
import uncheckIcon from "@/assets/icons/uncheck-icon.svg";
import checkIcon from "@/assets/icons/check-icon.svg";
import type { JobCardType } from "@/types/jobCardType";
import { auth } from "@/global-services/firebase";

export function JobCard({
  job,
  onDragStart,
  onDragEnd,
  isMultiSelecting,
  handleMultiSelectClick,
  dimmed,
}: {
  job: JobCardType;
  onDragStart: (job: JobCardType) => void;
  onDragEnd: () => void;
  isMultiSelecting: boolean;
  handleMultiSelectClick: (job: JobCardType) => void;
  dimmed: boolean;
}) {
  const [isSelected, setIsSelected] = useState(false); // Placeholder for selection state
  const [isOpen, setIsOpen] = useState(false); // State to manage expanded/collapsed view

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

  const variants = {
    active: { opacity: 1, scale: 1, filter: "none" },
    dimmed: {
      opacity: 0.35,
      scale: 0.98,
      filter: "grayscale(40%) brightness(80%)",
    },
  };

  return (
    <motion.div
      id={job.id}
      className={`border w-full p-4 rounded shadow-sm bg-[#1D1B20] flex items-center flex flex-col`}
      drag
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      variants={variants}
      animate={dimmed ? "dimmed" : "active"}
      whileHover={{
        scale: 1.02,
        boxShadow: "0px 3px 10px rgba(0,0,0,0.2)",
        cursor: "pointer",
      }}
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
          <small>Small Startup</small>
          <small>Recruiter</small>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              openMessage(job.id);
            }}
            className="hover:underline text-sm cursor-pointer"
            style={{
              color: "var(--color-blue-5)",
              transition: "color 0.25s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--color-blue-4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--color-blue-5)";
            }}
          >
            View Email
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}
