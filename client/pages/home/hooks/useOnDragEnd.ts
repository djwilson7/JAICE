import { useCallback, useContext } from "react";
import { DragContext } from "@/pages/home/contexts/DragContext";
import { writeJobsToDB } from "@/global-services/writeJobsToDB";
import type { JobCardType } from "@/types/jobCardType";
import { ValidColumns } from "@/types/validColumns";

interface UseDragEndHandlerArgs {
  job: JobCardType;
}

export function useDragEndHandler({ job }: UseDragEndHandlerArgs) {
  const drag = useContext(DragContext);

  if (!drag) {
    throw new Error("useDragEndHandler must be used within DragProvider");
  }

  const {
    draggedId,
    dragTarget,
    setIsDragging,
    setDraggedId,
    setDragTarget,
    dragStart,
    setDragStart,
  } = drag;

  const processDragEnd = useCallback(async () => {
    if (!draggedId || draggedId !== job.id) return;

    if (
      dragTarget === null ||
      dragTarget === dragStart ||
      !ValidColumns.includes(dragTarget)
    ) {
      cleanup();
      return;
    }

    //Make a copy of the job card and update its properties based on drag target
    const updatedJob: JobCardType = { ...job };
    updatedJob.reviewNeeded =
      job.reviewNeeded && dragTarget !== dragStart ? false : job.reviewNeeded;
    updatedJob.column =
      dragTarget !== "archive" && dragTarget !== "delete"
        ? dragTarget
        : job.column;
    updatedJob.isArchived =
      dragTarget === "archive" ? !job.isArchived : job.isArchived;
    updatedJob.isDeleted =
      dragTarget === "delete" ? !job.isDeleted : job.isDeleted;

    try {
      await writeJobsToDB({ jobs_to_update: [updatedJob] });
    } catch (err) {
      console.error("Drag end operation failed:", err);
    } finally {
      cleanup();
    }
  }, [draggedId, dragTarget, dragStart, job]);

  const cleanup = () => {
    setIsDragging(false);
    setDraggedId(null);
    setDragTarget(null);
    setDragStart(null);
  };

  return { processDragEnd };
}
