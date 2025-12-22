import { useState } from "react";
import { JobCardContext } from "../contexts/JobCardContext";

export function JobCardProvider({ children }: { children: React.ReactNode }) {
  const [expandAll, setExpandAll] = useState(false);
  const [commandId, setCommandId] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);


  const expandAllCards = () => {
    setExpandAll(true);
    setIsExpanded(true);
    setCommandId((id) => id + 1);
  };

  const collapseAllCards = () => {
    setExpandAll(false);
    setIsExpanded(false);
    setCommandId((id) => id + 1);
  };

  return (
    <JobCardContext.Provider
      value={{ expandAll, commandId, expandAllCards, collapseAllCards, isExpanded }}
    >
      {children}
    </JobCardContext.Provider>
  );
}
