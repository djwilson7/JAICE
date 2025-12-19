import { useUndoRedo } from "@/pages/home/hooks/useUndoRedo";
import { useIsMultiSelecting } from "@/pages/home/hooks/useIsMultiSelecting";
import undoIcon from "@/assets/icons/undo-alt.svg";
import redoIcon from "@/assets/icons/redo-alt.svg";
import Button from "@/global-components/button";
import type { JobCardType } from "@/types/jobCardType";

export function UndoRedo() {
  const { hasUndo, hasRedo, undo, redo } = useUndoRedo();
  const { isMultiSelecting } = useIsMultiSelecting();
  const showUndoRedo = hasUndo || hasRedo;

  if (!showUndoRedo || isMultiSelecting) {
    return null;
  }

  const handleSnapshot = async (snapshot: JobCardType[]) => {
    await fetch("/api/jobs/snapshot-update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobs: snapshot }),
    });
  };

  const handleUndo = async () => {
    const snapshot = undo();
    if (!snapshot) return;
    try {
      await handleSnapshot(snapshot.before);
    } catch (err) {
      console.error("Undo failed", err);
    }
  };

  const handleRedo = async () => {
    const snapshot = redo();
    if (!snapshot) return;
    try {
      await handleSnapshot(snapshot.after);
    } catch (err) {
      console.error("Redo failed", err);
    }
  };

  return (
    <div className="glass" role="status" aria-live="polite">
      <span
        title={hasUndo ? "Undo (Ctrl+Z)" : "No actions to undo"}
        className="rounded"
      >
        <Button
          type="button"
          onClick={handleUndo}
          aria-label="Undo last action"
          disabled={!hasUndo}
          className="undoRedo"
        >
          <img src={undoIcon} alt="Undo" className="w-5 h-5 icon" />
        </Button>
      </span>

      <span
        title={hasRedo ? "Redo (Ctrl+Y)" : "No actions to redo"}
        className="rounded"
      >
        <Button
          type="button"
          onClick={handleRedo}
          aria-label="Redo last action"
          disabled={!hasRedo}
          className="undoRedo"
        >
          <img src={redoIcon} alt="Redo" className="w-5 h-5 icon" />
        </Button>
      </span>
    </div>
  );
}
