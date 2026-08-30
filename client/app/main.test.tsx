import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateRoot, mockRender } = vi.hoisted(() => ({
  mockCreateRoot: vi.fn(),
  mockRender: vi.fn(),
}));

vi.mock("react-dom/client", () => ({
  default: {
    createRoot: mockCreateRoot,
  },
}));

vi.mock("@/global-services/demoRouter", () => ({ demoRouter: {} }));
vi.mock("@/global-services/router", () => ({ router: {} }));
vi.mock("@/global-components/AuthProvider", () => ({ default: ({children}: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/pages/settings/provider/SettingsProvider", () => ({ SettingsProvider: ({children}: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/global-components/BannerNotificationProvider", () => ({ BannerNotificationProvider: ({children}: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("react-router-dom", () => ({ RouterProvider: () => <div /> }));

describe("main.tsx", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    mockRender.mockReset();
    mockCreateRoot.mockReset();
    mockCreateRoot.mockReturnValue({ render: mockRender });
    document.body.innerHTML = '<div id="root"></div>';
  });

  it("mounts the demo router without authentication", async () => {
    vi.stubEnv("VITE_PROJECT_MODE", "demo");

    const { applicationReady } = await import("./main");
    await applicationReady;

    expect(mockCreateRoot).toHaveBeenCalledWith(document.getElementById("root"));
    expect(mockRender).toHaveBeenCalledOnce();
  });

  it("mounts the live router with authentication in dev mode", async () => {
    vi.stubEnv("VITE_PROJECT_MODE", "dev");

    const { applicationReady } = await import("./main");
    await applicationReady;

    expect(mockCreateRoot).toHaveBeenCalledWith(document.getElementById("root"));
    expect(mockRender).toHaveBeenCalledOnce();
  });
});
