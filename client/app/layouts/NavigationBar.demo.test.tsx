import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NavigationBar } from "./NavigationBar";
import React from "react";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockApi = vi.hoisted(() => vi.fn());
const authModuleLoaded = vi.hoisted(() => vi.fn());
const mockTourState = vi.hoisted(() => ({ navigationMode: "closed" }));

vi.mock("react-router", () => ({
  Outlet: () => null,
  useLocation: () => ({ pathname: "/home" }),
  useNavigate: () => mockNavigate,
}));

vi.mock("@/global-services/projectMode", () => ({
  IS_DEMO_MODE: true,
}));

vi.mock("./DesktopViewportGuard", () => ({
  DesktopViewportOverlay: () => null,
}));

vi.mock("./desktopViewportGuardState", () => ({
  useDesktopViewportGuard: () => false,
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

vi.mock("@/app/nav-components/MainHeader", () => ({
  MainHeader: ({ disabled }: { disabled?: boolean }) => (
    <div data-testid="main-header" data-disabled={String(disabled)} />
  ),
}));
vi.mock("@/app/nav-components/ThemeToggleButton", () => ({
  ThemeToggleButton: ({ disabled }: { disabled?: boolean }) => (
    <button disabled={disabled}>Theme</button>
  ),
}));
vi.mock("@/app/nav-components/NavButton", () => ({
  NavButton: ({
    label,
    onClick,
    disabled,
    showLabel,
    guidedTourTarget,
  }: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    showLabel?: boolean;
    guidedTourTarget?: string;
  }) => (
    <div data-guided-tour={guidedTourTarget}>
      <button
        onClick={onClick}
        disabled={disabled}
        data-show-label={String(showLabel)}
      >
        {label}
      </button>
    </div>
  ),
}));
vi.mock("./GuidedTour", () => ({
  GuidedTour: ({
    onNavigationModeChange,
  }: {
    onNavigationModeChange: (
      mode:
        | "closed"
        | "locked"
        | "expanded-locked"
        | "about-only"
        | "dashboard-only"
        | "resume-only"
    ) => void;
  }) => {
    React.useEffect(() => {
      onNavigationModeChange(
        mockTourState.navigationMode as
          | "closed"
          | "locked"
          | "expanded-locked"
          | "about-only"
          | "dashboard-only"
          | "resume-only"
      );
    }, [onNavigationModeChange]);
    return null;
  },
}));
vi.mock("framer-motion", () => ({
  motion: {
    nav: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <nav {...props}>{children}</nav>,
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe("NavigationBar in demo mode", () => {
  beforeEach(() => {
    mockTourState.navigationMode = "closed";
    vi.clearAllMocks();
  });

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

  it("locks step-one navigation while retaining hover labels and Quit", () => {
    mockTourState.navigationMode = "locked";
    render(<NavigationBar />);

    expect(screen.getByTestId("main-header")).toHaveAttribute(
      "data-disabled",
      "true"
    );
    expect(screen.getByRole("button", { name: "Home" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "About" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Dashboard" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Resume" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Theme" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Settings" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Quit" })).toBeEnabled();

    fireEvent.mouseEnter(document.querySelector("#navigation-bar")!);
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute(
      "data-show-label",
      "true"
    );
  });

  it("keeps step-two navigation expanded while locking destinations", () => {
    mockTourState.navigationMode = "expanded-locked";
    render(<NavigationBar />);

    expect(screen.getByTestId("main-header")).toHaveAttribute(
      "data-disabled",
      "false"
    );
    expect(screen.getByRole("button", { name: "Home" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "About" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Theme" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Settings" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Quit" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute(
      "data-show-label",
      "true"
    );
  });

  it("focuses About while retaining blurred navigation context and Quit", () => {
    mockTourState.navigationMode = "about-only";
    render(<NavigationBar />);

    const aboutButton = screen.getByRole("button", { name: "About" });
    const quitButton = screen.getByRole("button", { name: "Quit" });

    expect(aboutButton).toBeEnabled();
    expect(aboutButton.parentElement).toHaveAttribute(
      "data-guided-tour",
      "app-about-navigation"
    );
    expect(aboutButton.closest("li")).not.toHaveClass("guided-tour-nav-muted");
    expect(quitButton).toBeEnabled();
    expect(quitButton.closest("li")).toHaveClass(
      "guided-tour-nav-muted",
      "guided-tour-nav-exit"
    );

    for (const label of ["Home", "Dashboard", "Resume", "Theme", "Settings"]) {
      const button = screen.getByRole("button", { name: label });
      expect(button).toBeDisabled();
      expect(button.closest("li")).toHaveClass("guided-tour-nav-muted");
    }

    fireEvent.click(aboutButton);
    expect(mockNavigate).toHaveBeenCalledWith("/auth-about");
  });

  it("focuses Dashboard while retaining Quit and muting every other option", () => {
    mockTourState.navigationMode = "dashboard-only";
    render(<NavigationBar />);

    const dashboardButton = screen.getByRole("button", { name: "Dashboard" });

    expect(dashboardButton).toBeEnabled();
    expect(dashboardButton.parentElement).toHaveAttribute(
      "data-guided-tour",
      "app-dashboard-navigation"
    );
    expect(dashboardButton.closest("li")).not.toHaveClass(
      "guided-tour-nav-muted"
    );

    const quitButton = screen.getByRole("button", { name: "Quit" });
    expect(quitButton).toBeEnabled();
    expect(quitButton.closest("li")).toHaveClass(
      "guided-tour-nav-muted",
      "guided-tour-nav-exit"
    );

    for (const label of ["Home", "About", "Resume", "Theme", "Settings"]) {
      const button = screen.getByRole("button", { name: label });
      expect(button).toBeDisabled();
      expect(button.closest("li")).toHaveClass("guided-tour-nav-muted");
    }

    fireEvent.click(dashboardButton);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("focuses Resume while retaining Quit and muting every other option", () => {
    mockTourState.navigationMode = "resume-only";
    render(<NavigationBar />);

    const resumeButton = screen.getByRole("button", { name: "Resume" });
    const quitButton = screen.getByRole("button", { name: "Quit" });

    expect(resumeButton).toBeEnabled();
    expect(resumeButton.parentElement).toHaveAttribute(
      "data-guided-tour",
      "app-resume-navigation"
    );
    expect(resumeButton.closest("li")).not.toHaveClass(
      "guided-tour-nav-muted"
    );
    expect(quitButton).toBeEnabled();
    expect(quitButton.closest("li")).toHaveClass(
      "guided-tour-nav-muted",
      "guided-tour-nav-exit"
    );

    for (const label of ["Home", "About", "Dashboard", "Theme", "Settings"]) {
      const button = screen.getByRole("button", { name: label });
      expect(button).toBeDisabled();
      expect(button.closest("li")).toHaveClass("guided-tour-nav-muted");
    }

    fireEvent.click(resumeButton);
    expect(mockNavigate).toHaveBeenCalledWith("/resume");
  });
});
