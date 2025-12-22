import { motion } from "framer-motion";
import type { JobCardType } from "../../../types/jobCardType";

interface JobCardContentProps {
  isOpen: boolean;
  job: JobCardType;
}

export function JobCardContent({ isOpen, job }: JobCardContentProps) {
  return (
    <motion.div
      className="overflow-hidden w-full px-4"
      animate={{
        height: isOpen ? "auto" : 0,
        opacity: isOpen ? 1 : 0,
      }}
      initial={false}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 24,
        duration: 0.15,
      }}
    >
      <hr className="header-split" />
      <div className="flex flex-col text-left w-full gap-2 py-4">
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
