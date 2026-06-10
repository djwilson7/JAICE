import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import DashboardPage from "./DashboardPage";

// Mock resize observer for Chart.js
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("@/global-services/api", () => ({
  api: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/global-services/auth", () => ({
  getCurrentUserInfo: vi.fn().mockReturnValue({ uid: "123" }),
}));

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: vi.fn().mockReturnValue({
    settings: {
      appearance: { theme: "light" },
      account: { daysToSync: 30 }
    }
  }),
}));

vi.mock("@/pages/dashboard/hooks/useDashboardRealtimeRefresh", () => ({
  useDashboardRealtimeRefresh: vi.fn().mockReturnValue(1),
}));

// Mock canvas API that Chart.js uses
HTMLCanvasElement.prototype.getContext = () => {
  return {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn((x, y, w, h) => ({ data: new Array(w * h * 4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn([]),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  } as any;
};

describe("DashboardPage", () => {
  it("renders without crashing", () => {
    const { container } = render(<DashboardPage />);
    expect(container.innerHTML).not.toBe("");
  });
});
