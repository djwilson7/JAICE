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
  Bar: () => null,
  Chart: () => null,
  Doughnut: () => null,
  Line: () => null,
}));

describe("DashboardPage in demo mode", () => {
  it("shows neutral empty states without requesting dashboard data", () => {
    render(<DashboardPage />);

    expect(screen.getAllByText("No activity data available yet.")).toHaveLength(6);
    expect(api).not.toHaveBeenCalled();
  });
});
