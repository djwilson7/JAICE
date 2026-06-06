import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BannerNotificationContext,
  type BannerNotificationInput,
} from "@/global-components/bannerNotificationContext";

type BannerNotification = Required<
  Pick<BannerNotificationInput, "message" | "tone" | "timeoutMs">
> &
  Pick<BannerNotificationInput, "title"> & {
    id: string;
  };

const DEFAULT_TIMEOUT_MS = 6000;

function createBannerId() {
  return `banner-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function BannerNotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [notifications, setNotifications] = useState<BannerNotification[]>([]);

  const dismissBanner = useCallback((id: string) => {
    setNotifications((current) =>
      current.filter((notification) => notification.id !== id)
    );
  }, []);

  const showBanner = useCallback(
    ({
      id = createBannerId(),
      title,
      message,
      tone = "info",
      timeoutMs = DEFAULT_TIMEOUT_MS,
    }: BannerNotificationInput) => {
      const notification = {
        id,
        title,
        message,
        tone,
        timeoutMs,
      };

      setNotifications((current) => [
        notification,
        ...current.filter((item) => item.id !== id),
      ]);

      return id;
    },
    []
  );

  const value = useMemo(
    () => ({ showBanner, dismissBanner }),
    [dismissBanner, showBanner]
  );

  return (
    <BannerNotificationContext.Provider value={value}>
      {children}
      <div className="banner-notification-region" aria-live="polite">
        <AnimatePresence initial={false}>
          {notifications.map((notification) => (
            <BannerNotificationItem
              key={notification.id}
              notification={notification}
              onDismiss={dismissBanner}
            />
          ))}
        </AnimatePresence>
      </div>
    </BannerNotificationContext.Provider>
  );
}

function BannerNotificationItem({
  notification,
  onDismiss,
}: {
  notification: BannerNotification;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    if (notification.timeoutMs <= 0) return;

    const timer = window.setTimeout(() => {
      onDismiss(notification.id);
    }, notification.timeoutMs);

    return () => window.clearTimeout(timer);
  }, [notification.id, notification.timeoutMs, onDismiss]);

  return (
    <motion.div
      role={notification.tone === "error" ? "alert" : "status"}
      className={`banner-notification banner-notification-${notification.tone}`}
      initial={{ opacity: 0, x: 28, scaleX: 0.88 }}
      animate={{ opacity: 1, x: 0, scaleX: 1 }}
      exit={{ opacity: 0, x: 28, scaleX: 0.88 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <div className="banner-notification-state-line" aria-hidden="true" />
      <div className="banner-notification-copy">
        {notification.title && (
          <strong className="banner-notification-title">
            {notification.title}
          </strong>
        )}
        <span className="banner-notification-message">
          {notification.message}
        </span>
      </div>
      <button
        type="button"
        className="banner-notification-dismiss"
        title="Dismiss notification"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(notification.id)}
      >
        x
      </button>
    </motion.div>
  );
}
