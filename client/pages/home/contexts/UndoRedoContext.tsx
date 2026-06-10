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

export const UndoRedoContext = createContext<UndoRedoContextType | null>(null);
