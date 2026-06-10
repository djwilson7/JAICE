import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobCardContent } from "./JobCardContent";

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: () => ({ settings: { appearance: { kanbanCompact: false } } }),
}));
vi.mock("@/pages/home/hooks/useJobCard", () => ({
  useJobCard: () => ({ job: { id: "1", title: "Test Job" } }),
}));

describe("JobCardContent", () => {
  it("renders", () => {
    const { container } = render(<JobCardContent isOpen={true} job={{ id: "1", description: "Test Description" } as any} />);
    expect(container).toBeTruthy();
  });
});
