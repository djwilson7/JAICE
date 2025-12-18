import { useContext } from "react";
import { MultiSelectContext } from "../contexts/MultiSelectContext";

export function useIsMultiSelecting() {
  const context = useContext(MultiSelectContext);
  if (!context) {
    throw new Error(
      "useIsMultiSelecting must be used within a MultiSelectProvider"
    );
  }
  return context;
}
