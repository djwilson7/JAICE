import { useContext } from "react";
import {
  UndoRedoContext,
  type UndoRedoContextType,
} from "@/pages/home/contexts/UndoRedoContext";

export function useUndoRedo(): UndoRedoContextType {
  const context = useContext(UndoRedoContext);

  if (!context) {
    throw new Error("useUndoRedo must be used within an UndoRedoProvider");
  }

  return context;
}
