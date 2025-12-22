import { ControlBarButton } from "@/pages/home/home-components/control-bar/ControlBarButton";
import trashIcon from "@/assets/icons/trash-undo.svg";

interface TrashModalButtonProps {
  setIsOpen: (value: boolean) => void;
}

export function TrashModalButton({ setIsOpen }: TrashModalButtonProps) {

  return (
    <ControlBarButton
      onClick={() => setIsOpen(true)}
      icon={trashIcon}
      iconHoverColor={"redIcon"}
      label="Trash"
    />
  );
}
