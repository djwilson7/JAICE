import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ConnectEmailButton } from "./ConnectEmailButton";
import { checkGmailStatus } from "@/pages/home/utils/checkGmailStatus";

vi.mock("@/global-services/projectMode", () => ({
  IS_DEMO_MODE: false,
}));

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: () => ({ settings: { appearance: { kanbanCompact: false } } }),
}));

vi.mock("@/pages/home/utils/checkGmailStatus", () => ({
  checkGmailStatus: vi.fn(),
}));

describe("ConnectEmailButton", () => {
  it("checks status and opens the connection modal in dev mode", () => {
    const setIsOpen = vi.fn();
    render(<ConnectEmailButton setIsOpen={setIsOpen} />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-disabled", "false");
    expect(checkGmailStatus).toHaveBeenCalledOnce();

    fireEvent.click(button);
    expect(setIsOpen).toHaveBeenCalledWith(true);
  });
});
