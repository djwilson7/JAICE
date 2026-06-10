import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MultiSelectButton } from "./MultiSelectButton";

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: () => ({ settings: { appearance: { kanbanCompact: false } } }),
}));
vi.mock("@/pages/home/hooks/useIsMultiSelecting", () => ({
  useIsMultiSelecting: () => ({ isMultiSelecting: false, setIsMultiSelecting: vi.fn() }),
}));
vi.mock("@/pages/home/hooks/useSelectedJobs", () => ({
  useSelectedJobs: () => ({ selectedJobs: [], setSelectedJobs: vi.fn(), toggleJobSelection: vi.fn() }),
}));

describe("MultiSelectButton", () => {
  it("renders", () => {
    render(<MultiSelectButton />);
    expect(screen.getByRole("button")).toBeTruthy();
  });
});
