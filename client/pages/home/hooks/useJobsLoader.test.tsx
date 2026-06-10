import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useJobsLoader } from "./useJobsLoader";
import { api } from "@/global-services/api";
import { useBannerNotifications } from "@/global-components/bannerNotificationContext";

vi.mock("@/global-services/api", () => ({
  api: vi.fn(),
}));

vi.mock("@/global-components/bannerNotificationContext", () => ({
  useBannerNotifications: vi.fn(),
}));

const TestComponent = () => {
  const { jobs, isLoading, reloadJobs } = useJobsLoader();
  
  return (
    <div>
      <span data-testid="loading">{isLoading.toString()}</span>
      <span data-testid="count">{jobs.length}</span>
      <button data-testid="reload" onClick={reloadJobs}>Reload</button>
    </div>
  );
};

describe("useJobsLoader", () => {
  const showBanner = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useBannerNotifications as any).mockReturnValue({ showBanner });
  });

  it("loads jobs successfully on mount", async () => {
    (api as any).mockImplementation((url: string) => {
      if (url === "/api/jobs/latest-jobs") {
        return Promise.resolve({ status: "success", jobs: [{ id: "1", title: "Job 1" }] });
      }
      if (url === "/api/gmail/sync-now") {
        return Promise.resolve({});
      }
      return Promise.resolve({});
    });

    render(<TestComponent />);
    
    // initially loading is true but effect runs immediately
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(screen.getByTestId("loading").textContent).toBe("false");
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(api).toHaveBeenCalledWith("/api/jobs/latest-jobs");
    expect(api).toHaveBeenCalledWith("/api/gmail/sync-now", { method: "POST" });
  });

  it("handles load error", async () => {
    (api as any).mockRejectedValue(new Error("Network Error"));
    
    render(<TestComponent />);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(screen.getByTestId("loading").textContent).toBe("false");
    expect(showBanner).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }));
  });

  it("handles reload jobs manually", async () => {
    (api as any).mockImplementation((url: string) => {
      if (url === "/api/jobs/latest-jobs") {
        return Promise.resolve({ status: "success", jobs: [{ id: "1", title: "Job 1" }] });
      }
      return Promise.resolve({});
    });

    render(<TestComponent />);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    (api as any).mockImplementation((url: string) => {
      if (url === "/api/jobs/latest-jobs") {
        return Promise.resolve({ status: "success", jobs: [{ id: "1" }, { id: "2" }] });
      }
      return Promise.resolve({});
    });

    await act(async () => {
      screen.getByTestId("reload").click();
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.getByTestId("count").textContent).toBe("2");
  });

  it("handles api response with error status", async () => {
    (api as any).mockResolvedValue({ status: "error" });
    
    render(<TestComponent />);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(showBanner).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }));
  });

  it("handles gmail sync error silently", async () => {
    (api as any).mockImplementation((url: string) => {
      if (url === "/api/jobs/latest-jobs") {
        return Promise.resolve({ status: "success", jobs: [] });
      }
      if (url === "/api/gmail/sync-now") {
        return Promise.reject(new Error("Sync fail"));
      }
      return Promise.resolve({});
    });

    render(<TestComponent />);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Should still load jobs and not show banner (sync error is caught and logged only)
    expect(screen.getByTestId("loading").textContent).toBe("false");
    expect(showBanner).not.toHaveBeenCalled();
  });
});
