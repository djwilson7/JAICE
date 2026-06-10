import { createContext } from "react";

type MultiSelectContextType = {
  isMultiSelecting: boolean;
  setIsMultiSelecting: (value: boolean) => void;
};

export const MultiSelectContext = createContext<MultiSelectContextType | null>(null);
