import checkIcon from "@/assets/icons/check-icon.svg";
import uncheckIcon from "@/assets/icons/uncheck-icon.svg";
import { CheckBoxToggle } from "@/global-components/CheckBoxToggle";

interface MultiSelectButtonProps {
  compact?: boolean;
}

export function MultiSelectButton({ compact = false }: MultiSelectButtonProps) {
  return (
    <CheckBoxToggle
      label={"Multi-Select"}
      inactiveIcon={uncheckIcon}
      activeIcon={checkIcon}
      hoverIconColor={"greenIcon"}
      compact={compact}
    />
  );
}
