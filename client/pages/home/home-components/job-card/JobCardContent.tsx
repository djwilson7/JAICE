import { motion } from "framer-motion";
import type { JobCardType } from "@/types/jobCardType";
import { getCSSVar } from "@/utils/getCSSVar";
import { formatInboxMessage } from "@/pages/home/utils/formatInboxMessage";

interface JobCardContentProps {
  isOpen: boolean;
  job: JobCardType;
}

export function JobCardContent({ isOpen, job }: JobCardContentProps) {
  const inboxMessage = formatInboxMessage(job.description);

  return (
    <motion.div
      className="flex flex-col overflow-hidden items-center w-full"
      initial={{ height: 0, opacity: 0 }}
      animate={{
        height: isOpen ? "auto" : 0,
        opacity: isOpen ? 1 : 0,
      }}
      transition={{ duration: parseFloat(getCSSVar("--animation-duration")) }}
      exit={{ height: 0, opacity: 0 }}
    >
      <div className="w-full justify-center items-center whitespace-nowrap text-ellipsis overflow-hidden">
        <hr className="header-split" />
      </div>
      <div className="flex w-full flex-col gap-3 p-3 text-left">
        <p className="job-card-body-text whitespace-pre-wrap">
          {inboxMessage || "No email content available."}
        </p>

        {job.notes && (
          <small className="job-card-body-note whitespace-pre-wrap">
            {formatInboxMessage(job.notes)}
          </small>
        )}
      </div>
    </motion.div>
  );
}
