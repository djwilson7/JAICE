import { motion } from "framer-motion";
import { useDrag } from "@/pages/home/hooks/useDrag";

interface JobCardButtonRowProps {
  isHovered: boolean;
  children: React.ReactNode;
}

export function JobCardButtonRow({
  isHovered,
  children,
}: JobCardButtonRowProps) {
  const { isDragging } = useDrag();

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{
        height: !isDragging && isHovered ? "auto" : 0,
        opacity: !isDragging && isHovered ? 1 : 0,
      }}
      exit={{ opacity: 0, height: 0 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 24,
        duration: 0.15,
      }}
      role="tooltip"
      aria-hidden={!isHovered}
      className="job-card-button-row"
    > 
      <motion.hr className="header-split" />
      <motion.div
        className="flex flex-row gap-2 py-2 w-[80%]"
        initial={{ opacity: 0, height: "auto" }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
