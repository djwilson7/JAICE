import { createContext } from "react";

type JobCardContext = {
  expandAll: boolean;
  commandId: number;
  openCount: number;
  registerOpen: () => void;
  registerClose: () => void;
  expandAllCards: () => void;
  collapseAllCards: () => void;
};

export const JobCardContext = createContext<JobCardContext | null>(null);
