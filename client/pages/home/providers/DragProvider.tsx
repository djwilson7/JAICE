import { useState, type ReactNode } from "react";
import { DragContext } from "@/pages/home/contexts/DragContext";
import type { DragTarget } from "@/types/dragTarget";
import type { JobCardType } from "@/types/jobCardType";

interface DragProviderProps {
  children: ReactNode;
}

export function DragProvider({ children }: DragProviderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [draggedJobs, setDraggedJobs] = useState<JobCardType[]>([]);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [dragStart, setDragStart] = useState<string | null>(null);
  return (
    <DragContext.Provider
      value={{
        isDragging,
        draggedId,
        draggedJobs,
        dragPoint,
        dragTarget,
        setIsDragging,
        setDraggedId,
        setDraggedJobs,
        setDragPoint,
        setDragTarget,
        dragStart,
        setDragStart,
      }}
    >
      {children}
    </DragContext.Provider>
  );
}
