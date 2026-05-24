import { useUndoRedo } from "@/pages/home/hooks/useUndoRedo";
import { useIsMultiSelecting } from "@/pages/home/hooks/useIsMultiSelecting";
import undoIcon from "@/assets/icons/undo-alt.svg";
import redoIcon from "@/assets/icons/redo-alt.svg";
import Button from "@/global-components/button";
import type { JobCardType } from "@/types/jobCardType";
import { api } from "@/global-services/api";
import { useDrag } from "@/pages/home/hooks/useDrag";
import { useEffect, useRef, useState } from "react";
import { dispatchJobLocalChange } from "@/pages/home/utils/jobLocalChangeEvent";

export function UndoRedo() {
  const { isDragging } = useDrag();
  const { isMultiSelecting } = useIsMultiSelecting();
  const { undoCount, redoCount, undo, redo } = useUndoRedo();

  const UNDO_VISIBLE_MS = 10000;
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (undoCount === 0 && redoCount === 0) {
      setVisible(false);
      return;
    }

    setVisible(true);
    timeoutRef.current = window.setTimeout(() => {
      setVisible(false);
      timeoutRef.current = null;
    }, UNDO_VISIBLE_MS);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [undoCount, redoCount]);

  const restartVisibilityTimer = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    setVisible(true);
    timeoutRef.current = window.setTimeout(() => {
      setVisible(false);
      timeoutRef.current = null;
    }, UNDO_VISIBLE_MS);
  };

  const showUndoRedo = visible && (undoCount > 0 || redoCount > 0);

  if (isDragging || isMultiSelecting || !showUndoRedo) {
    return null;
  }

  const handleSnapshot = async (snapshot: JobCardType[]) => {
    console.log("Applying snapshot with", snapshot.length, "jobs");

    const mappedJobs = snapshot.map((j) => ({
      title: j.title ?? "Title",
      company_name: j.companyName ?? "Company",
      app_stage: j.column ?? j.applicationStage ?? "Applied",
      salary: j.salary ?? 0,
      received_at: j.receivedAtRaw ?? new Date().toISOString(),
      note: j.notes ?? "",
      is_deleted: j.isDeleted ?? false,
      is_archived: j.isArchived ?? false,
      needs_review: j.reviewNeeded ?? false,
      provider_message_id: j.id,
    }));

    const res = await api("/api/jobs/snapshot-update", {
      method: "POST",
      body: JSON.stringify({ jobs: mappedJobs }),
    });

    if (!(res && res.status === "success")) {
      console.error("Snapshot update failed", res);
    }
  };

  const applySnapshotLocally = (from: JobCardType[], to: JobCardType[]) => {
    const fromById = new Map(from.map((job) => [String(job.id), job]));

    for (const nextJob of to) {
      const previousJob = fromById.get(String(nextJob.id)) ?? nextJob;
      dispatchJobLocalChange({ before: previousJob, after: nextJob });
    }
  };

  const handleUndo = async () => {
    console.log("Undo action triggered");
    const snapshot = undo();
    if (!snapshot) return;
    try {
      applySnapshotLocally(snapshot.after, snapshot.before);
      await handleSnapshot(snapshot.before);
    } catch (err) {
      applySnapshotLocally(snapshot.before, snapshot.after);
      console.error("Undo failed", err);
    }
    restartVisibilityTimer();
  };

  const handleRedo = async () => {
    console.log("Redo action triggered");
    const snapshot = redo();
    if (!snapshot) return;
    try {
      applySnapshotLocally(snapshot.before, snapshot.after);
      await handleSnapshot(snapshot.after);
    } catch (err) {
      applySnapshotLocally(snapshot.after, snapshot.before);
      console.error("Redo failed", err);
    }
    restartVisibilityTimer();
  };

  return (
    <div
      className="glass"
      role="status"
      aria-live="polite"
    >
      <span
        title={undoCount > 0 ? "Undo (Ctrl+Z)" : "No actions to undo"}
        className="rounded"
      >
        <Button
          type="button"
          onClick={handleUndo}
          aria-label="Undo last action"
          disabled={undoCount === 0}
          className="undoRedo"
        >
          <img src={undoIcon} alt="Undo" className="w-5 h-5 icon" />
        </Button>
      </span>

      <span
        title={redoCount > 0 ? "Redo (Ctrl+Y)" : "No actions to redo"}
        className="rounded"
      >
        <Button
          type="button"
          onClick={handleRedo}
          aria-label="Redo last action"
          disabled={redoCount === 0}
          className="undoRedo"
        >
          <img src={redoIcon} alt="Redo" className="w-5 h-5 icon" />
        </Button>
      </span>
    </div>
  );
}
