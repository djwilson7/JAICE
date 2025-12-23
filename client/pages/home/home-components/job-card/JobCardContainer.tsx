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
    active: { opacity: 1, scale: 1, filter: "none" },
    dimmed: {
      opacity: 0.35,
      scale: 0.98,
      filter: "grayscale(40%) brightness(80%)",
    },
  };

  const reviewClass = job.reviewNeeded ? "review" : "shadow";

  const cardClass = !isMultiSelecting
    ? ""
    : isSelected
    ? "selectedJobCard"
    : "unselectedJobCard";

  return (
    <>
      <motion.div
        key={`${job.id}-${job.applicationStage}`}
        id={job.id}
        className={`w-full flex items-center flex flex-col job-card z-500 min-h-[2rem] overflow-hidden ${reviewClass} ${cardClass}`}
        drag
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        variants={variants}
        animate={dimmed ? "dimmed" : "active"}
        whileHover={
          !isMultiSelecting ? { scale: 1.02, cursor: "pointer" } : undefined
        }
        onHoverStart={!isMultiSelecting ? () => setIsHovered(true) : undefined}
        onHoverEnd={!isMultiSelecting ? () => setIsHovered(false) : undefined}
        // onTap cycles between expanding the card and selecting it based on isMultiSelecting
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
