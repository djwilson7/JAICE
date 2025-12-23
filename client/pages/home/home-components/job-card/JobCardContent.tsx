import { motion } from "framer-motion";
import type { JobCardType } from "@/types/jobCardType";

interface JobCardContentProps {
  isOpen: boolean;
  job: JobCardType;
}

export function JobCardContent({ isOpen, job }: JobCardContentProps) {
  return (
    <motion.div
      className="flex flex-col overflow-hidden items-center justify-center w-full"
      initial={{ height: 0, opacity: 0 }}
      animate={{
        height: isOpen ? "auto" : 0,
        opacity: isOpen ? 1 : 0,
      }}
      exit={{ height: 0, opacity: 0 }}
    >
      <div className="justify-center items-center w-[80%]">
        <hr className="header-split" />
      </div>
      <div className="flex flex-col text-left w-[80%] gap-2 py-4">
        <small className="secondary-text font-semibold">
          {job.companyName ?? "Unknown Company"}
        </small>

        <small className="secondary-text font-semibold">
          {"Salary: " + (job.salary ?? "Unknown Salary")}
        </small>

        <p className="primary-text">
          {job.description ?? "No description provided for this job."}
        </p>

        <small className="secondary-text">
          {job.notes ?? "No additional notes."}
        </small>
      </div>
    </motion.div>
  );
}
