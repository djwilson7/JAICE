import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AvgTimeInStageCard } from "./AvgTimeInStageCard";
import { api } from "@/global-services/api";

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: vi.fn(() => ({ settings: {}, theme: "dark" })),
}));

vi.mock("@/global-services/api", () => ({
  api: vi.fn().mockResolvedValue({ data: { applied: 1, interview: 2 } }),
}));

describe("AvgTimeInStageCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly with different times", async () => {
    (api as any).mockResolvedValue({ 
      data: { 
        applied: 0, // 0 hours
        interview: 1.5, // 1 day 12 hours
        offer: 40, // 40 days -> 1 month 10 days
        accepted: 400 // 400 days -> 1 year 1 month 5 days
      } 
    });
    render(<AvgTimeInStageCard />);
    expect(await screen.findByText(/Applied/i)).toBeDefined();
    // It should render "year", "month", "days" based on the parsing
    expect(await screen.findByText(/year/i)).toBeDefined();
  });

  it("handles null values (renders dash)", async () => {
    (api as any).mockResolvedValue({ data: { applied: null } });
    render(<AvgTimeInStageCard />);
    expect(await screen.findAllByText("—")).toBeDefined();
  });

  it("handles missing values", async () => {
    (api as any).mockResolvedValue({ data: {} });
    render(<AvgTimeInStageCard />);
    expect(await screen.findAllByText("—")).toBeDefined();
  });

  it("handles API error", async () => {
    (api as any).mockRejectedValue(new Error("Network Error"));
    render(<AvgTimeInStageCard />);
    expect(await screen.findByText("Network Error")).toBeDefined();
  });

  it("handles empty data state when response data is completely falsy", async () => {
    (api as any).mockResolvedValue({ data: null });
    render(<AvgTimeInStageCard />);
    expect(await screen.findAllByText("—")).toBeDefined(); 
  });
});
