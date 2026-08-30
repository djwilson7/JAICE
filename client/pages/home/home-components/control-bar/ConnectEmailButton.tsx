import { ControlBarButton } from "@/pages/home/home-components/control-bar/ControlBarButton";
import unlinkIcon from "@/assets/icons/unlink.svg";
import linkIcon from "@/assets/icons/link.svg";
import { useEffect, useState } from "react";
import { checkGmailStatus } from "@/pages/home/utils/checkGmailStatus";
import { IS_DEMO_MODE } from "@/global-services/projectMode";

interface ConnectEmailButtonProps {
  setIsOpen: (value: boolean) => void;
  compact?: boolean;
}

export function ConnectEmailButton({ setIsOpen, compact = false }: ConnectEmailButtonProps) {
  const [gmailConnected, setGmailConnected] = useState<boolean>(IS_DEMO_MODE);
  const [, setGmailError] = useState<string | null>(null);

  const connectEmailIcon = gmailConnected ? linkIcon : unlinkIcon;
  const connectEmailHoverColor = gmailConnected ? "greenIcon" : "redIcon";
  const connectEmailLabel = gmailConnected ? "Connected" : "Disconnected";

  useEffect(() => {
    if (IS_DEMO_MODE) return;
    checkGmailStatus({ setGmailConnected, setGmailError });
  }, []);

  return (
    <ControlBarButton
      onClick={() => setIsOpen(true)}
      icon={connectEmailIcon}
      iconHoverColor={connectEmailHoverColor}
      label={connectEmailLabel}
      prominent={gmailConnected ? false : true}
      alt="Connect Email Icon"
      compact={compact}
      disabled={IS_DEMO_MODE}
    />
  );
}
