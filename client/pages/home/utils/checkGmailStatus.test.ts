import { describe, it, expect, vi } from "vitest";
import { checkGmailStatus } from "./checkGmailStatus";
import { api } from "@/global-services/api";

vi.mock("@/global-services/api", () => ({
  api: vi.fn(),
}));

describe("checkGmailStatus", () => {
  it("sets connected state when api succeeds", async () => {
    vi.mocked(api).mockResolvedValueOnce({ isConnected: true });
    
    const setGmailConnected = vi.fn();
    const setGmailError = vi.fn();

    await checkGmailStatus({ setGmailConnected, setGmailError });

    expect(api).toHaveBeenCalledWith("/api/auth/gmail-consent-status");
    expect(setGmailConnected).toHaveBeenCalledWith(true);
    expect(setGmailError).toHaveBeenCalledWith(null);
  });

  it("sets error state when api fails", async () => {
    vi.mocked(api).mockRejectedValueOnce(new Error("Network Error"));
    
    const setGmailConnected = vi.fn();
    const setGmailError = vi.fn();

    await checkGmailStatus({ setGmailConnected, setGmailError });

    expect(api).toHaveBeenCalledWith("/api/auth/gmail-consent-status");
    expect(setGmailConnected).toHaveBeenCalledWith(false);
    expect(setGmailError).toHaveBeenCalledWith("Error checking gmail status.");
  });
});
