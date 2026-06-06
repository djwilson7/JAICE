import Button from "@/global-components/button";
import type { NavigationBehavior } from "@/pages/settings/provider/settingsTypes";
import { getCSSVar } from "@/utils/getCSSVar";
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
  const isExpanded = hoverMode === "open" || showLabel;
  const labelVariants = {
    collapsed: {
      opacity: 0,
      width: 0,
      x: -6,
      transition: {
        duration: 0.12,
        ease: [0.4, 0, 1, 1] as const,
      },
    },
    expanded: {
      opacity: 1,
      width: "auto",
      x: 0,
      transition: {
        duration: parseFloat(getCSSVar("--animation-duration")) || 0.2,
        ease: [0.22, 1, 0.36, 1] as const,
        opacity: {
          duration: 0.16,
          delay: 0.06,
        },
      },
    },
  };

  return (
    <motion.div
      className="flex w-full flex-row items-center justify-start"
    >
      <Button
        onClick={onClick}
        isSelected={isSelected}
        className={`navButton ${
          isExpanded ? "navButtonExpanded" : "navButtonCollapsed"
        }`}
        title={title}
      >
        <div className="navButtonIconSlot">
          <img src={icon} alt={label} className="h-3.5 w-3.5 flex-shrink-0 icon" />
        </div>
        <motion.span
          className="navButtonLabel overflow-hidden whitespace-nowrap text-left text-[0.67rem] font-light leading-none"
          variants={labelVariants}
          initial={false}
          animate={isExpanded ? "expanded" : "collapsed"}
        >
          {label}
        </motion.span>
      </Button>
    </motion.div>
  );
};
