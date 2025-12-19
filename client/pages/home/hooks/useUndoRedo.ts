import { useContext, useCallback } from "react";
import {
  UndoRedoContext,
  type UndoRedoContextType,
} from "@/pages/home/contexts/UndoRedoContext";

export function useUndoRedo(): UndoRedoContextType {
  const context = useContext(UndoRedoContext);

  if (!context) {
    throw new Error("useUndoRedo must be used within an UndoRedoProvider");
  }

  const {
    undoStack,
    redoStack,
    pushUndo,
    performUndo,
    performRedo,
    isUndoRedoAvailable,
    hasUndo,
    hasRedo,
  } = context;

  const undo = useCallback(() => performUndo(), [performUndo]);
  const redo = useCallback(() => performRedo(), [performRedo]);

  return {
    undoStack,
    redoStack,
    pushUndo,
    performUndo: undo,
    performRedo: redo,
    isUndoRedoAvailable,
    hasRedo,
    hasUndo,
  };
}
