import { describe, expect, it, vi } from "vitest";

const mockCreateBrowserRouter = vi.hoisted(() =>
  vi.fn((routes: unknown) => routes)
);

vi.mock("react-router-dom", () => ({
  createBrowserRouter: mockCreateBrowserRouter,
  Navigate: () => null,
}));

vi.mock("@/pages/landing/LandingPage", () => ({
  LandingPage: () => null,
}));

vi.mock("@/pages/about/AboutPage", () => ({
  AboutPage: () => null,
}));

vi.mock("@/app/layouts/NavigationBar", () => ({
  NavigationBar: () => null,
}));

vi.mock("@/pages/home/HomePage", () => ({
  HomePage: () => null,
}));

vi.mock("@/pages/about/about.meta", () => ({
  AuthAboutRoute: { path: "/auth-about", element: null },
}));

vi.mock("@/pages/dashboard/dashboard.meta", () => ({
  DashboardRoute: { path: "/dashboard", element: null },
}));

vi.mock("@/pages/Resume/resume.meta", () => ({
  ResumeRoute: { path: "/resume", element: null },
}));

vi.mock("@/pages/settings/settings.meta", () => ({
  SettingsRoute: { path: "/settings", element: null },
}));

import { demoRouter } from "@/global-services/demoRouter";

describe("demoRouter", () => {
  it("exposes Home without an authentication loader", () => {
    expect(demoRouter).toBeTruthy();

    const routes = mockCreateBrowserRouter.mock.calls[0][0] as Array<{
      path?: string;
      loader?: unknown;
      children?: Array<{ path?: string; loader?: unknown }>;
    }>;
    const appLayout = routes.find((route) => route.children);
    const homeRoute = appLayout?.children?.find(
      (route) => route.path === "/home"
    );

    expect(homeRoute).toBeTruthy();
    expect(appLayout?.loader).toBeUndefined();
    expect(homeRoute?.loader).toBeUndefined();

    expect(appLayout?.children?.map((route) => route.path)).toEqual(
      expect.arrayContaining(["/home", "/auth-about", "/dashboard", "/resume", "/settings"])
    );
  });
});
