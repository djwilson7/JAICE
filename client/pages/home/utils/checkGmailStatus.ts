import { api } from "@/global-services/api";

interface CheckGmailStatusParams {
  setGmailConnected: (connected: boolean) => void;
  setGmailError: (error: string | null) => void;
}

export async function checkGmailStatus({
  setGmailConnected,
  setGmailError,
}: CheckGmailStatusParams) {
  try {
    const response = await api("/api/auth/gmail-consent-status");
    console.log("Gmail consent status response:", response);
    setGmailConnected(response.isConnected);
    setGmailError(null);
    return;
  } catch (err) {
    console.error("Error checking Gmail consent status:", err);
    setGmailConnected(false);
    setGmailError("Error checking gmail status.");
  }
}
