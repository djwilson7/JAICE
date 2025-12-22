import { motion } from "framer-motion";
import { useState } from "react";

interface JobCardButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  icon: string;
  iconHoverColor: string;
  isVisible?: boolean;
}

export function JobCardButton({
  onClick,
  icon,
  iconHoverColor,
  isVisible = true,
}: JobCardButtonProps) {
  if (!isVisible) return null;
  const [isHovered, setIsHovered] = useState(false);
  return (
    <motion.button
      onClick={onClick}
      type="button"
      className="small w-full"
      style={{ background: "transparent" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Edit Job"
      title="Edit job details and notes"
    >
      <motion.img
        src={icon}
        alt="Edit Icon"
        className={`inline w-4 h-4 icon ${isHovered ? iconHoverColor : ""}`}
      />
    </motion.button>
  );
}
