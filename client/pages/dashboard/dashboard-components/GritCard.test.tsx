import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GritCard } from "./GritCard";

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: vi.fn(() => ({ settings: {}, theme: "dark" })),
}));

import { act } from "@testing-library/react";

vi.mock("@/utils/useGritScore", () => ({
  useGritScore: vi.fn(),
}));

import { useGritScore } from "@/utils/useGritScore";

describe("GritCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state correctly", async () => {
    (useGritScore as any).mockReturnValue({
      score: undefined,
      weeklyApps: 0,
      followups: 0,
      consistency: 0,
      loading: true,
    });
    
    render(<GritCard />);
    expect(screen.getByText(/Grit Score/i)).toBeDefined();
    expect(screen.queryByText(/Weekly Apps/i)).toBeNull(); // Should render skeleton
  });

  it("renders score and triggers animation", async () => {
    vi.useFakeTimers();

    (useGritScore as any).mockReturnValue({
      score: 55, // Should fall into "Fresh Starter"
      weeklyApps: 5,
      followups: 2,
      consistency: 10,
      loading: false,
    });
    
    render(<GritCard />);
    expect(screen.getByText(/Weekly Apps/i)).toBeDefined();
    
    // Fast forward animation
    act(() => {
      vi.advanceTimersByTime(200); // Trigger the setTimeout delay
      vi.advanceTimersByTime(4200); // Trigger requestAnimationFrame simulation (which might not fully execute but state is changed via mock or timer)
    });

    expect(screen.getAllByText("Fresh Starter").length).toBeGreaterThan(0);
    
    vi.useRealTimers();
  });

  it("handles out of bound scores", async () => {
    (useGritScore as any).mockReturnValue({
      score: 120, // Clamped to 100
      weeklyApps: 10,
      followups: 5,
      consistency: 15,
      loading: false,
    });
    
    render(<GritCard />);
    expect(screen.getByText(/Weekly Apps/i)).toBeDefined();
  });

  it("handles negative scores", async () => {
    (useGritScore as any).mockReturnValue({
      score: -10, // Clamped to 0
      weeklyApps: 0,
      followups: 0,
      consistency: 0,
      loading: false,
    });
    
    render(<GritCard />);
    expect(screen.getByText(/Weekly Apps/i)).toBeDefined();
  });
});
