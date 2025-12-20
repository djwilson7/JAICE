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

  const { draggedId, dragTarget, setIsDragging, setDraggedId, setDragTarget } =
    drag;

  const processDragEnd = useCallback(async () => {
    // Not our card? Bail.
    if (!draggedId || draggedId !== job.id) return;

    setIsDragging(false);

    // No target or same column → snap back (no-op)
    if (!dragTarget || dragTarget === job.column) {
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
        if (onDelete) {
          await onDelete(job);
        }
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
  }, [draggedId, dragTarget, job]);

  const cleanup = () => {
    setDraggedId(null);
    setDragTarget(null);
  };

  return { processDragEnd };
}
