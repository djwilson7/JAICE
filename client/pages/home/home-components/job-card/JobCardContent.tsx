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
      <div className="justify-center items-center w-[80%] whitespace-nowrap text-ellipsis overflow-hidden">
        <hr className="header-split" />
      </div>
      <div className="flex flex-col text-left w-[80%] gap-3 py-4">
        <p className="primary-text whitespace-pre-wrap leading-relaxed">
          {inboxMessage || "No email content available."}
        </p>

        {job.notes && (
          <small className="secondary-text whitespace-pre-wrap">
            {formatInboxMessage(job.notes)}
          </small>
        )}
      </div>
    </motion.div>
  );
}
