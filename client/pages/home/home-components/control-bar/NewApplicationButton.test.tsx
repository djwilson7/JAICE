import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NewApplicationButton } from "./NewApplicationButton";

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: () => ({ settings: { appearance: { kanbanCompact: false } } }),
}));

describe("NewApplicationButton", () => {
  it("renders", () => {
    render(<NewApplicationButton onClick={vi.fn()} />);
    expect(screen.getByRole("button")).toBeTruthy();
  });
});
