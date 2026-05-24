import { motion } from "framer-motion";
import { useState } from "react";

interface ControlBarButtonProps {
  onClick: () => void;
  icon: string;
  iconHoverColor: string;
  label?: string;
  prominent?: boolean;
  alt: string;
}

export function ControlBarButton({
  onClick,
  icon,
  iconHoverColor,
  label,
  prominent,
  alt,
}: ControlBarButtonProps) {
  
  const [mouseEnter, setMouseEnter] = useState<boolean>(false);
  const buttonClass = prominent ? "control-bar-container control-bar-container-red" : "control-bar-container";
  const iconClass = mouseEnter ? iconHoverColor : "icon";

  return (
    <motion.div
      className={`no-select ${buttonClass}`}
      onMouseEnter={() => setMouseEnter(true)}
      onMouseLeave={() => setMouseEnter(false)}
      onClick={onClick}
    >
      <motion.img
        src={icon}
        alt={alt}
        className={`w-5 h-5 ${iconClass}`}
      />
      <p className="control-bar-label whitespace-nowrap no-select">
        {label}
      </p>
    </motion.div>
  );
}
