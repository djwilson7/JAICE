import { useUndoRedo } from "@/pages/home/hooks/useUndoRedo";
import { useIsMultiSelecting } from "@/pages/home/hooks/useIsMultiSelecting";
import undoIcon from "@/assets/icons/undo-alt.svg";
import redoIcon from "@/assets/icons/redo-alt.svg";
import Button from "@/global-components/button";
import type { JobCardType } from "@/types/jobCardType";
import { api } from "@/global-services/api";
import { useDrag } from "@/pages/home/hooks/useDrag";
import { useEffect, useRef, useState } from "react";

export function UndoRedo() {
  const { isDragging } = useDrag();
  const { isMultiSelecting } = useIsMultiSelecting();
  const { undoCount, redoCount, undo, redo, clear } = useUndoRedo();

  const UNDO_VISIBLE_MS = 10000;
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (undoCount === 0 && redoCount === 0) {
      setVisible(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    setVisible(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = window.setTimeout(() => {
      setVisible(false);
      clear();
      timeoutRef.current = null;
    }, UNDO_VISIBLE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [undoCount, redoCount, clear]);

  const pauseTimer = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const resumeTimer = () => {
    timeoutRef.current = window.setTimeout(() => {
      setVisible(false);
      clear();
    }, UNDO_VISIBLE_MS);
  };

  const restartTimer = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setVisible(false);
      clear();
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
      app_stage: j.applicationStage ?? "Applied",
      salary: j.salary ? parseFloat(j.salary) : 0,
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

  const handleUndo = async () => {
    console.log("Undo action triggered");
    const snapshot = undo();
    if (!snapshot) return;
    try {
      await handleSnapshot(snapshot.before);
    } catch (err) {
      console.error("Undo failed", err);
    }
    restartTimer();
  };

  const handleRedo = async () => {
    console.log("Redo action triggered");
    const snapshot = redo();
    if (!snapshot) return;
    try {
      await handleSnapshot(snapshot.after);
    } catch (err) {
      console.error("Redo failed", err);
    }
    restartTimer();
  };

  return (
    <div
      className="glass"
      role="status"
      aria-live="polite"
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
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
