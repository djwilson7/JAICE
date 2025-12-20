import { useContext } from "react";
import { DragContext } from "@/pages/home/contexts/DragContext";

export function useDrag() {
  const context = useContext(DragContext);

  if (!context) {
    throw new Error("useDrag must be used within a DragProvider");
  }

  return context;
}
