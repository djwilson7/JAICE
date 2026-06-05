import { motion } from "framer-motion";
import { useState } from "react";

interface ControlBarButtonProps {
  onClick: () => void;
  icon: string;
  iconHoverColor: string;
  label?: string;
  prominent?: boolean;
  alt: string;
  compact?: boolean;
}

export function ControlBarButton({
  onClick,
  icon,
  iconHoverColor,
  label,
  prominent,
  alt,
  compact = false,
}: ControlBarButtonProps) {
  
  const [mouseEnter, setMouseEnter] = useState<boolean>(false);
  const buttonClass = prominent ? "control-bar-container control-bar-container-red" : "control-bar-container";
  const iconClass = mouseEnter ? iconHoverColor : "icon";

  return (
    <motion.div
      className={`no-select ${buttonClass} ${compact ? "control-bar-container-compact" : ""}`}
      onMouseEnter={() => setMouseEnter(true)}
      onMouseLeave={() => setMouseEnter(false)}
      onClick={onClick}
      title={label || alt}
      role="button"
      aria-label={label || alt}
    >
      <motion.img
        src={icon}
        alt={alt}
        className={`w-5 h-5 ${iconClass}`}
      />
      {!compact && (
        <p className="control-bar-label whitespace-nowrap no-select">
          {label}
        </p>
      )}
    </motion.div>
  );
}
