import { ControlBarButton } from "@/pages/home/home-components/control-bar/ControlBarButton";
import trashIcon from "@/assets/icons/trash-undo.svg";

interface TrashModalButtonProps {
  setIsOpen: (value: boolean) => void;
  compact?: boolean;
}

export function TrashModalButton({ setIsOpen, compact = false }: TrashModalButtonProps) {

  return (
    <ControlBarButton
      onClick={() => setIsOpen(true)}
      icon={trashIcon}
      iconHoverColor={"redIcon"}
      label="Trash"
      alt="Undo Trash Icon"
      compact={compact}
    />
  );
}
