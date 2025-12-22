import { ControlBarButton } from "@/pages/home/home-components/control-bar/ControlBarButton";
import unlinkIcon from "@/assets/icons/unlink.svg";
import linkIcon from "@/assets/icons/link.svg";
import { useEffect, useState } from "react";
import { checkGmailStatus } from "@/pages/home/utils/checkGmailStatus";

interface ConnectEmailButtonProps {
  setIsOpen: (value: boolean) => void;
}

export function ConnectEmailButton({ setIsOpen }: ConnectEmailButtonProps) {
  const [gmailConnected, setGmailConnected] = useState<boolean>(false); // Placeholder for actual gmail connection status
  const [gmailError, setGmailError] = useState<string | null>(null);

  const connectEmailIcon = gmailConnected ? linkIcon : unlinkIcon;
  const connectEmailHoverColor = gmailConnected ? "greenIcon" : "redIcon";
  const connectEmailLabel = gmailConnected ? "Connected" : "Disconnected";

  useEffect(() => {
    checkGmailStatus({ setGmailConnected, setGmailError });
  }, []);

  return (
    <ControlBarButton
      onClick={() => setIsOpen(true)}
      icon={connectEmailIcon}
      iconHoverColor={connectEmailHoverColor}
      label={connectEmailLabel}
      prominent={gmailConnected ? false : true}
    />
  );
}
