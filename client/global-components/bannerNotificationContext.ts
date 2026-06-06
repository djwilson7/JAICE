import { createContext, useContext } from "react";

export type BannerNotificationTone = "success" | "error" | "warning" | "info";

export type BannerNotificationInput = {
  id?: string;
  title?: string;
  message: string;
  tone?: BannerNotificationTone;
  timeoutMs?: number;
};

export type BannerNotificationContextValue = {
  showBanner: (notification: BannerNotificationInput) => string;
  dismissBanner: (id: string) => void;
};

export const BannerNotificationContext =
  createContext<BannerNotificationContextValue | null>(null);

export function useBannerNotifications() {
  const context = useContext(BannerNotificationContext);

  if (!context) {
    throw new Error(
      "useBannerNotifications must be used inside BannerNotificationProvider."
    );
  }

  return context;
}
