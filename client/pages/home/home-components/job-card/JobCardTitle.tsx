import type { JobCardType } from "@/types/jobCardType";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef } from "react";
import { useIsMultiSelecting } from "@/pages/home/hooks/useIsMultiSelecting";
import { motion } from "framer-motion";
import { useSelectedJobs } from "@/pages/home/hooks/useSelectedJobs";
import { useJobCard } from "@/pages/home/hooks/useJobCard";
import { getCSSVar } from "@/utils/getCSSVar";
import { dispatchJobLocalChange } from "@/pages/home/utils/jobLocalChangeEvent";
import { writeJobsToDB } from "@/global-services/writeJobsToDB";

interface JobCardTitleProps {
  isSelected: boolean;
  setIsSelected: (selected: boolean) => void;
  isOpen: boolean;
  isHovered: boolean;
  setLocalOpen: Dispatch<SetStateAction<boolean | null>>;
  job: JobCardType;
  allowSelection?: boolean;
  mode?: "trash" | "archive" | "default";
}

function getDateParts(job: JobCardType) {
  const rawDate = job.receivedAtRaw;
  const ms = rawDate
    ? /^\d{13}$/.test(String(rawDate))
      ? Number(rawDate)
      : Date.parse(String(rawDate))
    : NaN;

  if (!Number.isNaN(ms)) {
    const date = new Date(ms);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return {
      date: date.toLocaleDateString("en-US", {
        dateStyle: "medium",
        timeZone,
      }),
      time: date.toLocaleTimeString("en-US", {
        timeStyle: "short",
        timeZone,
      }),
    };
  }

  const fallback = job.date ?? "";
  const [date, time] = fallback.split(/,\s(?=[^,]+$)/);

  return {
    date: date || fallback,
    time: time || "",
  };
}

export function JobCardTitle({
  isSelected,
  setIsSelected,
  isOpen,
  isHovered,
  setLocalOpen,
  job,
  allowSelection = true,
  mode = "default",
}: JobCardTitleProps) {
  const { isMultiSelecting } = useIsMultiSelecting();
  const { toggleJobSelection } = useSelectedJobs();
  const { expandAll, commandId, registerOpen, registerClose } = useJobCard();
  const prevOpenRef = useRef(false);
  const { date, time } = getDateParts(job);

  const toggle = () => {
    let shouldUpdateDB = false;
    
    setLocalOpen((prev) => {
      const nextOpen = !(prev ?? expandAll);

      if (nextOpen && job.recentlyAdded) {
        shouldUpdateDB = true;
        dispatchJobLocalChange({
          before: job,
          after: { ...job, recentlyAdded: false },
        });
      }

      return nextOpen;
    });

    if (shouldUpdateDB) {
      writeJobsToDB({ jobs_to_update: [{ ...job, recentlyAdded: false }] }).catch(console.error);
    }
  };

  const handleTitleTap = () => {
    if (allowSelection && isMultiSelecting) {
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

  const getDaysUntilDeletion = () => {
    const rawDate = job.updatedAtRaw || job.receivedAtRaw;
    if (!rawDate) return 30;
    const ms = /^\d{13}$/.test(String(rawDate))
      ? Number(rawDate)
      : Date.parse(String(rawDate));
    if (Number.isNaN(ms)) return 30;
    const daysPassed = Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - daysPassed);
  };

  const isTrash = mode === "trash";
  const isArchive = mode === "archive";
  const isDefault = mode === "default" || mode === undefined;

  const getArchiveDateStr = () => {
    const rawDate = job.updatedAtRaw || job.receivedAtRaw;
    if (!rawDate) return date;
    let strDate = String(rawDate);
    // If it's just a date (YYYY-MM-DD), append time to prevent timezone shift
    if (strDate.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(strDate)) {
      strDate += "T12:00:00Z";
    }
    // Handle Postgres timestamp without T (e.g. 2026-06-09 15:30:00)
    strDate = strDate.replace(" ", "T");
    const ms = /^\d{13}$/.test(strDate) ? Number(strDate) : Date.parse(strDate);

    if (!Number.isNaN(ms)) {
      return new Date(ms).toLocaleDateString("en-US", {
        dateStyle: "medium",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }
    return date;
  };

  return (
    <motion.div className="flex w-full items-center justify-center p-3">
      <motion.div
        className="flex min-w-0 flex-1 text-left"
        title="Click to open, close, or select this job card"
        onTap={handleTitleTap}
      >
        <motion.div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="job-card-title-text primary-text">
            {job.title}
          </p>
          <div className="flex min-w-0 items-center justify-between gap-3">
            <small className="job-card-date-text secondary-text overflow-hidden text-ellipsis whitespace-nowrap">
              {date}
            </small>
            <span className={`relative flex h-[0.9rem] ${isDefault ? "w-[6.25rem]" : "w-[9.5rem]"} shrink-0 items-center justify-end overflow-hidden`}>
              <motion.span
                className="job-card-date-text secondary-text absolute inset-y-0 right-0 flex items-center whitespace-nowrap"
                style={
                  isTrash
                    ? { color: "var(--text-red)" }
                    : isArchive
                    ? { color: "var(--text-purple)" }
                    : {}
                }
                initial={{
                  opacity: isHovered || (isDefault && job.recentlyAdded) ? 0 : 1,
                  x: isHovered ? -8 : 0,
                }}
                animate={{
                  opacity: isHovered || (isDefault && job.recentlyAdded) ? 0 : 1,
                  x: isHovered ? -8 : 0,
                }}
                transition={{
                  duration: parseFloat(getCSSVar("--animation-duration")),
                  ease: "easeOut",
                }}
              >
                {isTrash
                  ? `Deletes in ${getDaysUntilDeletion()} days`
                  : isArchive
                  ? `Archived ${getArchiveDateStr()}`
                  : time}
              </motion.span>
              
              {isDefault && (
                <motion.span
                  className="job-card-date-text job-card-recent-text absolute inset-y-0 right-0 flex items-center whitespace-nowrap"
                  initial={{
                    opacity: !isHovered && job.recentlyAdded ? 1 : 0,
                    x: !isHovered && job.recentlyAdded ? 0 : -8,
                  }}
                  animate={{
                    opacity: !isHovered && job.recentlyAdded ? 1 : 0,
                    x: !isHovered && job.recentlyAdded ? 0 : -8,
                  }}
                  transition={{
                    duration: parseFloat(getCSSVar("--animation-duration")),
                    ease: "easeOut",
                  }}
                >
                  Recently Added
                </motion.span>
              )}

              <motion.span
                className="job-card-date-text secondary-text absolute inset-y-0 right-0 flex items-center whitespace-nowrap"
                initial={{
                  opacity: isHovered ? 1 : 0,
                  x: isHovered ? 0 : 8,
                }}
                animate={{
                  opacity: isHovered ? 1 : 0,
                  x: isHovered ? 0 : 8,
                }}
                transition={{
                  duration: parseFloat(getCSSVar("--animation-duration")),
                  ease: "easeOut",
                }}
              >
                {isOpen ? "Tap to Close" : "Tap to Open"}
              </motion.span>
            </span>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
