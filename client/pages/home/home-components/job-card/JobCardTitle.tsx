import type { JobCardType } from "@/types/jobCardType";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef } from "react";
import { useIsMultiSelecting } from "@/pages/home/hooks/useIsMultiSelecting";
import { motion } from "framer-motion";
import { useSelectedJobs } from "@/pages/home/hooks/useSelectedJobs";
import { useJobCard } from "@/pages/home/hooks/useJobCard";
import downChevron from "@/assets/icons/angle-small-down.svg";
import uncheckIcon from "@/assets/icons/uncheck-icon.svg";
import checkIcon from "@/assets/icons/check-icon.svg";
import { getCSSVar } from "@/utils/getCSSVar";

interface JobCardTitleProps {
  isSelected: boolean;
  setIsSelected: (selected: boolean) => void;
  isOpen: boolean;
  setLocalOpen: Dispatch<SetStateAction<boolean | null>>;
  job: JobCardType;
}

export function JobCardTitle({
  isSelected,
  setIsSelected,
  isOpen,
  setLocalOpen,
  job,
}: JobCardTitleProps) {
  const { isMultiSelecting } = useIsMultiSelecting();
  const { toggleJobSelection } = useSelectedJobs();
  const { expandAll, commandId, registerOpen, registerClose } = useJobCard();
  const prevOpenRef = useRef(false);

  const toggle = () => {
    setLocalOpen((prev) => !(prev ?? expandAll));
  };

  const handleTitleTap = () => {
    if (isMultiSelecting) {
      toggleJobSelection(job);
      setIsSelected(!isSelected);
    } else {
      toggle();
    }
  };

  useEffect(() => {
    if (isOpen !== prevOpenRef.current) {
      if (isOpen) {
        registerOpen();
      } else {
        registerClose();
      }
      prevOpenRef.current = isOpen;
    }
  }, [isOpen, registerOpen, registerClose]);

  useEffect(() => {
    setLocalOpen(null);
  }, [commandId, setLocalOpen]);

  return (
    <motion.div className="flex justify-center w-full items-center">
      <motion.div
        className="flex items-center justify-center h-full w-[10%]"
        initial={{ opacity: 0 }}
        animate={{ opacity: isMultiSelecting ? 1 : 0 }}
        exit={{ opacity: 0 }}
        
        layout
        onTap={handleTitleTap}
      >
        <motion.img
          src={isSelected ? checkIcon : uncheckIcon}
          alt={isSelected ? "Check Icon" : "Uncheck Icon"}
          className={`w-4 h-4 icon ${isSelected ? "goldIcon" : ""}`}
          initial={{ opacity: 0 }}
          animate={{
            opacity: isMultiSelecting ? 1 : 0,
            width: isMultiSelecting ? "auto" : 0,
          }}
          exit={{ opacity: 0, width: 0 }}
          layout
        />
      </motion.div>
      <motion.div
        className="flex items-center gap-2 py-4  w-[80%] text-left"
        layout
        title="Click to open, close, or select this job card"
        onTap={handleTitleTap}
      >
        <motion.div className="flex flex-col flex-1 min-w-0">
          <p className="primary-text ">
            {job.title}
          </p>
          {job.date && (
            <small className="secondary-text whitespace-nowrap text-ellipsis overflow-hidden">
              {job.date}
            </small>
          )}

        </motion.div>
      </motion.div>

      <motion.div
        className="flex w-[10%] h-full justify-center items-center"
        layout
        onTap={toggle}
      >
        <motion.img
          src={downChevron}
          alt="Show Content Handle"
          className="w-5 h-5 icon"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{
            duration: parseFloat(getCSSVar("--animation-duration")),
          }}
        />
      </motion.div>
    </motion.div>
  );
}
