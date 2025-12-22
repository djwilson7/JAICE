import { useState } from "react";
import { JobCardContext } from "../contexts/JobCardContext";

export function JobCardProvider({ children }: { children: React.ReactNode }) {
  const [expandAll, setExpandAll] = useState(false);
  const [commandId, setCommandId] = useState(0);

  const expandAllCards = () => {
    setExpandAll(true);
    setCommandId((id) => id + 1);
  };

  const collapseAllCards = () => {
    setExpandAll(false);
    setCommandId((id) => id + 1);
  };

  return (
    <JobCardContext.Provider
      value={{ expandAll, commandId, expandAllCards, collapseAllCards }}
    >
      {children}
    </JobCardContext.Provider>
  );
}
