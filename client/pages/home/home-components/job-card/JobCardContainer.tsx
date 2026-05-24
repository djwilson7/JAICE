import { motion } from "framer-motion";
import { useJobCardDrag } from "@/pages/home/hooks/useJobCardDrag";
import type { JobCardType } from "@/types/jobCardType";
import { useDeleteConfirm } from "@/pages/home/hooks/useDeleteConfirm";
import { useJobMutation } from "@/pages/home/hooks/useJobMutation";
import { useIsMultiSelecting } from "@/pages/home/hooks/useIsMultiSelecting";
import ConfirmModal from "@/global-components/ConfirmModal";

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
  const { mutateJob } = useJobMutation();
  const { isMultiSelecting } = useIsMultiSelecting();

  const deleteConfirm = useDeleteConfirm(async () => {
    await mutateJob(job, { type: "delete" });
  });

  const { onDragStart, onDragEnd } = useJobCardDrag(job, async () => {
    return new Promise((resolve) => {
      deleteConfirm.requestDelete(resolve);
    });
  });

  const variants = {
    dimmed: {
      opacity: 0.35,
      scale: 0.98,
      filter: "grayscale(40%) brightness(80%)",
    },
    normal: { opacity: 1, scale: 1, filter: "none" },
    selected: {
      scale: 1,
      boxShadow: "0 2px 8px rgba(var(--gold-rgb), 0.8)",
      border: "1px solid rgba(var(--gold-rgb), 0.8)",
    },

    unselected: {
      scale: 0.9,
    },

    hoverUnselected: {
      scale: 0.95,
      boxShadow: "0 2px 6px rgba(var(--gold-rgb), 0.5)",
      border: "1px solid rgba(var(--gold-rgb), 0.5)",
      cursor: "pointer",
    },
  };

  const cardState = !isMultiSelecting
    ? "normal"
    : isSelected
    ? "selected"
    : "unselected";

  const reviewClass = job.reviewNeeded ? "review" : "shadow";

  return (
    <>
      <motion.div
        key={`${job.id}-${job.applicationStage}`}
        id={job.id}
        className={`flex w-full shrink-0 items-center flex-col job-card min-h-[2rem] overflow-hidden ${reviewClass}`}
        drag
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        variants={variants}
        animate={dimmed ? "dimmed" : cardState}
        whileHover={
          isMultiSelecting && !isSelected
            ? "hoverUnselected"
            : { cursor: "pointer" }
        }
        onHoverStart={!isMultiSelecting ? () => setIsHovered(true) : undefined}
        onHoverEnd={!isMultiSelecting ? () => setIsHovered(false) : undefined}
        
        whileTap={{ cursor: "grabbing" }}
        whileDrag={{
          cursor: "grabbing",
          scale: 1.05,
          pointerEvents: "none",
          zIndex: 1000,
        }}
        dragSnapToOrigin
        layout
      >
        {children}
      </motion.div>
      <ConfirmModal
        isOpen={deleteConfirm.open}
        title="Confirm Deletion"
        message="Are you sure you want to delete the selected item/s? You can undo this action from the Trash however it will be permanently deleted after 30 days."
        confirmLabel="Delete"
        isProcessing={deleteConfirm.processing}
        onCancel={deleteConfirm.cancel}
        onConfirm={deleteConfirm.confirm}
      />
    </>
  );
}
