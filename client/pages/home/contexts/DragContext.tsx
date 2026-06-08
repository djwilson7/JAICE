import { createContext } from "react";
import type { DragTarget } from "@/types/dragTarget";
import type { JobCardType } from "@/types/jobCardType";

export interface DragContextType {
  isDragging: boolean;
  draggedId: string | null;
  draggedJobs: JobCardType[];
  dragPoint: { x: number; y: number } | null;
  dragTarget: DragTarget;
  dragStart: string | null;

  setIsDragging: (value: boolean) => void;
  setDraggedId: (id: string | null) => void;
  setDraggedJobs: (jobs: JobCardType[]) => void;
  setDragPoint: (point: { x: number; y: number } | null) => void;
  setDragTarget: (target: DragTarget) => void;
  setDragStart: (start: string | null) => void;
}

export const DragContext = createContext<DragContextType | null>(null);
