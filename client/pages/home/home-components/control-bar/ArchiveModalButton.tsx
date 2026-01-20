import { ControlBarButton } from "@/pages/home/home-components/control-bar/ControlBarButton";
import archiveIcon from "@/assets/icons/folder.svg";

interface ArchiveModalButtonProps {
  setIsOpen: (value: boolean) => void;
}

export function ArchiveModalButton({ setIsOpen }: ArchiveModalButtonProps) {
  return (
    <ControlBarButton
      onClick={() => setIsOpen(true)}
      icon={archiveIcon}
      iconHoverColor={"purpleIcon"}
      label="Archive"
      alt="Archive Icon"
    />
  );
}
