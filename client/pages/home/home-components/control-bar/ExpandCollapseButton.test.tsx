import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExpandCollapseButton } from "./ExpandCollapseButton";

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: () => ({ settings: { appearance: { kanbanExpanded: false } }, setSettings: vi.fn() }),
}));

vi.mock("@/pages/home/hooks/useJobCard", () => ({
  useJobCard: () => ({ job: { id: "1" } }),
}));

describe("ExpandCollapseButton", () => {
  it("renders", () => {
    const { container } = render(<ExpandCollapseButton />);
    expect(container).toBeTruthy();
  });
});
