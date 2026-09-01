import checkIcon from "@/assets/icons/check-icon.svg";
import uncheckIcon from "@/assets/icons/uncheck-icon.svg";
import { CheckBoxToggle } from "@/global-components/CheckBoxToggle";

interface MultiSelectButtonProps {
  compact?: boolean;
  guidedTourTarget?: string;
}

export function MultiSelectButton({
  compact = false,
  guidedTourTarget,
}: MultiSelectButtonProps) {
  return (
    <CheckBoxToggle
      label={"Multi-Select"}
      inactiveIcon={uncheckIcon}
      activeIcon={checkIcon}
      hoverIconColor={"greenIcon"}
      compact={compact}
      guidedTourTarget={guidedTourTarget}
    />
  );
}
