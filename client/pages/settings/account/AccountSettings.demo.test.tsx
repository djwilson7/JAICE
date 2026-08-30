import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { api } from "@/global-services/api";
import { checkGmailStatus } from "@/pages/home/utils/checkGmailStatus";
import { AccountSettings } from "./AccountSettings";

const authModuleLoaded = vi.hoisted(() => vi.fn());
const applyProfileUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/global-services/projectMode", () => ({ IS_DEMO_MODE: true }));

vi.mock("@/global-services/api", () => ({ api: vi.fn() }));

vi.mock("@/global-services/auth", () => {
  authModuleLoaded();
  return { getIdToken: vi.fn(), logOut: vi.fn() };
});

vi.mock("@/global-components/authContext", () => ({
  useAuth: () => ({
    user: { displayName: "Demo User", photoURL: null },
    applyProfileUpdate,
  }),
}));

vi.mock("@/pages/home/utils/checkGmailStatus", () => ({
  checkGmailStatus: vi.fn(),
}));

describe("AccountSettings in demo mode", () => {
  it("renders account controls without initializing or mutating external services", () => {
    render(
      <MemoryRouter>
        <AccountSettings />
      </MemoryRouter>
    );

    expect(screen.getByLabelText("First Name")).toBeDisabled();
    expect(screen.getByLabelText("Last Name")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Change Photo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Update Profile" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Unlink Gmail" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete Account" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Unlink Gmail" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Account" }));

    expect(checkGmailStatus).not.toHaveBeenCalled();
    expect(api).not.toHaveBeenCalled();
    expect(applyProfileUpdate).not.toHaveBeenCalled();
    expect(authModuleLoaded).not.toHaveBeenCalled();
  });
});
