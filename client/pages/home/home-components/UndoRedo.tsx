import { useUndoRedo } from "@/pages/home/hooks/useUndoRedo";
import { useIsMultiSelecting } from "@/pages/home/hooks/useIsMultiSelecting";
import undoIcon from "@/assets/icons/undo-alt.svg";
import redoIcon from "@/assets/icons/redo-alt.svg";
import Button from "@/global-components/button";

export function UndoRedo() {
  const { hasUndo, hasRedo, performUndo, performRedo } = useUndoRedo();
  const { isMultiSelecting } = useIsMultiSelecting();
  const showUndoRedo = hasUndo || hasRedo;

  if (!showUndoRedo || isMultiSelecting) {
    return null;
  }

  return (
    <div className="glass" role="status" aria-live="polite">
      <span
        title={hasUndo ? "Undo (Ctrl+Z)" : "No actions to undo"}
        className="rounded"
      >
        <Button
          type="button"
          onClick={performUndo}
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
          onClick={performRedo}
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
