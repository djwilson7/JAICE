import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useRealtimeJobs } from "./useRealTimeJobs";
import { api } from "@/global-services/api";
import { useJobRealtime } from "@/pages/home/hooks/useJobRealtime";

vi.mock("@/global-services/api", () => ({
  api: vi.fn(),
}));

vi.mock("@/pages/home/hooks/useJobRealtime", () => ({
  useJobRealtime: vi.fn(),
}));

const TestComponent = ({ userId }: { userId: string }) => {
  const setJobs = vi.fn();
  const { newJobsCount, resetNewJobsCount } = useRealtimeJobs(userId, setJobs);
  
  return (
    <div>
      <span data-testid="count">{newJobsCount}</span>
      <button data-testid="reset" onClick={resetNewJobsCount}>Reset</button>
      <button data-testid="trigger" onClick={() => {
        const handler = (useJobRealtime as any).mock.calls[0][2];
        handler({ type: "INSERT" });
      }}>Trigger</button>
    </div>
  );
};

describe("useRealtimeJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets up token on mount", async () => {
    (api as any).mockResolvedValue({ rls_jwt: "token123" });
    
    render(<TestComponent userId="user1" />);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(api).toHaveBeenCalledWith("/api/auth/setup-frontend-rls-session", { method: "POST" });
  });

  it("handles realtime changes", async () => {
    (api as any).mockResolvedValue({ status: "success", jobs: [] });
    
    render(<TestComponent userId="user1" />);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      screen.getByTestId("trigger").click();
    });

    expect(screen.getByTestId("count").textContent).toBe("1");

    await act(async () => {
      screen.getByTestId("reset").click();
    });

    expect(screen.getByTestId("count").textContent).toBe("0");
  });
});
