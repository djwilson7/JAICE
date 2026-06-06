import { useState, useMemo } from "react";
import { SelectedJobsContext } from "../contexts/SelectedJobsContext";
import type { JobCardType } from "@/types/jobCardType";

type SelectedJobsProviderProps = {
  children: React.ReactNode;
};

export function SelectedJobsProvider({ children }: SelectedJobsProviderProps) {
  const [selectedJobs, setSelectedJobs] = useState<JobCardType[]>([]);

  const toggleJobSelection = (job: JobCardType) => {
    setSelectedJobs((prev) =>
      prev.some((selectedJob) => selectedJob.id === job.id)
        ? prev.filter((selectedJob) => selectedJob.id !== job.id)
        : [...prev, job]
    );
  };

  const value = useMemo(
    () => ({ selectedJobs, setSelectedJobs, toggleJobSelection }),
    [selectedJobs]
  );

  return (
    <SelectedJobsContext.Provider value={value}>
      {children}
    </SelectedJobsContext.Provider>
  );
}
