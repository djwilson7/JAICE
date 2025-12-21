// UndoRedoProvider.tsx
import { useState, useRef, useCallback } from "react";
import {
  UndoRedoContext,
  type UndoRedoContextType,
} from "@/pages/home/contexts/UndoRedoContext";
import type { SnapShotAction } from "@/types/undoAction";

type UndoRedoProviderProps = {
  children: React.ReactNode;
};

export function UndoRedoProvider({ children }: UndoRedoProviderProps) {
  const [undoStack, setUndoStack] = useState<SnapShotAction[]>([]);
  const [redoStack, setRedoStack] = useState<SnapShotAction[]>([]);

  const undoRef = useRef<SnapShotAction[]>([]);
  const redoRef = useRef<SnapShotAction[]>([]);

  const pushUndo = useCallback((action: SnapShotAction) => {
    setUndoStack((prev) => {
      const next = [...prev, action];
      undoRef.current = next;
      return next;
    });

    // Clear redo on new action
    setRedoStack([]);
    redoRef.current = [];
  }, []);

  const undo = useCallback((): SnapShotAction | undefined => {
    const stack = undoRef.current;
    if (!stack.length) return;

    const action = stack[stack.length - 1];
    const next = stack.slice(0, -1);

    undoRef.current = next;
    setUndoStack(next);

    setRedoStack((prev) => {
      const redoNext = [...prev, action];
      redoRef.current = redoNext;
      return redoNext;
    });

    return action;
  }, []);

  const redo = useCallback((): SnapShotAction | undefined => {
    const stack = redoRef.current;
    if (!stack.length) return;

    const action = stack[stack.length - 1];
    const next = stack.slice(0, -1);

    redoRef.current = next;
    setRedoStack(next);

    setUndoStack((prev) => {
      const undoNext = [...prev, action];
      undoRef.current = undoNext;
      return undoNext;
    });

    return action;
  }, []);

  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
    undoRef.current = [];
    redoRef.current = [];
  }, []);

  const value: UndoRedoContextType = {
    pushUndo,
    undo,
    redo,
    get hasUndo() {
      return undoStack.length > 0;
    },
    get hasRedo() {
      return redoStack.length > 0;
    },
    clear,
    get undoCount() {
      return undoStack.length;
    },
    get redoCount() {
      return redoStack.length;
    },
  };

  return (
    <UndoRedoContext.Provider value={value}>
      {children}
    </UndoRedoContext.Provider>
  );
}
