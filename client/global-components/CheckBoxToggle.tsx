import { getCSSVar } from "@/utils/getCSSVar";
import { motion } from "framer-motion";
import { useIsMultiSelecting } from "@/pages/home/hooks/useIsMultiSelecting";
import { useSelectedJobs } from "@/pages/home/hooks/useSelectedJobs";
import { useState } from "react";

interface CheckBoxToggleProps {
  label?: string;
  inactiveIcon?: string;
  activeIcon?: string;
  hoverIconColor: string;
  compact?: boolean;
}

export function CheckBoxToggle({
  label,
  inactiveIcon,
  activeIcon,
  hoverIconColor,
  compact = false,
}: CheckBoxToggleProps) {
  const { isMultiSelecting, setIsMultiSelecting } = useIsMultiSelecting();
  const { setSelectedJobs } = useSelectedJobs();
  const [isHovered, setIsHovered] = useState(false);

  const handleToggle = () => {
    setIsMultiSelecting(!isMultiSelecting);
    if (isMultiSelecting) {
      setSelectedJobs([]); // Clear selected jobs when turning off multi-select
    }
  };
  const iconClass = isHovered || isMultiSelecting ? hoverIconColor : "icon";

  return (
    <motion.div
      className={`control-bar-container ${
        isMultiSelecting ? "control-bar-container-selected-green" : ""
      } ${compact ? "control-bar-container-compact" : ""}`}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: parseFloat(getCSSVar("--animation-duration")) || 0.2,
      }}
      onClick={handleToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={label || "Toggle Multi-Select"}
      role="button"
      aria-label={label || "Toggle Multi-Select"}
      aria-pressed={isMultiSelecting}
    >
      <img
        src={isMultiSelecting ? activeIcon : inactiveIcon}
        alt="Toggle Icon"
        className={`w-5 h-5 shrink-0 ${iconClass}`}
      />
      <input
        type="checkbox"
        checked={isMultiSelecting}
        className="hidden cursor-pointer"
        title="Toggle Multi-Select"
        onChange={() => console.log("Checked Box")}
      />
      {!compact && (
        <span className="control-bar-label cursor-pointer select-none whitespace-nowrap">
          {label}
        </span>
      )}
    </motion.div>
  );
}
