import { useState, type ReactNode } from "react";
import { DragContext } from "@/pages/home/contexts/DragContext";
import type { DragTarget } from "@/types/dragTarget";

interface DragProviderProps {
  children: ReactNode;
}

export function DragProvider({ children }: DragProviderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);

  return (
    <DragContext.Provider
      value={{
        isDragging,
        draggedId,
        dragTarget,
        setIsDragging,
        setDraggedId,
        setDragTarget,
      }}
    >
      {children}
    </DragContext.Provider>
  );
}
