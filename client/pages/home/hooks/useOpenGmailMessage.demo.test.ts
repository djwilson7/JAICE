import { describe, expect, it, vi } from "vitest";

const firebaseModuleLoaded = vi.hoisted(() => vi.fn());

vi.mock("@/global-services/projectMode", () => ({
  IS_DEMO_MODE: true,
}));

vi.mock("@/global-services/firebase", () => {
  firebaseModuleLoaded();
  return { auth: { currentUser: { email: "test@example.com" } } };
});

import { openGmailMessage } from "./useOpenGmailMessage";

describe("openGmailMessage in demo mode", () => {
  it("does not initialize Firebase or open Gmail", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    await openGmailMessage("message-id");

    expect(firebaseModuleLoaded).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
  });
});
