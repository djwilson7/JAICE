import { describe, it, expect, vi } from "vitest";

vi.mock("react-dom/client", () => ({
  default: {
    createRoot: vi.fn(() => ({
      render: vi.fn(),
    })),
  },
}));

vi.mock("@/global-services/router", () => ({ router: {} }));
vi.mock("@/global-components/AuthProvider", () => ({ default: ({children}: any) => <div>{children}</div> }));
vi.mock("@/pages/settings/provider/SettingsProvider", () => ({ SettingsProvider: ({children}: any) => <div>{children}</div> }));
vi.mock("@/global-components/BannerNotificationProvider", () => ({ BannerNotificationProvider: ({children}: any) => <div>{children}</div> }));
vi.mock("react-router-dom", () => ({ RouterProvider: () => <div /> }));

describe("main.tsx", () => {
  it("executes without crashing", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await import("./main");
    expect(true).toBe(true);
  });
});
