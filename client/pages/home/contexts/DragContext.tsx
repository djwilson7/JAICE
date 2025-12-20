import { createContext } from "react";
import type { DragTarget } from "@/types/dragTarget";

export interface DragContextType {
  isDragging: boolean;
  draggedId: string | null;
  dragTarget: DragTarget;

  setIsDragging: (value: boolean) => void;
  setDraggedId: (id: string | null) => void;
  setDragTarget: (target: DragTarget) => void;
}

export const DragContext = createContext<DragContextType | null>(null);
