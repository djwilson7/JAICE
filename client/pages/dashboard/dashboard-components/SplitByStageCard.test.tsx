import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { SplitByStageCard } from "./SplitByStageCard";
import { api } from "@/global-services/api";

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: vi.fn(() => ({ settings: {}, theme: "dark" })),
}));

vi.mock("@/global-services/api", () => ({
  api: vi.fn().mockResolvedValue({ data: { labels: ["2026-06"], stage_counts: { applied: [1] } } }),
}));

let capturedBarProps: any = null;

vi.mock("react-chartjs-2", () => ({
  Bar: (props: any) => {
    capturedBarProps = props;
    return <div data-testid="bar-chart">Bar Chart</div>;
  },
}));

describe("SplitByStageCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedBarProps = null;
  });

  it("renders correctly", async () => {
    (api as any).mockResolvedValue({ data: { labels: ["2026-06"], stage_counts: { applied: [1] } } });
    render(<SplitByStageCard />);
    expect(await screen.findByTestId("bar-chart")).toBeDefined();
  });

  it("handles empty state", async () => {
    (api as any).mockResolvedValue({ data: { labels: [], stage_counts: {} } });
    render(<SplitByStageCard />);
    expect(await screen.findByText("No applications to display yet.")).toBeDefined();
  });

  it("handles API failure", async () => {
    (api as any).mockRejectedValue(new Error("Network fail"));
    render(<SplitByStageCard />);
    expect(await screen.findByText("Network fail")).toBeDefined();
  });

  it("exercises chart configuration callbacks", async () => {
    (api as any).mockResolvedValue({ data: { labels: ["2026-06"], stage_counts: { applied: [1] } } });
    render(<SplitByStageCard />);
    await screen.findByTestId("bar-chart");

    const options = capturedBarProps?.options;
    expect(options).toBeDefined();

    if (options.plugins?.tooltip?.external) {
      const mockContext = {
        chart: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) } },
        tooltip: {
          opacity: 1,
          caretX: 10,
          caretY: 10,
          title: ["Title"],
          dataPoints: [{ label: "Interview", parsed: { y: 2 }, dataset: { label: "Interview", borderColor: "blue" } }]
        }
      };
      options.plugins.tooltip.external(mockContext as any);
      
      const mockContextHide = { ...mockContext, tooltip: { ...mockContext.tooltip, opacity: 0 } };
      options.plugins.tooltip.external(mockContextHide as any);
    }
  });
});
