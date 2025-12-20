import { createContext } from "react";
import type { JobCardType } from "@/types/jobCardType";

type SelectedJobsContextType = {
  selectedJobs: JobCardType[];
  setSelectedJobs: (value: JobCardType[]) => void;
  toggleJobSelection: (job: JobCardType) => void;
};

export const SelectedJobsContext = createContext<SelectedJobsContextType>({
  selectedJobs: [],
  setSelectedJobs: () => {},
  toggleJobSelection: () => {},
});
