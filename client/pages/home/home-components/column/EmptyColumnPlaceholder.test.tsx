import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyColumnPlaceholder } from "./EmptyColumnPlaceholder";

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: () => ({ settings: { appearance: { kanbanCompact: false } } }),
}));

describe("EmptyColumnPlaceholder", () => {
  it("renders without crashing", () => {
    render(<EmptyColumnPlaceholder title="Applied" />);
    expect(screen.getByText(/No applied emails/i)).toBeTruthy();
  });
});
