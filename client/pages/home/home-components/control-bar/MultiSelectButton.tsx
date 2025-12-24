import checkIcon from "@/assets/icons/check-icon.svg";
import uncheckIcon from "@/assets/icons/uncheck-icon.svg";
import { CheckBoxToggle } from "@/global-components/CheckBoxToggle";

export function MultiSelectButton() {
  return (
    <CheckBoxToggle
      label={"Multi-Select"}
      inactiveIcon={uncheckIcon}
      activeIcon={checkIcon}
      hoverIconColor={"goldIcon"}
    />
  );
}
