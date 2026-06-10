import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import React from "react";
import { BannerNotificationProvider } from "./BannerNotificationProvider";
import { useBannerNotifications } from "./bannerNotificationContext";

// Mock framer-motion to simplify events and disable exit animations
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const TestConsumer = () => {
  const { showBanner, dismissBanner } = useBannerNotifications();
  return (
    <div>
      <button data-testid="show-info" onClick={() => showBanner({ message: "Info msg" })}>Show Info</button>
      <button data-testid="show-error" onClick={() => showBanner({ message: "Err msg", tone: "error", title: "Err Title", timeoutMs: 100 })}>Show Error</button>
      <button data-testid="show-no-timeout" onClick={() => showBanner({ message: "Persistent", timeoutMs: 0 })}>Show Persistent</button>
      <button data-testid="dismiss-all" onClick={() => dismissBanner("fixed-id")}>Dismiss Fixed</button>
      <button data-testid="show-fixed" onClick={() => showBanner({ id: "fixed-id", message: "Fixed ID" })}>Show Fixed</button>
    </div>
  );
};

describe("BannerNotificationProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders children and handles banner lifecycle", async () => {
    render(
      <BannerNotificationProvider>
        <TestConsumer />
      </BannerNotificationProvider>
    );

    // 1. Show info banner
    await act(async () => {
      fireEvent.click(screen.getByTestId("show-info"));
    });
    expect(screen.getByText("Info msg")).toBeInTheDocument();

    // 2. Show error banner
    await act(async () => {
      fireEvent.click(screen.getByTestId("show-error"));
    });
    expect(screen.getByText("Err Title")).toBeInTheDocument();

    // 3. Auto dismissal
    await act(async () => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.queryByText("Err msg")).not.toBeInTheDocument();

    // 4. Show fixed ID and manual dismissal
    await act(async () => {
      fireEvent.click(screen.getByTestId("show-fixed"));
    });
    expect(screen.getByText("Fixed ID")).toBeInTheDocument();
    
    await act(async () => {
      fireEvent.click(screen.getByTestId("dismiss-all"));
    });
    expect(screen.queryByText("Fixed ID")).not.toBeInTheDocument();
  });

  it("handles persistent banners and manual 'x' click", async () => {
    render(
      <BannerNotificationProvider>
        <TestConsumer />
      </BannerNotificationProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("show-no-timeout"));
    });
    
    expect(screen.getByText("Persistent")).toBeInTheDocument();

    // Advance time - should still be there
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByText("Persistent")).toBeInTheDocument();

    // Click 'x'
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Dismiss notification"));
    });
    expect(screen.queryByText("Persistent")).not.toBeInTheDocument();
  });

  it("replaces notification with same ID", async () => {
      render(
        <BannerNotificationProvider>
          <TestConsumer />
        </BannerNotificationProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId("show-fixed"));
      });
      expect(screen.getByText("Fixed ID")).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByTestId("show-fixed"));
      });
      
      const items = screen.getAllByText("Fixed ID");
      expect(items).toHaveLength(1);
  });
});
