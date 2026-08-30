import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useDashboardRealtimeRefresh } from "./useDashboardRealtimeRefresh";
import { api } from "@/global-services/api";
import { useJobRealtime } from "@/pages/home/hooks/useJobRealtime";

vi.mock("@/global-services/api", () => ({
  api: vi.fn(),
}));

vi.mock("@/global-components/authContext", () => ({
  useAuth: () => ({ user: { uid: "user1" } }),
}));

vi.mock("@/global-services/projectMode", () => ({
  IS_DEMO_MODE: false,
}));

vi.mock("@/pages/home/hooks/useJobRealtime", () => ({
  useJobRealtime: vi.fn(),
}));

const TestComponent = () => {
  const refreshKey = useDashboardRealtimeRefresh();
  
  return (
    <div>
      <span data-testid="key">{refreshKey}</span>
      <button data-testid="trigger" onClick={() => {
        const handler = (useJobRealtime as any).mock.calls[0][2];
        handler();
      }}>Trigger</button>
    </div>
  );
};

describe("useDashboardRealtimeRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets up token on mount", async () => {
    (api as any).mockResolvedValue({ rls_jwt: "token123" });
    
    render(<TestComponent />);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(api).toHaveBeenCalledWith("/api/auth/setup-frontend-rls-session", { method: "POST" });
  });

  it("handles realtime changes", async () => {
    (api as any).mockResolvedValue({ status: "success" });
    
    render(<TestComponent />);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      screen.getByTestId("trigger").click();
    });

    expect(screen.getByTestId("key").textContent).toBe("1");
  });
});
