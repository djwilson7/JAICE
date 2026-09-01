import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { api } from "@/global-services/api";
import { DashboardPage } from "./DashboardPage";

vi.mock("@/global-services/projectMode", () => ({ IS_DEMO_MODE: true }));

vi.mock("@/global-services/api", () => ({
  api: vi.fn(),
}));

vi.mock("@/global-components/authContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: () => ({ theme: "dark" }),
}));

vi.mock("react-chartjs-2", () => ({
  Bar: () => <div data-testid="demo-bar-chart" />,
  Chart: () => <div data-testid="demo-heatmap-chart" />,
  Doughnut: () => <div data-testid="demo-doughnut-chart" />,
  Line: () => <div data-testid="demo-line-chart" />,
}));

describe("DashboardPage in demo mode", () => {
  it("renders the static aggregate without requesting dashboard data", () => {
    render(<DashboardPage />);

    expect(
      screen.queryByText("No activity data available yet.")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("demo-doughnut-chart")).toBeInTheDocument();
    expect(screen.getAllByTestId("demo-line-chart")).toHaveLength(2);
    expect(screen.getByTestId("demo-heatmap-chart")).toBeInTheDocument();
    expect(screen.getByTestId("demo-bar-chart")).toBeInTheDocument();
    expect(screen.getByText("Weekly Apps")).toBeInTheDocument();
    expect(screen.getByText("50 days")).toBeInTheDocument();
    expect(
      document.querySelector('[data-guided-tour="dashboard-grit-card"]')
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-guided-tour="dashboard-reading-card"]')
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-guided-tour="dashboard-avg-time-info"]')
    ).toHaveAttribute("aria-label", "About Avg Time in Stage");
    expect(
      document.querySelector('[data-guided-tour="dashboard-avg-time-card"]')
    ).toBeInTheDocument();
    expect(
      document.querySelector(
        '[data-guided-tour="dashboard-stages-over-time-card"]'
      )
    ).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });
});
