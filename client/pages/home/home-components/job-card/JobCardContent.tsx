import { motion } from "framer-motion";
import type { JobCardType } from "@/types/jobCardType";
import { getCSSVar } from "@/utils/getCSSVar";

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
      transition={{ duration: parseFloat(getCSSVar("--animation-duration")) }}
      exit={{ height: 0, opacity: 0 }}
    >
      <div className="justify-center items-center w-[80%] whitespace-nowrap text-ellipsis overflow-hidden">
        <hr className="header-split" />
      </div>
      <div className="flex flex-col text-left w-[80%] gap-2 py-4">
        <small className="secondary-text font-semibold whitespace-nowrap text-ellipsis overflow-hidden">
          {job.companyName ?? "Unknown Company"}
        </small>

        <small className="secondary-text font-semibold whitespace-nowrap text-ellipsis overflow-hidden">
          {"Salary: " + (job.salary ?? "Unknown Salary")}
        </small>

        <p className="primary-text whitespace-pre-wrap">
          {job.description ?? "No description provided for this job."}
        </p>

        <small className="secondary-text whitespace-pre-wrap">
          {job.notes ?? "No additional notes."}
        </small>
      </div>
    </motion.div>
  );
}
