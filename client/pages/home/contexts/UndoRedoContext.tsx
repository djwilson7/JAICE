// UndoRedoContext.ts
import { createContext } from "react";
import type { UndoAction } from "@/types/undoAction";

export interface UndoRedoContextType {
  undoStack: UndoAction[];
  redoStack: UndoAction[];
  pushUndo: (action: UndoAction) => void;
  performUndo: () => void;
  performRedo: () => void;
  isUndoRedoAvailable: boolean;
  hasUndo: boolean;
  hasRedo: boolean;
}

export const UndoRedoContext = createContext<UndoRedoContextType>({
  undoStack: [],
  redoStack: [],
  pushUndo: () => {
    console.warn("pushUndo called outside UndoRedoProvider");
  },
  performUndo: () => {
    console.warn("performUndo called outside UndoRedoProvider");
  },
  performRedo: () => {
    console.warn("performRedo called outside UndoRedoProvider");
  },
  isUndoRedoAvailable: false,
  hasUndo: false,
  hasRedo: false,
});
