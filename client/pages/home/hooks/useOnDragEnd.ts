import { useCallback, useContext } from "react";
import { DragContext } from "@/pages/home/contexts/DragContext";
import { api } from "@/global-services/api";
import type { JobCardType } from "@/types/jobCardType";

interface UseDragEndHandlerArgs {
  job: JobCardType;
  onDelete: (job: JobCardType) => Promise<boolean>;
}

export function useDragEndHandler({ job, onDelete }: UseDragEndHandlerArgs) {
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
    // Not our card? Bail.
    if (!draggedId || draggedId !== job.id) return;

    // No target or same column → snap back (no-op)
    if (dragTarget === null || dragTarget === dragStart) {
      cleanup();
      return;
    }

    try {
      // ARCHIVE
      if (dragTarget === "archive") {
        await api("/api/jobs/set-archive", {
          method: "POST",
          body: JSON.stringify({
            provider_message_ids: [job.id],
          }),
        });
        cleanup();
        return;
      }

      // DELETE
      if (dragTarget === "delete") {
        await onDelete(job);
        cleanup();
        return;
      }

      await api("/api/jobs/update-stage", {
        method: "POST",
        body: JSON.stringify({
          provider_message_ids: [job.id],
          app_stage: dragTarget,
        }),
      });
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
