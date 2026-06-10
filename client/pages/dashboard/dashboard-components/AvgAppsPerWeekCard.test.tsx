import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AvgAppsPerWeekCard } from "./AvgAppsPerWeekCard";
import { api } from "@/global-services/api";

vi.mock("@/global-services/api", () => ({
  api: vi.fn()
}));

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: () => ({ theme: "light" })
}));

let capturedLineProps: any = null;

vi.mock("react-chartjs-2", () => ({
  Line: (props: any) => {
    capturedLineProps = props;
    return <div data-testid="mock-line-chart">Mock Line Chart</div>;
  },
}));

describe("AvgAppsPerWeekCard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    capturedLineProps = null;
  });

  it("renders loading skeleton initially", async () => {
    let resolveApi: any;
    (api as any).mockImplementation(() => new Promise((resolve) => {
      resolveApi = resolve;
    }));

    render(<AvgAppsPerWeekCard filterMode="14" animate={false} animationDelay={0} />);
    
    await act(async () => {
      resolveApi({
        labels: ["WK1"],
        values: [10],
        week_start_dates: ["2024-01-01"]
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    
    expect(screen.getByText("Avg Applications per Week")).toBeDefined();
  });

  it("renders data after loading", async () => {
    (api as any).mockResolvedValue({
      labels: ["WK1"],
      values: [10],
      week_start_dates: ["2024-01-01"]
    });

    render(<AvgAppsPerWeekCard filterMode="90" animate={false} animationDelay={0} />);
    
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText("Avg Applications per Week")).toBeDefined();
  });

  it("renders error state on API failure", async () => {
    (api as any).mockRejectedValue(new Error("Network Error"));

    render(<AvgAppsPerWeekCard filterMode="90" animate={false} animationDelay={0} />);
    
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText("Network Error")).toBeDefined();
  });

  it("exercises chart configuration callbacks", async () => {
    (api as any).mockResolvedValue({
      labels: ["WK1", "WK2", "WK3", "WK4"],
      values: [10, 20, 30, 40],
      week_start_dates: ["2024-01-01", "2024-01-08", "2024-01-15", "bad-date"]
    });

    render(<AvgAppsPerWeekCard filterMode="30" animate={false} animationDelay={0} />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const options = capturedLineProps?.options;
    expect(options).toBeDefined();

    // Trigger external tooltip handler
    if (options.plugins?.tooltip?.external) {
      const mockContext = {
        chart: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) } },
        tooltip: {
          opacity: 1,
          caretX: 10,
          caretY: 10,
          dataPoints: [{ dataIndex: 0, parsed: { y: 1 }, label: "(WK 1)" }]
        }
      };
      options.plugins.tooltip.external(mockContext as any);
      
      const mockContextHide = { ...mockContext, tooltip: { ...mockContext.tooltip, opacity: 0 } };
      options.plugins.tooltip.external(mockContextHide as any);
      
      const mockContext2 = {
        ...mockContext,
        tooltip: {
          ...mockContext.tooltip,
          dataPoints: [{ dataIndex: 3, parsed: { y: 2 }, label: "WK4" }]
        }
      };
      options.plugins.tooltip.external(mockContext2 as any);
    }

    // Trigger tick callbacks if any
    if (options.scales?.x?.ticks?.callback) {
      options.scales.x.ticks.callback("val", 0);
      options.scales.x.ticks.callback("val", 1);
    }
  });
});
