import { auth } from "@/global-services/firebase";

export function openGmailMessage(messageId: string) {
  const userEmail = auth.currentUser?.email;
  if (!userEmail) return;
  window.open(
    `https://mail.google.com/mail/u/${userEmail}/#inbox/${messageId}`,
    "_blank"
  );
}
