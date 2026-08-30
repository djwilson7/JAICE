import { openGmailMessage } from "./useOpenGmailMessage";
import { auth } from "@/global-services/firebase";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/global-services/firebase", () => ({
  auth: {
    currentUser: {
      email: "test@example.com"
    }
  }
}));

vi.mock("@/global-services/projectMode", () => ({
  IS_DEMO_MODE: false,
}));

describe("openGmailMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', {
      open: vi.fn()
    });
  });

  it("should open gmail message in a new tab if user is logged in", async () => {
    (auth as any).currentUser = { email: "test@example.com" };
    await openGmailMessage("msg123");
    expect(window.open).toHaveBeenCalledWith(
      "https://mail.google.com/mail/u/test@example.com/#inbox/msg123",
      "_blank"
    );
  });

  it("should do nothing if user is not logged in", async () => {
    (auth as any).currentUser = null;
    await openGmailMessage("msg123");
    expect(window.open).not.toHaveBeenCalled();
  });
});
