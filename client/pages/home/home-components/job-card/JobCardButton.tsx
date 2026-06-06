import { motion } from "framer-motion";
import { useState } from "react";

interface JobCardButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  icon: string;
  iconHoverColor: string;
  isVisible?: boolean;
  label?: string;
  title?: string;
}

export function JobCardButton({
  onClick,
  icon,
  iconHoverColor,
  isVisible = true,
  label = "Button",
  title = "Click to perform action",
}: JobCardButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (!isVisible) return null;

  return (
    <motion.button
      onClick={onClick}
      type="button"
      className="job-card-action-button"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={label}
      title={title}
    >
      <motion.img
        src={icon}
        alt="Edit Icon"
        className={`job-card-action-icon icon ${isHovered ? iconHoverColor : ""}`}
      />
    </motion.button>
  );
}
