// UndoRedoContext.ts
import { createContext } from "react";
import type { SnapShotAction } from "@/types/undoAction";

export interface UndoRedoContextType {
  pushUndo: (action: SnapShotAction) => void;
  undo: () => SnapShotAction | undefined;
  redo: () => SnapShotAction | undefined;
  hasUndo: boolean;
  hasRedo: boolean;
  clear: () => void;
  undoCount: number;
  redoCount: number;
}

export const UndoRedoContext = createContext<UndoRedoContextType>({
  pushUndo: () => {
    console.warn("pushUndo called outside UndoRedoProvider");
  },

  undo: () => {
    console.warn("undo called outside UndoRedoProvider");
    return undefined;
  },
  redo: () => {
    console.warn("redo called outside UndoRedoProvider");
    return undefined;
  },
  hasUndo: false,
  hasRedo: false,
  clear: () => {
    console.warn("clear called outside UndoRedoProvider");
  },
  undoCount: 0,
  redoCount: 0,
});
