import { ControlBarButton } from "@/pages/home/home-components/control-bar/ControlBarButton";
import plusIcon from "@/assets/icons/plus.svg";

interface NewApplicationButtonProps {
  onClick: () => void;
  compact?: boolean;
}

export function NewApplicationButton({
  onClick,
  compact = false,
}: NewApplicationButtonProps) {
  return (
    <ControlBarButton
      onClick={onClick}
      icon={plusIcon}
      iconHoverColor="greenIcon"
      label="New Application"
      alt="New Application Icon"
      compact={compact}
    />
  );
}
