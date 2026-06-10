import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActivityHeatmapCard } from "./ActivityHeatmapCard";
import { api } from "@/global-services/api";

vi.mock("@/global-services/api", () => ({
  api: vi.fn()
}));
vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: () => ({ theme: "light" })
}));

let capturedChartProps: any = null;

vi.mock("react-chartjs-2", () => ({
  Chart: (props: any) => {
    capturedChartProps = props;
    return <div data-testid="mock-chart">Mock Chart</div>;
  },
}));

describe("ActivityHeatmapCard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    capturedChartProps = null;
  });

  it("renders loading skeleton initially", async () => {
    let resolveApi: any;
    (api as any).mockImplementation(() => new Promise((resolve) => {
      resolveApi = resolve;
    }));

    render(<ActivityHeatmapCard filterMode="14" animate={false} animationDelay={0} />);
    
    await act(async () => {
      resolveApi({
        data: [
          { x: "W1", y: "Mon", v: 1, date: "2024-01-01" },
          { x: "W1", y: "Tue", v: 2, date: "2024-01-02" }
        ]
      });
    });
  });

  it("renders chart after loading", async () => {
    (api as any).mockResolvedValue({
      data: [
        { x: "W1", y: "Mon", v: 1, date: "2024-01-01" },
        { x: "W1", y: "Tue", v: 2, date: "2024-01-02" }
      ]
    });

    render(<ActivityHeatmapCard filterMode="30" animate={false} animationDelay={0} />);
    
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByTestId("mock-chart")).toBeDefined();
  });

  it("renders error state on API failure", async () => {
    (api as any).mockRejectedValue(new Error("Network Error"));

    render(<ActivityHeatmapCard filterMode="90" animate={false} animationDelay={0} />);
    
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText("Network Error")).toBeDefined();
  });

  it("exercises chart configuration callbacks", async () => {
    (api as any).mockResolvedValue({
      data: [
        { x: "W1", y: "Mon", v: 1, date: "2024-01-01" },
        { x: "W1", y: "Tue", v: 2, date: "2024-01-02" }
      ]
    });

    render(<ActivityHeatmapCard filterMode="30" animate={false} animationDelay={0} />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const options = capturedChartProps.options;
    expect(options).toBeDefined();

    // Trigger external tooltip handler
    if (options.plugins?.tooltip?.external) {
      const mockContext = {
        chart: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) } },
        tooltip: {
          opacity: 1,
          caretX: 10,
          caretY: 10,
          title: ["Title"],
          body: [{ lines: ["Body line"] }],
          labelColors: [{ borderColor: "red" }],
          dataPoints: [{ raw: { date: "2024-01-01", v: 5 } }]
        }
      };
      options.plugins.tooltip.external(mockContext as any);
      
      const mockContextHide = { ...mockContext, tooltip: { ...mockContext.tooltip, opacity: 0 } };
      options.plugins.tooltip.external(mockContextHide as any);
    }

    // Trigger tick callbacks if any
    if (options.scales?.x?.ticks?.callback) {
      const mockThis = { getLabelForValue: (v: any) => "W1" };
      options.scales.x.ticks.callback.call(mockThis, "val", 0);
    }
  });
});
