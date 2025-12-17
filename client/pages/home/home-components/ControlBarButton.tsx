import { motion } from "framer-motion";
import { useState } from "react";

interface ControlBarButtonProps {
  onClick: () => void;
  icon: string;
  iconHoverColor: string;
  label?: string;
  prominent?: boolean;
}

export function ControlBarButton({
  onClick,
  icon,
  iconHoverColor,
  label,
  prominent,
}: ControlBarButtonProps) {
  
  const [mouseEnter, setMouseEnter] = useState<boolean>(false);
  return (
    <motion.div
      className={"control-bar-container" + ` ${prominent ? "control-bar-container-red" : ""}`}
      onMouseEnter={() => setMouseEnter(true)}
      onMouseLeave={() => setMouseEnter(false)}
      onClick={onClick}
    >
      <motion.img
        src={icon}
        alt="Undo Trash Icon"
        className={`w-5 h-5 icon ${mouseEnter ? iconHoverColor : ""}`}
      />
      <p className="flex whitespace-nowrap">
        {label}
      </p>
    </motion.div>
  );
}
