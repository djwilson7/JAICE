import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NavigationBar } from "./NavigationBar";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockApi = vi.hoisted(() => vi.fn());
const authModuleLoaded = vi.hoisted(() => vi.fn());

vi.mock("react-router", () => ({
  Outlet: () => null,
  useLocation: () => ({ pathname: "/home" }),
  useNavigate: () => mockNavigate,
}));

vi.mock("@/global-services/projectMode", () => ({
  IS_DEMO_MODE: true,
}));

vi.mock("@/global-services/api", () => ({
  api: mockApi,
}));

vi.mock("@/global-services/auth", () => {
  authModuleLoaded();
  return { logOut: vi.fn() };
});

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: () => ({ navigationBehavior: "closed" }),
}));

vi.mock("@/app/nav-components/MainHeader", () => ({ MainHeader: () => null }));
vi.mock("@/app/nav-components/ThemeToggleButton", () => ({
  ThemeToggleButton: ({ disabled }: { disabled?: boolean }) => (
    <button disabled={disabled}>Theme</button>
  ),
}));
vi.mock("@/app/nav-components/NavButton", () => ({
  NavButton: ({
    label,
    onClick,
  }: {
    label: string;
    onClick: () => void;
  }) => <button onClick={onClick}>{label}</button>,
}));
vi.mock("framer-motion", () => ({
  motion: {
    nav: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <nav {...props}>{children}</nav>,
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe("NavigationBar in demo mode", () => {
  it("allows product navigation and exits without backend or Firebase logout", async () => {
    render(<NavigationBar />);

    expect(screen.getByRole("button", { name: "Theme" })).toBeEnabled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "About" }));
      fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));
      fireEvent.click(screen.getByRole("button", { name: "Resume" }));
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      fireEvent.click(screen.getByRole("button", { name: "Quit" }));
    });

    expect(mockNavigate).toHaveBeenCalledWith("/auth-about");
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    expect(mockNavigate).toHaveBeenCalledWith("/resume");
    expect(mockNavigate).toHaveBeenCalledWith("/settings");
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    expect(mockApi).not.toHaveBeenCalled();
    expect(authModuleLoaded).not.toHaveBeenCalled();
  });
});
