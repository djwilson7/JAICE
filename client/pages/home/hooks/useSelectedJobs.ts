import { useContext } from "react";
import { SelectedJobsContext } from "../contexts/SelectedJobsContext";

export function useSelectedJobs() {
  const context = useContext(SelectedJobsContext);
  
  if (!context) {
    throw new Error(
      "useSelectedJobs must be used within a SelectedJobsProvider"
    );
  }
  return context;
}
