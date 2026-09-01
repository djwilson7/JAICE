import { ControlBarButton } from "@/pages/home/home-components/control-bar/ControlBarButton";
import trashIcon from "@/assets/icons/trash.svg";

interface TrashModalButtonProps {
  setIsOpen: (value: boolean) => void;
  compact?: boolean;
  guidedTourTarget?: string;
}

export function TrashModalButton({
  setIsOpen,
  compact = false,
  guidedTourTarget,
}: TrashModalButtonProps) {

  return (
    <ControlBarButton
      onClick={() => setIsOpen(true)}
      icon={trashIcon}
      iconHoverColor={"redIcon"}
      label="Trash"
      alt="Trash"
      compact={compact}
      guidedTourTarget={guidedTourTarget}
    />
  );
}
