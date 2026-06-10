import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import AuthProvider from "./AuthProvider";
import { observeUser } from "../global-services/auth";
import { updateProfile } from "firebase/auth";
import React from "react";
import { useAuth } from "./authContext";

vi.mock("../global-services/auth", () => ({
  observeUser: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  updateProfile: vi.fn(),
}));

const TestConsumer = () => {
  const { user, loading, applyProfileUpdate } = useAuth();
  if (loading) return <div>Loading...</div>;
  return (
    <div>
      <div data-testid="user">{user?.email || "No User"}</div>
      <button data-testid="update-btn" onClick={() => applyProfileUpdate("New Name", "new-photo-url")}>Update</button>
    </div>
  );
};

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially and then user data", async () => {
    let userCb: any;
    (observeUser as any).mockImplementation((cb: any) => {
      userCb = cb;
      return () => {};
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    await act(async () => {
      userCb({ uid: "123", email: "test@example.com", reload: vi.fn().mockResolvedValue({}) });
    });

    expect(screen.getByTestId("user")).toHaveTextContent("test@example.com");
  });

  it("handles null user from observer", async () => {
    let userCb: any;
    (observeUser as any).mockImplementation((cb: any) => {
      userCb = cb;
      return () => {};
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      userCb(null);
    });

    expect(screen.getByTestId("user")).toHaveTextContent("No User");
  });

  it("successfully updates profile", async () => {
    const reloadMock = vi.fn().mockResolvedValue({});
    const mockUser = { uid: "123", email: "test@example.com", reload: reloadMock };
    let userCb: any;
    (observeUser as any).mockImplementation((cb: any) => {
      userCb = cb;
      return () => {};
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      userCb(mockUser);
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("update-btn"));
    });

    expect(updateProfile).toHaveBeenCalledWith(mockUser, {
      displayName: "New Name",
      photoURL: "new-photo-url",
    });
    expect(reloadMock).toHaveBeenCalled();
  });

  it("throws error when updating profile with no user", async () => {
    let userCb: any;
    (observeUser as any).mockImplementation((cb: any) => {
      userCb = cb;
      return () => {};
    });

    let capturedError: any;
    const ErrorThrower = () => {
        const { applyProfileUpdate } = useAuth();
        return <button data-testid="fail-btn" onClick={() => applyProfileUpdate("x").catch(e => capturedError = e)}>Fail</button>;
    }

    render(
      <AuthProvider>
        <ErrorThrower />
      </AuthProvider>
    );

    await act(async () => {
      userCb(null);
    });

    await act(async () => {
        fireEvent.click(screen.getByTestId("fail-btn"));
    });

    expect(capturedError.message).toBe("No user is currently logged in.");
  });

  it("handles errors during updateProfile", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockUser = { uid: "123", email: "test@example.com", reload: vi.fn() };
    let userCb: any;
    (observeUser as any).mockImplementation((cb: any) => {
      userCb = cb;
      return () => {};
    });

    (updateProfile as any).mockRejectedValue(new Error("Update failed"));

    let capturedError: any;
    const ErrorWrapper = () => {
        const { applyProfileUpdate } = useAuth();
        return <button data-testid="update-btn" onClick={() => applyProfileUpdate("n").catch(e => capturedError = e)}>Update</button>;
    };

    render(
      <AuthProvider>
        <ErrorWrapper />
      </AuthProvider>
    );

    await act(async () => {
      userCb(mockUser);
    });

    await act(async () => {
        fireEvent.click(screen.getByTestId("update-btn"));
    });

    expect(capturedError.message).toBe("Update failed");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
