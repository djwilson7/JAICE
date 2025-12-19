// UndoRedoProvider.tsx
import { useState, useRef, useCallback } from "react";
import {
  UndoRedoContext,
  type UndoRedoContextType,
} from "@/pages/home/contexts/UndoRedoContext";
import type { UndoAction } from "@/types/undoAction";

type UndoRedoProviderProps = {
  children: React.ReactNode;
};

export function UndoRedoProvider({ children }: UndoRedoProviderProps) {
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);

  const undoRef = useRef<UndoAction[]>([]);
  const redoRef = useRef<UndoAction[]>([]);

  const isUndoRedoAvailable = undoStack.length > 0 || redoStack.length > 0;
  
  const hasUndo = undoRef.current.length > 0;
  const hasRedo = redoRef.current.length > 0;

  const pushUndo = useCallback((action: UndoAction) => {
    console.log("Pushing undo action:", action);
    setUndoStack((prev) => {
      const next = [...prev, action];
      undoRef.current = next;
      console.log("Updated undo stack:", next.length);
      return next;
    });

    setRedoStack([]);
    redoRef.current = [];
  }, []);

  const popUndo = useCallback((): UndoAction | undefined => {
    const prevStack = undoRef.current;
    if (!prevStack.length) return undefined;

    const action = prevStack[prevStack.length - 1];
    const nextStack = prevStack.slice(0, prevStack.length - 1);

    undoRef.current = nextStack;
    setUndoStack(nextStack);

    return action;
  }, []);

  const popRedo = useCallback((): UndoAction | undefined => {
    const prevStack = redoRef.current;
    if (!prevStack.length) return undefined;

    const action = prevStack[prevStack.length - 1];
    const nextStack = prevStack.slice(0, prevStack.length - 1);

    redoRef.current = nextStack;
    setRedoStack(nextStack);

    return action;
  }, []);

  const performUndo = useCallback(() => {
    const action = popUndo();
    if (!action) return;

    setRedoStack((prev) => {
      console.log("Pushing redo action:", action);
      const next = [...prev, action];
      redoRef.current = next;
      return next;
    });

  }, [popUndo]);

  const performRedo = useCallback(() => {
    const action = popRedo();
    if (!action) return;

    setUndoStack((prev) => {
      const next = [...prev, action];
      undoRef.current = next;
      return next;
    });

  }, [popRedo]);

  const value: UndoRedoContextType = {
    undoStack,
    redoStack,
    pushUndo,
    performUndo,
    performRedo,
    isUndoRedoAvailable,
    hasUndo,
    hasRedo
  };

  return (
    <UndoRedoContext.Provider value={value}>
      {children}
    </UndoRedoContext.Provider>
  );
}
