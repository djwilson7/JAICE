import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { api } from "@/global-services/api";
import { useJobRealtime } from "@/pages/home/hooks/useJobRealtime";
import { useDashboardRealtimeRefresh } from "./useDashboardRealtimeRefresh";

vi.mock("@/global-services/projectMode", () => ({
  IS_DEMO_MODE: true,
}));

vi.mock("@/global-components/authContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/global-services/api", () => ({
  api: vi.fn(),
}));

vi.mock("@/pages/home/hooks/useJobRealtime", () => ({
  useJobRealtime: vi.fn(),
}));

describe("useDashboardRealtimeRefresh in demo mode", () => {
  it("does not request a realtime token", () => {
    const { result } = renderHook(() => useDashboardRealtimeRefresh());

    expect(result.current).toBe(0);
    expect(api).not.toHaveBeenCalled();
    expect(useJobRealtime).toHaveBeenCalledWith("", null, expect.any(Function));
  });
});
