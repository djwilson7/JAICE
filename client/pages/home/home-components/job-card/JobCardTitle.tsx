import { useIsMultiSelecting } from "@/pages/home/hooks/useIsMultiSelecting";
import { motion } from "framer-motion";
import downChevron from "@/assets/icons/angle-small-down.svg";
import uncheckIcon from "@/assets/icons/uncheck-icon.svg";
import checkIcon from "@/assets/icons/check-icon.svg";
import type { JobCardType } from "@/types/jobCardType";

interface JobCardTitleProps {
  isSelected: boolean;
  handleTap: () => void;
  isOpen: boolean;
  job: JobCardType;
}

export function JobCardTitle({
  isSelected,
  handleTap,
  isOpen,
  job,
}: JobCardTitleProps) {
  const { isMultiSelecting } = useIsMultiSelecting();

  return (
    <motion.div
      className="flex justify-between w-full items-center text-left"
      onTap={handleTap}
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
          className={`w-4 h-4 opacity-50 icon ${isSelected ? "goldIcon" : ""}`}
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
            duration: 0.15,
          }}
        />
      </motion.div>
    </motion.div>
  );
}
