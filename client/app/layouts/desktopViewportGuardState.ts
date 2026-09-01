import { useEffect, useState } from "react";

export const GUIDED_TOUR_MIN_WIDTH = 1200;
export const GUIDED_TOUR_MIN_HEIGHT = 700;

function isViewportTooSmall() {
  return (
    window.innerWidth < GUIDED_TOUR_MIN_WIDTH ||
    window.innerHeight < GUIDED_TOUR_MIN_HEIGHT
  );
}

export function useDesktopViewportGuard(enabled: boolean) {
  const [isBlocked, setIsBlocked] = useState(
    () => enabled && isViewportTooSmall()
  );

  useEffect(() => {
    if (!enabled) {
      setIsBlocked(false);
      return;
    }

    const checkViewport = () => setIsBlocked(isViewportTooSmall());
    checkViewport();

    window.addEventListener("resize", checkViewport);
    window.addEventListener("orientationchange", checkViewport);
    window.visualViewport?.addEventListener("resize", checkViewport);

    return () => {
      window.removeEventListener("resize", checkViewport);
      window.removeEventListener("orientationchange", checkViewport);
      window.visualViewport?.removeEventListener("resize", checkViewport);
    };
  }, [enabled]);

  return isBlocked;
}
