import { useState } from "react";
import { JobCardContext } from "../contexts/JobCardContext";

export function JobCardProvider({ children }: { children: React.ReactNode }) {
  const [expandAll, setExpandAll] = useState(false);
  const [commandId, setCommandId] = useState(0);
  const [openCount, setOpenCount] = useState(0);

  const expandAllCards = () => {
    setExpandAll(true);
    setCommandId((id) => id + 1);
    setOpenCount(Infinity); // semantic: everything is open
  };

  const collapseAllCards = () => {
    setExpandAll(false);
    setCommandId((id) => id + 1);
    setOpenCount(0);
  };

  const registerOpen = () => {
    setOpenCount((c) => c + 1);
  };

  const registerClose = () => {
    setOpenCount((c) => Math.max(0, c - 1));
  };

  return (
    <JobCardContext.Provider
      value={{
        expandAll,
        commandId,
        openCount,
        registerOpen,
        registerClose,
        expandAllCards,
        collapseAllCards,
      }}
    >
      {children}
    </JobCardContext.Provider>
  );
}
