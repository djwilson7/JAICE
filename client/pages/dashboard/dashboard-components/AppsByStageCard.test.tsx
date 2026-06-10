import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AppsByStageCard } from "./AppsByStageCard";
import { api } from "@/global-services/api";

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: vi.fn(() => ({ settings: {}, theme: "dark" })),
}));

vi.mock("@/global-services/api", () => ({
  api: vi.fn().mockResolvedValue({ data: { labels: ["Applied"], values: [1] } }),
}));

let capturedDoughnutProps: any = null;

vi.mock("react-chartjs-2", () => ({
  Doughnut: (props: any) => {
    capturedDoughnutProps = props;
    return <div data-testid="doughnut-chart">Doughnut Chart</div>;
  },
}));

describe("AppsByStageCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedDoughnutProps = null;
  });

  it("renders correctly", async () => {
    (api as any).mockResolvedValue({ data: { labels: ["Applied"], values: [1] } });
    render(<AppsByStageCard />);
    expect(await screen.findByTestId("doughnut-chart")).toBeDefined();
  });

  it("handles empty state", async () => {
    (api as any).mockResolvedValue({ data: { labels: [], values: [] } });
    render(<AppsByStageCard />);
    expect(await screen.findByText("No applications to display yet.")).toBeDefined();
  });

  it("handles API failure", async () => {
    (api as any).mockRejectedValue(new Error("Network fail"));
    render(<AppsByStageCard />);
    expect(await screen.findByText("Network fail")).toBeDefined();
  });

  it("exercises chart configuration callbacks", async () => {
    (api as any).mockResolvedValue({ data: { labels: ["Applied", "Interview"], values: [1, 2] } });
    render(<AppsByStageCard />);
    await screen.findByTestId("doughnut-chart");

    const options = capturedDoughnutProps?.options;
    expect(options).toBeDefined();

    if (options.plugins?.tooltip?.external) {
      const mockContext = {
        chart: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) } },
        tooltip: {
          opacity: 1,
          caretX: 10,
          caretY: 10,
          dataPoints: [{ label: "Interview", parsed: 2, element: { options: { backgroundColor: "blue" } } }]
        }
      };
      options.plugins.tooltip.external(mockContext as any);
      
      const mockContextHide = { ...mockContext, tooltip: { ...mockContext.tooltip, opacity: 0 } };
      options.plugins.tooltip.external(mockContextHide as any);
    }
  });
});
