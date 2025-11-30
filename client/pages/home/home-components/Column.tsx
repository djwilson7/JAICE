// import { localfiles } from "@/directory/path/to/localimport";

import React, { useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import RejectedIcon from "@/assets/icons/refresh.svg";
import { EmptyColumnPlaceholder } from "@/pages/home/home-components/EmptyColumnPlaceholder";
import NewApplication from "./ApplicationModal";
import type { JobCardType } from "@/types/jobCardType";

interface ColumnProps {
  id: string;
  title: string;
  children: React.ReactNode;
  bg: string;
  count: number;
  onDragEnter: (columnId: string) => void;
  onDragLeave: () => void;
  reportHeight: (columnId: string, height: number) => void;
  sharedHeight: number;
  viewportHeight: number;
  showToggleRejectButton?: boolean;
  onToggleReject?: () => void;
  isNewAppOpen: boolean;
  setIsNewAppOpen: (isOpen: boolean) => void;
  isHighlighted: string | null;
}

export function Column({
  id,
  title,
  children,
  bg,
  count,
  onDragEnter,
  onDragLeave,
  reportHeight,
  sharedHeight,
  viewportHeight,
  showToggleRejectButton,
  onToggleReject,
  isNewAppOpen,
  setIsNewAppOpen,
  isHighlighted,
}: ColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null); // Ref to the column div
  const hasChildren = count > 0;

  useEffect(() => {
    const el = columnRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        reportHeight(id, entry.contentRect.height);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [id, reportHeight]);

  const columnStyle = {
    background: bg,
    borderRadius: "8px",
    width: "100%",
    minWidth: "15rem",
    minHeight: `${Math.max(sharedHeight, viewportHeight)}px`,
    height: "auto",
  };

  // useCallback is used to memoize the drag handlers to prevent unnecessary re-renders
  const handlePointerEnter = useCallback(() => {
    onDragEnter(id);
  }, [onDragEnter, id]);

  const handlePointerLeave = useCallback(() => {
    onDragLeave();
  }, [onDragLeave]);

  function openNewApplicationModal() {
    setIsNewAppOpen(true);
  }

  function closeNewApplicationModal() {
    setIsNewAppOpen(false);
  }

  // placeholder to handle saving new application data
  function handleSaveApplication(data: Partial<JobCardType> & { id?: string }) {
    console.log("New Application Data:", data);
  }

  // onPointerEnter and onPointerLeave are used to send the column id up to the parent for drag and drop handling
  // layout is used for smooth animations when removing or adding job cards (drag and drop)
  // React.Children.count(children) is the safe way to count the number of cards a columns has
  const highlightColumn = isHighlighted === id || isHighlighted === "all";

  return (
    <>
      <motion.div
        id={id}
        ref={columnRef}
        style={columnStyle}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        className={`flex flex-col m-2 p-2 transition-all duration-300 shadow ${highlightColumn ? "highlighted" : ""}`}
        layout
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
      >
        <div className="flex items-center justify-between p-4 select-none">
          <button
            type="button"
            className="addApplication"
            aria-label={`Add new application to ${title} stage`}
            title={`Add new application to ${title} stage`}
            onClick={openNewApplicationModal}
          >
            +
          </button>
          <div className="flex items-center gap-2">
            <h3>{title}</h3>

            {showToggleRejectButton && onToggleReject && (
              <button
                onClick={onToggleReject}
                className="group"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 5,
                  cursor: "pointer",
                }}
                title="Switch to Accepted/Rejected"
              >
                <img
                  src={RejectedIcon}
                  alt="Switch toAccepted/Rejected"
                  className="w-5 h-5 transition-transform duration-300 ease-in-out group-hover:rotate-180"
                  style={{ filter: "var(--icon-filter)" }}
                />
              </button>
            )}
          </div>

          <h3>{count}</h3>
        </div>
        <div className="flex border-b mx-4 mb-2" />
        <div className="flex flex-col items-center p-2 gap-4">
          {hasChildren ? (
            children
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {<EmptyColumnPlaceholder title={title} />}
            </motion.div>
          )}
        </div>
      </motion.div>

      <NewApplication
        isOpen={isNewAppOpen}
        onClose={closeNewApplicationModal}
        initialStage={title}
        onSave={handleSaveApplication}
      />
    </>
  );
}
