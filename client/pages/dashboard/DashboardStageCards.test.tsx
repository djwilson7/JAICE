import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ApplicationsByStageCard, SplitByStageCard } from "./DashboardStageCards";

describe("DashboardStageCards", () => {
  it("renders ApplicationsByStageCard correctly", () => {
    render(<ApplicationsByStageCard />);
    expect(screen.getByText("Applications by Stage")).toBeDefined();
    expect(screen.getByText("Applied")).toBeDefined();
    expect(screen.getByText("Interview")).toBeDefined();
    expect(screen.getByText("Offer")).toBeDefined();
    expect(screen.getByText("Accepted")).toBeDefined();
  });

  it("renders SplitByStageCard correctly", () => {
    render(<SplitByStageCard />);
    expect(screen.getByText("Split by Stage")).toBeDefined();
    expect(screen.getByText("Applied")).toBeDefined();
    expect(screen.getByText("Interview")).toBeDefined();
    expect(screen.getByText("Offer")).toBeDefined();
    expect(screen.getByText("Accepted")).toBeDefined();
  });
});
