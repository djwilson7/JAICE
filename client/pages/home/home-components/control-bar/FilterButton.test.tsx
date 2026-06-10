import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FilterButton } from "./FilterButton";

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: () => ({ settings: { appearance: { kanbanCompact: false } } }),
}));

describe("FilterButton", () => {
  it("renders", () => {
    render(<FilterButton selectedOption="default" setSelectedOption={vi.fn()} />);
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });
});
