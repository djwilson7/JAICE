import { motion } from "framer-motion";

interface JobCardReviewHeaderProps {
  isVisible: boolean;
}

export function JobCardReviewHeader({ isVisible }: JobCardReviewHeaderProps) {
  if (!isVisible) return null;
  const message = isVisible ? "This job requires your review." : "";

  return (
    <motion.small
      initial={{
        opacity: 0,
        height: 0,
      }}
      animate={{
        opacity: isVisible ? 1 : 0,
        height: isVisible ? "auto" : 0,
      }}
      exit={{
        opacity: 0,
        height: 0,
      }}
      transition={{ duration: 0.15 }}
      role="tooltip"
      className="w-full z-50 review-header whitespace-nowrap text-ellipsis overflow-hidden"
    >
      {message}
    </motion.small>
  );
}
