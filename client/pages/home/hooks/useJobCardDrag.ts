import type { JobCardType } from "@/types/jobCardType";
import { useDrag } from "@/pages/home/hooks/useDrag";
import { isValidColumn } from "@/types/validColumns";
import { useIsMultiSelecting } from "@/pages/home/hooks/useIsMultiSelecting";
import { useSelectedJobs } from "@/pages/home/hooks/useSelectedJobs";
import { useUndoRedo } from "@/pages/home/hooks/useUndoRedo";
import { writeJobsToDB } from "@/global-services/writeJobsToDB";
import { dispatchJobLocalChange } from "@/pages/home/utils/jobLocalChangeEvent";
import type { DragTarget } from "@/types/dragTarget";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useBannerNotifications } from "@/global-components/bannerNotificationContext";
import { useSettings } from "@/pages/settings/provider/settingsContext";
import {
  getJobDisplayColumn,
  getJobsMovingToColumn,
} from "@/pages/home/utils/jobDisplayColumn";

const DRAG_START_THRESHOLD = 4;

function getDragTargetFromPoint(x: number, y: number): DragTarget {
  const element = document.elementFromPoint(x, y);
  const target = element?.closest<HTMLElement>("[data-drag-target]");
  const targetId = target?.dataset.dragTarget;

  return targetId && isValidColumn(targetId) ? targetId : null;
}

function isInteractiveDragOrigin(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    !!target.closest(
      "button, input, textarea, select, a, [role='button'], [data-no-card-drag]"
    )
  );
}

export function useJobCardDrag(job: JobCardType) {
  const { isMultiSelecting, setIsMultiSelecting } = useIsMultiSelecting();
  const { selectedJobs, setSelectedJobs } = useSelectedJobs();
  const { pushUndo } = useUndoRedo();
  const { showBanner } = useBannerNotifications();
  const { reviewBehavior } = useSettings();
  const {
    setIsDragging,
    setDraggedId,
    setDraggedJobs,
    setDragPoint,
    setDragTarget,
    setDragStart,
  } = useDrag();

  const getDraggedJobs = () => {
    const selectedJobIds = new Set(
      selectedJobs.map((selectedJob) => selectedJob.id)
    );

    return isMultiSelecting && selectedJobIds.has(job.id)
      ? selectedJobs
      : [job];
  };

  const startDrag = (
    point: { x: number; y: number },
    draggedJobs: JobCardType[]
  ) => {
    setIsDragging(true);
    setDraggedId(job.id);
    setDraggedJobs(draggedJobs);
    setDragPoint(point);
    setDragStart(getJobDisplayColumn(job, reviewBehavior));
  };

  const finishDrag = async (
    targetColumn: DragTarget,
    draggedJobs: JobCardType[]
  ) => {
    setIsDragging(false);
    if (!targetColumn) return cleanup();

    const jobsToMove = getJobsMovingToColumn(
      draggedJobs,
      targetColumn,
      reviewBehavior
    );
    if (jobsToMove.length === 0) return cleanup();

    const before = jobsToMove;
    const after = jobsToMove.map((jobToMove) => ({
      ...jobToMove,
      column: targetColumn,
      applicationStage: targetColumn,
      reviewNeeded: false,
    }));

    after.forEach((afterJob, index) => {
      dispatchJobLocalChange({ before: before[index], after: afterJob });
    });

    try {
      await writeJobsToDB({ jobs_to_update: after });

      pushUndo({
        label: draggedJobs.length > 1 ? "moveMultiple" : "Drag & Drop",
        before,
        after,
      });

      if (draggedJobs.length > 1) {
        setSelectedJobs([]);
        setIsMultiSelecting(false);
      }

      showBanner({
        message:
          draggedJobs.length > 1
            ? `${jobsToMove.length} jobs moved to ${formatColumnName(targetColumn)}.`
            : `${job.title} moved to ${formatColumnName(targetColumn)}.`,
        tone: "success",
        timeoutMs: 4000,
      });
    } catch (error) {
      before.forEach((beforeJob, index) => {
        dispatchJobLocalChange({ before: after[index], after: beforeJob });
      });
      console.error("Failed to move dragged job group:", error);
      showBanner({
        message:
          draggedJobs.length > 1
            ? "Failed to move selected jobs. Try again."
            : "Failed to move job. Try again.",
        tone: "error",
        timeoutMs: 10000,
      });
    } finally {
      cleanup();
    }
  };

  const cleanup = () => {
    setIsDragging(false);
    setDraggedId(null);
    setDraggedJobs([]);
    setDragPoint(null);
    setDragTarget(null);
    setDragStart(null);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || isInteractiveDragOrigin(event.target)) return;

    const pointerId = event.pointerId;
    const startPoint = { x: event.clientX, y: event.clientY };
    const draggedJobs = getDraggedJobs();
    let hasStartedDrag = false;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;

      const point = { x: moveEvent.clientX, y: moveEvent.clientY };
      const deltaX = point.x - startPoint.x;
      const deltaY = point.y - startPoint.y;
      const movedEnough =
        Math.hypot(deltaX, deltaY) >= DRAG_START_THRESHOLD;

      if (!hasStartedDrag && movedEnough) {
        hasStartedDrag = true;
        startDrag(point, draggedJobs);
      }

      if (!hasStartedDrag) return;

      moveEvent.preventDefault();
      setDragPoint(point);
      setDragTarget(getDragTargetFromPoint(point.x, point.y));
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);

      if (!hasStartedDrag) return;

      upEvent.preventDefault();
      const targetColumn = getDragTargetFromPoint(
        upEvent.clientX,
        upEvent.clientY
      );
      void finishDrag(targetColumn, draggedJobs);
    };

    const handlePointerCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId !== pointerId) return;

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      cleanup();
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
  };

  return { onPointerDown };
}

function formatColumnName(column: string) {
  return column
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
