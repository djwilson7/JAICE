import { useState } from "react";

export function useIsMultiSelecting() {
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);
  return { isMultiSelecting, setIsMultiSelecting };
}
