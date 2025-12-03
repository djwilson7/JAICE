import openMenuIcon from "@/assets/icons/openMenuIcon.svg";
import closeMenuIcon from "@/assets/icons/closedMenuIcon.svg";
import hoverMenuIcon from "@/assets/icons/hoverMenuIcon.svg";
import { NavButton } from "./NavButton";

export const MenuToggleButton = ({
  hoverMode,
  setHoverMode,
}: {
  hoverMode: "hover" | "locked-open" | "locked-closed";
  setHoverMode: (value: "hover" | "locked-open" | "locked-closed") => void;
}) => {
  const menuIconMap = {
    "locked-closed": closeMenuIcon,
    hover: hoverMenuIcon,
    "locked-open": openMenuIcon,
  };

  const handleHoverModeToggle = () => {
    if (hoverMode === "locked-closed") {
      setHoverMode("hover");
    } else if (hoverMode === "hover") {
      setHoverMode("locked-open");
    } else {
      setHoverMode("locked-closed");
    }
  };

  const iconLabelMap = {
    "locked-closed": "Always Closed",
    hover: "Hover Mode",
    "locked-open": "Always Open",
  };

  const titleMap = {
    "locked-closed": "Flip to Hover Mode",
    hover: "Flip to Always Open",
    "locked-open": "Flip to Always Closed",
  };

  return (
    <NavButton
      onClick={handleHoverModeToggle}
      isSelected={false}
      label={iconLabelMap[hoverMode]}
      icon={menuIconMap[hoverMode]}
      hoverMode={hoverMode}
      title={titleMap[hoverMode]}
    />
  );
};
