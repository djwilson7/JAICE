import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBannerNotifications } from "./bannerNotificationContext";

describe("bannerNotificationContext", () => {
  it("throws error when used outside provider", () => {
    // We expect console.error from React when throwing during render, let's suppress it
    const originalError = console.error;
    console.error = () => {};
    
    expect(() => renderHook(() => useBannerNotifications())).toThrowError(
      "useBannerNotifications must be used inside BannerNotificationProvider."
    );
    
    console.error = originalError;
  });
});
