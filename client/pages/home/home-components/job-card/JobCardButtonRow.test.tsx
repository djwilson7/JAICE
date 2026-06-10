import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobCardButtonRow } from "./JobCardButtonRow";

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: () => ({ settings: { appearance: { kanbanCompact: false } } }),
}));
vi.mock("@/pages/home/hooks/useJobAction", () => ({
  useJobActions: () => ({ archiveJob: vi.fn(), deleteJob: vi.fn(), reviewJob: vi.fn(), restoreJob: vi.fn() }),
}));
vi.mock("@/pages/home/contexts/JobCardContext", () => ({
  JobCardContext: React.createContext({ job: { id: "1" } }),
}));

vi.mock("@/pages/home/hooks/useDrag", () => ({
  useDrag: () => ({ isDragging: false }),
}));

describe("JobCardButtonRow", () => {
  it("renders", () => {
    const { container } = render(<JobCardButtonRow />);
    expect(container).toBeTruthy();
  });
});
