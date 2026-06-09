import { motion } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useJobCardDrag } from "@/pages/home/hooks/useJobCardDrag";
import type { JobCardType } from "@/types/jobCardType";
import { useIsMultiSelecting } from "@/pages/home/hooks/useIsMultiSelecting";
import { useSelectedJobs } from "@/pages/home/hooks/useSelectedJobs";
import { useDrag } from "@/pages/home/hooks/useDrag";

const DRAG_OVERLAY_Z_INDEX = 100000;

interface JobCardContainerProps {
  job: JobCardType;
  dimmed: boolean;
  setIsHovered: (hovered: boolean) => void;
  children: React.ReactNode;
  isSelected: boolean;
}

export function JobCardContainer({
  job,
  dimmed,
  setIsHovered,
  children,
  isSelected,
}: JobCardContainerProps) {
  const { isMultiSelecting } = useIsMultiSelecting();
  const { selectedJobs } = useSelectedJobs();
  const { isDragging, draggedId, dragPoint } = useDrag();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [dragCloneRect, setDragCloneRect] = useState<DOMRect | null>(null);

  const { onPointerDown } = useJobCardDrag(job);
  const selectedJobIndex = selectedJobs.findIndex(
    (selectedJob) => selectedJob.id === job.id
  );
  const draggedSelectedJobIndex = selectedJobs.findIndex(
    (selectedJob) => selectedJob.id === draggedId
  );
  const isGroupDrag =
    isMultiSelecting && draggedSelectedJobIndex >= 0 && selectedJobs.length > 1;
  const draggedGroupSize = isGroupDrag ? selectedJobs.length : 1;
  const isDragSource = isDragging && draggedId === job.id;
  const isDraggedGroupMember =
    isDragging && isGroupDrag && selectedJobIndex >= 0;
  const isDraggedCard = isDragSource || isDraggedGroupMember;
  const stackOrder = isDragSource
    ? 0
    : selectedJobs
        .filter((selectedJob) => selectedJob.id !== draggedId)
        .findIndex((selectedJob) => selectedJob.id === job.id) + 1;
  const stackOffset =
    Math.min(stackOrder, 12) * 8 + Math.max(0, stackOrder - 12) * 1.5;
  const overlayZIndex = DRAG_OVERLAY_Z_INDEX + draggedGroupSize - stackOrder;
  const shouldShowStackClone = isDraggedCard && dragPoint;
  const shouldDimOriginal = isDraggedCard && !!dragCloneRect;
  const cardTransition = {
    layout: { duration: 0.58 },
    opacity: { duration: 0.32 },
    y: { duration: 0.48 },
    scale: { duration: 0.42 },
  };

  useLayoutEffect(() => {
    if (!isDraggedCard) {
      setDragCloneRect(null);
      return;
    }

    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      setDragCloneRect(rect);
    }
  }, [isDraggedCard]);

  const variants = {
    dimmed: {
      opacity: shouldDimOriginal ? 0.22 : 0.35,
      scale: 0.98,
      y: 0,
      filter: shouldDimOriginal
        ? "grayscale(80%) brightness(58%)"
        : "grayscale(40%) brightness(80%)",
    },
    normal: {
      opacity: 1,
      scale: 1,
      y: 0,
      filter: "none",
      boxShadow: "none",
      border: "1px solid rgba(var(--primary-five-rgb), 0.14)",
      background: "var(--job-card-bg)",
    },
    selected: {
      opacity: shouldDimOriginal ? 0.28 : 1,
      scale: 1,
      y: 0,
      filter: shouldDimOriginal ? "grayscale(80%) brightness(58%)" : "none",
      boxShadow: "none",
      border: "1px solid rgba(74, 222, 128, 0.68)",
      background: "rgba(34, 197, 94, 0.24)",
      backdropFilter: "blur(10px)",
    },

    unselected: {
      opacity: shouldDimOriginal ? 0.22 : 1,
      scale: 1,
      y: 0,
      filter: shouldDimOriginal ? "grayscale(80%) brightness(58%)" : "none",
      boxShadow: "none",
      border: "1px solid rgba(var(--primary-five-rgb), 0.14)",
      background: "var(--job-card-bg)",
    },

    hoverUnselected: {
      opacity: 1,
      scale: 1,
      y: 0,
      boxShadow: "none",
      border: "1px solid rgba(74, 222, 128, 0.28)",
      background: "rgba(34, 197, 94, 0.1)",
      cursor: "pointer",
    },
    dragPlaceholder: {
      opacity: 0.24,
      scale: 1,
      y: 0,
      filter: "grayscale(85%) brightness(55%)",
      boxShadow: "none",
      border: "1px solid rgba(var(--primary-five-rgb), 0.16)",
      background: "rgba(var(--job-card-background-rgb), 0.36)",
    },
  };

  const cardState = !isMultiSelecting
    ? "normal"
    : isSelected
    ? "selected"
    : "unselected";
  const visualState = shouldDimOriginal
    ? "dragPlaceholder"
    : dimmed
    ? "dimmed"
    : cardState;

  const reviewClass = job.reviewNeeded ? "review" : "";

  return (
    <>
      <motion.div
        ref={cardRef}
        key={`${job.id}-${job.applicationStage}`}
        id={job.id}
        className={`flex w-full shrink-0 select-none items-center flex-col job-card min-h-[2rem] overflow-hidden p-0 ${reviewClass}`}
        onPointerDown={onPointerDown}
        variants={variants}
        animate={visualState}
        whileHover={
          isMultiSelecting && !isSelected
            ? "hoverUnselected"
            : { cursor: "pointer" }
        }
        onHoverStart={!isMultiSelecting ? () => setIsHovered(true) : undefined}
        onHoverEnd={!isMultiSelecting ? () => setIsHovered(false) : undefined}
        whileTap={{ cursor: "grabbing" }}
        transition={cardTransition}
      >
        {children}
      </motion.div>
      {shouldShowStackClone && dragCloneRect && createPortal(
        <motion.div
          className={`fixed flex shrink-0 select-none items-center flex-col job-card min-h-[2rem] overflow-hidden p-0 ${reviewClass}`}
          style={{
            zIndex: overlayZIndex,
            pointerEvents: "none",
            border: "1px solid rgba(74, 222, 128, 0.68)",
            background: "rgba(34, 197, 94, 0.24)",
            boxShadow: "none",
            backdropFilter: "blur(10px)",
          }}
          initial={{
            left: dragCloneRect.left + dragCloneRect.width / 2,
            top: dragCloneRect.top + dragCloneRect.height / 2,
            width: dragCloneRect.width,
            opacity: 1,
            scale: 1,
            x: "-50%",
            y: `calc(-50% + ${stackOffset}px)`,
          }}
          animate={{
            left: dragPoint.x,
            top: dragPoint.y,
            width: dragCloneRect.width,
            opacity: 1,
            scale: stackOrder === 0 ? 1.05 : 1,
            x: "-50%",
            y: `calc(-50% + ${stackOffset}px)`,
          }}
          transition={{
            left: { duration: 0.24 },
            top: { duration: 0.24 },
            scale: { duration: 0.18 },
          }}
        >
          {children}
        </motion.div>,
        document.body
      )}
    </>
  );
}
