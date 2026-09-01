import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DesktopViewportOverlay,
} from "./DesktopViewportGuard";
import {
  GUIDED_TOUR_MIN_HEIGHT,
  GUIDED_TOUR_MIN_WIDTH,
  useDesktopViewportGuard,
} from "./desktopViewportGuardState";

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
}

function GuardHarness({ enabled = true, onAction = vi.fn() }) {
  const isBlocked = useDesktopViewportGuard(enabled);

  return (
    <>
      <main inert={isBlocked ? true : undefined} aria-hidden={isBlocked || undefined}>
        <button onClick={onAction}>Underlying action</button>
      </main>
      <DesktopViewportOverlay isOpen={isBlocked} />
    </>
  );
}

describe("DesktopViewportGuard", () => {
  beforeEach(() => {
    setViewport(GUIDED_TOUR_MIN_WIDTH + 100, GUIDED_TOUR_MIN_HEIGHT + 100);
  });

  it("blocks the guided tour until the viewport returns to desktop size", () => {
    const onAction = vi.fn();
    render(<GuardHarness onAction={onAction} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    act(() => {
      setViewport(GUIDED_TOUR_MIN_WIDTH - 1, GUIDED_TOUR_MIN_HEIGHT - 1);
      window.dispatchEvent(new Event("resize"));
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText(/switch from mobile to desktop to continue/i)
    ).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(screen.getByRole("button", { name: "Underlying action", hidden: true }));
    expect(onAction).not.toHaveBeenCalled();

    act(() => {
      setViewport(GUIDED_TOUR_MIN_WIDTH, GUIDED_TOUR_MIN_HEIGHT);
      window.dispatchEvent(new Event("resize"));
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Underlying action" }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("does not activate outside the guided-tour shell", () => {
    setViewport(320, 480);
    render(<GuardHarness enabled={false} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
