import { DropDownMenu } from "@/global-components/DropDownMenu";
import filterIcon from "@/assets/icons/filter.svg";

interface FilterButtonProps {
  selectedOption: string;
  setSelectedOption: (value: string) => void;
  compact?: boolean;
}

export function FilterButton({
  selectedOption,
  setSelectedOption,
  compact = false,
}: FilterButtonProps) {
  return (
    <DropDownMenu
      selectedOption={selectedOption}
      setSelectedOption={setSelectedOption}
      leftIcon={filterIcon}
      compact={compact}
    />
  );
}
