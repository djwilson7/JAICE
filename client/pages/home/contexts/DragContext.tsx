import { createContext } from "react";
import type { DragTarget } from "@/types/dragTarget";

export interface DragContextType {
  isDragging: boolean;
  draggedId: string | null;
  dragTarget: DragTarget;
  dragStart: string | null;

  setIsDragging: (value: boolean) => void;
  setDraggedId: (id: string | null) => void;
  setDragTarget: (target: DragTarget) => void;
  setDragStart: (start: string | null) => void;
}

export const DragContext = createContext<DragContextType | null>(null);
