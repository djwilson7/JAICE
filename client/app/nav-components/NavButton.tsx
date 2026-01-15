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
  showLabel,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  isSelected: boolean;
  hoverMode: NavigationBehavior;
  title?: string;
  showLabel: boolean;
}) => {
  const labelVariants = {
    closed: { opacity: 0, width: 0 },
    hover: { opacity: 1, width: showLabel ? "fit-content" : 0 },
    open: { opacity: 1, width: "auto" },
  };

  const initialLabel = () => {
    switch (hoverMode) {
      case "closed":
        return "closed";
      case "hover":
        return showLabel ? "hover" : "closed";
      case "open":
        return "open";
    }
  }

  return (
    <motion.div
      className="flex flex-row items-start justify-start gap-2"
    >
      <Button
        onClick={onClick}
        isSelected={isSelected}
        className="navButton"
        title={title}
      >
        <div className="flex items-center">
          <img src={icon} alt={label} className="w-5 h-5 flex-shrink-0 icon" />
        </div>
        {hoverMode === "open" || showLabel ? (
          <motion.span
            className="text-left overflow-hidden whitespace-nowrap"
            variants={labelVariants}
            initial={initialLabel()}
            animate={initialLabel()}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.span>
        ) : null}
      </Button>
    </motion.div>
  );
};
