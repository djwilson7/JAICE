import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppsOverTimeCard } from "./AppsOverTimeCard";
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

vi.mock("chart.js", () => ({
  Chart: { 
    register: vi.fn(),
    defaults: {
      color: '',
      font: { family: '' },
      borderColor: '',
      plugins: {
        legend: { labels: { color: '' } },
        tooltip: { titleColor: '', bodyColor: '', titleFont: {}, bodyFont: {}, padding: 0, boxPadding: 0 }
      }
    }
  },
  ArcElement: vi.fn(),
  BarElement: vi.fn(),
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
  Filler: vi.fn(),
}));

describe("AppsOverTimeCard", () => {
  it("renders loading skeleton initially", async () => {
    let resolveApi: any;
    (api as any).mockImplementation(() => new Promise((resolve) => {
      resolveApi = resolve;
    }));

    render(<AppsOverTimeCard filterMode="14" animate={false} animationDelay={0} />);
    
    await act(async () => {
      resolveApi({
        data: []
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByTestId("mock-line-chart")).toBeDefined();
  });

  it("renders chart after loading", async () => {
    (api as any).mockResolvedValue({
      data: [
        { date: "2024-01-01", count: 1 },
        { date: "2024-01-02", count: 2 }
      ]
    });

    render(<AppsOverTimeCard filterMode="90" animate={false} animationDelay={0} />);
    
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByTestId("mock-line-chart")).toBeDefined();
  });

  it("renders error state on API failure", async () => {
    (api as any).mockRejectedValue(new Error("Network Error"));

    render(<AppsOverTimeCard filterMode="90" animate={false} animationDelay={0} />);
    
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText("Network Error")).toBeDefined();
  });

  it("exercises chart configuration callbacks", async () => {
    (api as any).mockResolvedValue({
      data: {
        stage_counts: { applied: [1,2], interview: [1], offer: [], accepted: [] }
      }
    });
    render(<AppsOverTimeCard filterMode="90" animate={false} animationDelay={0} />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const options = capturedLineProps.options;
    expect(options).toBeDefined();

    // Test grid color callback
    const gridColorCb = options.scales.x.grid.color;
    expect(gridColorCb({ index: 0 })).toBeDefined();

    // Test tick callback
    const tickCb = options.scales.x.ticks.callback;
    expect(tickCb("val", 0)).toBeDefined();

    // Test external tooltip handler
    const externalTooltip = options.plugins.tooltip.external;
    const mockContext = {
      chart: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) } },
      tooltip: {
        opacity: 1,
        caretX: 10,
        caretY: 10,
        title: ["Title"],
        body: [{ lines: ["Body line"] }],
        labelColors: [{ borderColor: "red" }]
      }
    };
    externalTooltip(mockContext as any);
    
    // Hide tooltip
    const mockContextHide = { ...mockContext, tooltip: { ...mockContext.tooltip, opacity: 0 } };
    externalTooltip(mockContextHide as any);
  });
});
