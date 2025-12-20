import { useState, useMemo } from "react";
import { MultiSelectContext } from "../contexts/MultiSelectContext";

type MultiSelectProviderProps = {
  children: React.ReactNode;
};

export function MultiSelectProvider({ children }: MultiSelectProviderProps) {
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);
  const value = useMemo(
    () => ({ isMultiSelecting, setIsMultiSelecting }),
    [isMultiSelecting]
  );

  return (
    <MultiSelectContext.Provider value={value}>
      {children}
    </MultiSelectContext.Provider>
  );
}
