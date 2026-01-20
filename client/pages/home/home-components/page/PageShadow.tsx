import { useDrag } from "@/pages/home/hooks/useDrag";
import { useIsMultiSelecting } from "../../hooks/useIsMultiSelecting";
import { motion } from "framer-motion";

export function PageShadow() {
  const { isDragging } = useDrag();
  const { isMultiSelecting } = useIsMultiSelecting();
  
  if (isDragging) {
    return null;
  }

  const shadowVariants = {
    rest: {boxShadow: "var(--page-shadow)"},
    multiSelect: {boxShadow: "var(--page-shadow-multi-select)"},
  }

  return (
    <motion.div
      className="relative bottom-0 w-full bg-transparent z-1"
      variants={shadowVariants}
      initial={isMultiSelecting ? "multiSelect" : "rest"}
      animate={isMultiSelecting ? "multiSelect" : "rest"}
    />
  );
}
