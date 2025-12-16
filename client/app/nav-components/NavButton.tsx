import Button from "@/global-components/button";
import type { NavigationBehavior } from "@/pages/settings/provider/settingsTypes";
import { motion } from "framer-motion";

export const NavButton = ({
  icon,
  label,
  onClick,
  isSelected,
  hoverMode,
  title,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  isSelected: boolean;
  hoverMode: NavigationBehavior;
  title?: string;
}) => {
  const hoverModeRestMap = {
    "closed": false,
    "hover": false,
    "open": true,
  };

  const hoverModeLabelOpacityMap = {
    "closed": 0,
    "hover": 1,
    "open": 1,
  };

  return (
    <div className="flex flex-row items-center gap-2">
      <Button
        onClick={onClick}
        isSelected={isSelected}
        className="navButton"
        title={title}
      >
        <div className="flex items-center">
          <img src={icon} alt={label} className="w-5 h-5 flex-shrink-0 icon" />
        </div>
      </Button>
      <motion.span
        className="text-left overflow-hidden whitespace-nowrap"
        style={{
          height: "1.25rem",
          display: "flex",
          alignItems: "center",
        }}
        variants={{
          rest: { opacity: hoverModeRestMap[hoverMode] ? 1 : 0 },
          hover: { opacity: hoverModeLabelOpacityMap[hoverMode] },
        }}
        transition={{ duration: 0.15 }}
      >
        {label}
      </motion.span>
    </div>
  );
};
