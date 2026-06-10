import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConnectEmailButton } from "./ConnectEmailButton";

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: () => ({ settings: { appearance: { kanbanCompact: false } } }),
}));

vi.mock("@/pages/home/utils/checkGmailStatus", () => ({
  checkGmailStatus: vi.fn(),
}));

describe("ConnectEmailButton", () => {
  it("renders", () => {
    render(<ConnectEmailButton setIsOpen={vi.fn()} />);
    expect(screen.getByRole("button")).toBeTruthy();
  });
});
