import { createContext } from "react";

type JobCardContext = {
  expandAll: boolean;
  commandId: number;
  expandAllCards: () => void;
  collapseAllCards: () => void;
};

export const JobCardContext = createContext<JobCardContext | null>(null);
