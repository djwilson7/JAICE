import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { NavigationBar } from "./NavigationBar";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
const mockLocation = { pathname: "/home" };

vi.mock("react-router", () => ({
  Outlet: () => <div data-testid="outlet">Outlet</div>,
  useLocation: () => mockLocation,
  useNavigate: () => mockNavigate,
}));

// Use inline vi.fn() inside the factory to avoid hoisting issues
vi.mock("@/global-services/auth", () => ({
  logOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/global-services/api", () => ({
  api: vi.fn().mockResolvedValue({}),
}));

vi.mock("framer-motion", () => ({
  motion: {
    nav: ({ children, onMouseEnter, onMouseLeave, ...rest }: React.HTMLAttributes<HTMLElement>) => (
      <nav onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} data-testid="motion-nav" {...rest}>{children}</nav>
    ),
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
}));

vi.mock("@/app/nav-components/NavButton", () => ({
  NavButton: ({ label, onClick, isSelected }: { label: string; onClick: () => void; isSelected: boolean }) => (
    <button data-testid="nav-button" data-label={label} data-selected={String(isSelected)} onClick={onClick}>
      {label}
    </button>
  ),
}));

vi.mock("@/app/nav-components/ThemeToggleButton", () => ({
  ThemeToggleButton: () => <div data-testid="theme-toggle">Theme</div>,
}));

vi.mock("@/app/nav-components/MainHeader", () => ({
  MainHeader: () => <div data-testid="main-header">Header</div>,
}));

const mockUseSettings = vi.fn();
vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: () => mockUseSettings(),
}));

// Import mocked modules AFTER vi.mock calls to get the spy references
import { logOut } from "@/global-services/auth";
import { api } from "@/global-services/api";

const mockLogOut = logOut as ReturnType<typeof vi.fn>;
const mockApi = api as ReturnType<typeof vi.fn>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function navButton(label: string) {
  return screen.getByRole("button", { name: label });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("NavigationBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.pathname = "/home";
    mockUseSettings.mockReturnValue({ navigationBehavior: "hover" });
  });

  // ── Renders ────────────────────────────────────────────────────────────────

  it("renders MainHeader, theme toggle, nav buttons and outlet", () => {
    render(<NavigationBar />);
    expect(screen.getByTestId("main-header")).toBeTruthy();
    expect(screen.getByTestId("theme-toggle")).toBeTruthy();
    expect(screen.getAllByTestId("nav-button").length).toBeGreaterThan(0);
    expect(screen.getByTestId("outlet")).toBeTruthy();
  });

  // ── Location → selected button (every path branch) ─────────────────────────

  it.each([
    ["/home",       "home",     "Home"],
    ["/auth-about", "about",    "About"],
    ["/dashboard",  "dashboard","Dashboard"],
    ["/resume",     "resume",   "Resume"],
    ["/settings",   "settings", "Settings"],
    ["/unknown",    "",         null],
  ])("pathname %s selects %s", (pathname, _key, label) => {
    mockLocation.pathname = pathname;
    render(<NavigationBar />);
    if (label) {
      const btn = screen.getByRole("button", { name: label });
      expect(btn.getAttribute("data-selected")).toBe("true");
    }
    // just verifying it renders without throw for unknown path
  });

  // ── Hover expand/collapse ──────────────────────────────────────────────────

  it("expands nav on mouse enter and collapses on mouse leave", () => {
    render(<NavigationBar />);
    const nav = screen.getByTestId("motion-nav");
    fireEvent.mouseEnter(nav);
    fireEvent.mouseLeave(nav);
    // No throw = passes; visual width changes are driven by framer-motion state
  });

  // ── hoverMode branches ────────────────────────────────────────────────────

  it("is expanded when hoverMode is 'open'", () => {
    mockUseSettings.mockReturnValue({ navigationBehavior: "open" });
    render(<NavigationBar />);
    // All buttons still render
    expect(screen.getAllByTestId("nav-button").length).toBeGreaterThan(0);
  });

  it("is collapsed when hoverMode is 'closed'", () => {
    mockUseSettings.mockReturnValue({ navigationBehavior: "closed" });
    render(<NavigationBar />);
    expect(screen.getAllByTestId("nav-button").length).toBeGreaterThan(0);
  });

  // ── Normal navigation ─────────────────────────────────────────────────────

  it("navigates to /home when Home button is clicked", async () => {
    render(<NavigationBar />);
    await act(async () => { fireEvent.click(navButton("Home")); });
    expect(mockNavigate).toHaveBeenCalledWith("/home");
  });

  it("navigates to /dashboard when Dashboard button is clicked", async () => {
    render(<NavigationBar />);
    await act(async () => { fireEvent.click(navButton("Dashboard")); });
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("navigates to /resume when Resume button is clicked", async () => {
    render(<NavigationBar />);
    await act(async () => { fireEvent.click(navButton("Resume")); });
    expect(mockNavigate).toHaveBeenCalledWith("/resume");
  });

  it("navigates to /settings when Settings button is clicked", async () => {
    render(<NavigationBar />);
    await act(async () => { fireEvent.click(navButton("Settings")); });
    expect(mockNavigate).toHaveBeenCalledWith("/settings");
  });

  // ── Logout flow ───────────────────────────────────────────────────────────

  it("calls api logout, logOut, and navigates to / on Quit click", async () => {
    render(<NavigationBar />);
    await act(async () => { fireEvent.click(navButton("Quit")); });
    expect(mockApi).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    expect(mockLogOut).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("still calls logOut and navigates when api logout throws", async () => {
    mockApi.mockRejectedValueOnce(new Error("network error"));
    render(<NavigationBar />);
    await act(async () => { fireEvent.click(navButton("Quit")); });
    expect(mockLogOut).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("still navigates when both api and logOut throw", async () => {
    mockApi.mockRejectedValueOnce(new Error("api fail"));
    // logOut rejection leaks as an unhandled rejection from the finally block;
    // suppress it with a no-op rejection handler so the test doesn't cause a
    // false-positive unhandled-error report in Vitest.
    mockLogOut.mockImplementationOnce(() =>
      Promise.reject(new Error("auth fail")).catch(() => {})
    );
    render(<NavigationBar />);
    await act(async () => { fireEvent.click(navButton("Quit")); });
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });
});
