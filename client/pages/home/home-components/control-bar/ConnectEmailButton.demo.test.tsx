import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ConnectEmailButton } from "./ConnectEmailButton";
import { checkGmailStatus } from "@/pages/home/utils/checkGmailStatus";

vi.mock("@/global-services/projectMode", () => ({
  IS_DEMO_MODE: true,
}));

vi.mock("@/pages/home/utils/checkGmailStatus", () => ({
  checkGmailStatus: vi.fn(),
}));

describe("ConnectEmailButton in demo mode", () => {
  it("cannot check Gmail status or open the connection modal", () => {
    const setIsOpen = vi.fn();
    render(<ConnectEmailButton setIsOpen={setIsOpen} />);

    const button = screen.getByRole("button", { name: "Connected" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("tabindex", "-1");
    expect(checkGmailStatus).not.toHaveBeenCalled();

    fireEvent.click(button);
    expect(setIsOpen).not.toHaveBeenCalled();
  });
});
