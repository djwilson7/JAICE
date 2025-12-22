import React from "react";
import type { JobCardType } from "@/types/jobCardType";
import downChevron from "@/assets/icons/angle-small-down.svg";
import { getCSSVar } from "@/utils/getCSSVar";

export default function JobCardView({
    job,
    onClick,
    className,
    compact = false,
    leftSlot,
}: {
    job: JobCardType;
    onClick?: (e?: React.MouseEvent) => void;
    className?: string;
    compact?: boolean;
    leftSlot?: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = React.useState(false);

    const handleToggle = (e?: React.MouseEvent | React.KeyboardEvent) => {
        if (onClick)
        {
            onClick(e as React.MouseEvent);
            return;
        }
        setIsOpen((prev) => !prev);
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            handleToggle(e);
        }
    };

    const showDetails = !compact || isOpen;

    return (
        <div
            className={`w-full flex items-center flex-col job-card ${className ?? ""}`}
            onClick={(e) => {
                handleToggle(e);
            }}
            onKeyDown={handleKey}
            role="button"
            tabIndex={0}
            aria-label={job.title}
            aria-expanded={isOpen}
        >
    {/* Job Header */}
      <div className="flex justify-between w-full items-center text-left p-2">
        <div className="flex items-center gap-2 w-7/8 min-w-0">
          {leftSlot && (
            <div 
                className="flex items-center mr-3">
                {leftSlot}
            </div>
          )}

        {/* Job Title and Date */}
          <div className="flex flex-col flex-1 min-w-0">
            <p className="primary-text truncate">{job.title}</p>
            {job.date && <small className="secondary-text truncate">{job.date}</small>}
          </div>
        </div>

        <div className="flex w-1/8 mr-2 justify-end">
          <img
            src={downChevron}
            alt={isOpen ? "Collapse" : "Expand"}
            className="w-5 h-5 icon"
            style={{
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: `transform ${getCSSVar("--animation-duration")}s`,
            }}
            aria-hidden
          />
        </div>
      </div>

      {showDetails && (
        <div className="overflow-hidden w-full px-4">
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
        </div>
      )}
    </div>
  );
}