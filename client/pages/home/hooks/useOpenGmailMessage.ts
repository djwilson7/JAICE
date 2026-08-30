import { IS_DEMO_MODE } from "@/global-services/projectMode";

export async function openGmailMessage(messageId: string) {
  if (IS_DEMO_MODE) return;

  const { auth } = await import("@/global-services/firebase");
  const userEmail = auth.currentUser?.email;
  if (!userEmail) return;
  window.open(
    `https://mail.google.com/mail/u/${userEmail}/#inbox/${messageId}`,
    "_blank"
  );
}
