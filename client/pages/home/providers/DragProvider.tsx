import { useState, type ReactNode } from "react";
import { DragContext } from "@/pages/home/contexts/DragContext";
import type { DragTarget } from "@/types/dragTarget";

interface DragProviderProps {
  children: ReactNode;
}

export function DragProvider({ children }: DragProviderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
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
        dragPoint,
        dragTarget,
        setIsDragging,
        setDraggedId,
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
