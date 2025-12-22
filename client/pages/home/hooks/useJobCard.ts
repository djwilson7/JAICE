import { useContext } from "react";
import { JobCardContext } from "../contexts/JobCardContext";

export function useJobCard() {
  const ctx = useContext(JobCardContext);
  if (!ctx) throw new Error("useJobCard must be used inside JobCardProvider");
  return ctx;
}
