import envelopeOpenIcon from "@/assets/icons/envelope-open.svg";
import { writeJobsToDB } from "@/global-services/writeJobsToDB";
import { useState } from "react";
import type { JobCardType } from "@/types/jobCardType";

interface ReadAllButtonProps {
  jobs: JobCardType[];
  compact?: boolean;
}

export function ReadAllButton({ jobs, compact = false }: ReadAllButtonProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const unreadJobs = jobs.filter((j) => j.recentlyAdded);
  const hasUnread = unreadJobs.length > 0;

  const handleReadAll = async () => {
    if (!hasUnread || isUpdating) return;

    setIsUpdating(true);

    try {
      const jobsToUpdate = unreadJobs.map((job) => ({
        ...job,
        recentlyAdded: false,
      }));

      await writeJobsToDB({ jobs_to_update: jobsToUpdate });
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className={`flex control-bar-container ${
        compact ? "control-bar-container-compact" : ""
      } ${!hasUnread || isUpdating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      onClick={handleReadAll}
      role="button"
      aria-label="Read All"
      title="Mark all recently added as opened"
    >
      <div className="flex flex-row gap-2 items-center justify-center">
        <img
          src={envelopeOpenIcon}
          alt="Read All"
          className="w-5 h-5 icon"
        />
        {!compact && (
          <span className="control-bar-label whitespace-nowrap">Read All</span>
        )}
      </div>
    </div>
  );
}
