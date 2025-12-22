import { motion } from "framer-motion";

interface JobCardContainerProps {
  key: string;
  id: string;
  handleDragStart: () => void;
  handleDragEnd: () => void;
  dimmed: boolean;
  isMultiSelecting: boolean;
  setIsHovered: (hovered: boolean) => void;
  variants: any;
  reviewClass: string;
  cardClass: string;
  children: React.ReactNode;
}

export function JobCardContainer({
  key,
  id,
  handleDragStart,
  handleDragEnd,
  dimmed,
  isMultiSelecting,
  setIsHovered,
  variants,
  reviewClass,
  cardClass,
  children,
}: JobCardContainerProps) {
  return (
    <motion.div
      key={key}
      id={id}
      className={`w-full flex items-center flex flex-col job-card ${reviewClass} ${cardClass}`}
      drag
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      variants={variants}
      animate={dimmed ? "dimmed" : "active"}
      whileHover={
        !isMultiSelecting ? { scale: 1.02, cursor: "pointer" } : undefined
      }
      onHoverStart={!isMultiSelecting ? () => setIsHovered(true) : undefined}
      onHoverEnd={!isMultiSelecting ? () => setIsHovered(false) : undefined}
      // onTap cycles between expanding the card and selecting it based on isMultiSelecting
      whileTap={{ cursor: "grabbing" }}
      whileDrag={{
        cursor: "grabbing",
        scale: 1.05,
        pointerEvents: "none",
        zIndex: 1000,
      }}
      dragSnapToOrigin
      layout
    >
      {children}
    </motion.div>
  );
}
