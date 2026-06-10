import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/global-services/api";

import { useDashboardRealtimeRefresh } from "../../dashboard/hooks/useDashboardRealtimeRefresh";
import { useArchiveActions } from "./useArchiveActions";
import { useJobSearchAndSort } from "./useJobSearchAndSort";
import { useKanbanColumns } from "./useKanbanColumns";
import { openGmailMessage } from "./useOpenGmailMessage";
import { useTrashActions } from "./useTrashActions";

vi.mock("@/global-services/api", () => ({
  api: vi.fn()
}));

vi.mock("@/global-components/bannerNotificationContext", () => ({
  useBannerNotifications: () => ({ showBanner: vi.fn() })
}));

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: () => ({ theme: "light" })
}));

describe("Bulk hooks coverage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("useDashboardRealtimeRefresh", () => {
    const { result } = renderHook(() => useDashboardRealtimeRefresh(vi.fn()));
    expect(result.current).toBeDefined();
  });

  it("useArchiveActions", async () => {
    (api as any).mockResolvedValue({ status: "success" });
    const { result } = renderHook(() => useArchiveActions({ onUnarchive: vi.fn() }));
    await act(async () => {
      await result.current.handleAction("unarchive", ["1"]);
      await result.current.handleAction("delete", ["1"]);
    });
  });

  it("useJobSearchAndSort", () => {
    const { result } = renderHook(() => useJobSearchAndSort([]));
    act(() => {
      result.current.setSearchQuery("test");
      result.current.setSortOption("Date Added");
    });
  });

  it("useKanbanColumns", () => {
    const { result } = renderHook(() => useKanbanColumns([]));
    expect(result.current.columns).toBeDefined();
  });

  it("openGmailMessage", () => {
    act(() => {
      openGmailMessage("msgId");
    });
  });

  it("useTrashActions", async () => {
    (api as any).mockResolvedValue({ status: "success", jobs: [] });
    const { result } = renderHook(() => useTrashActions({ onRestore: vi.fn() }));
    
    await act(async () => {
      await result.current.open();
    });
    
    act(() => {
      result.current.close();
    });

    await act(async () => {
      await result.current.handleAction("undelete", ["1"]);
      await result.current.handleAction("delete_permanently", ["1"]);
      await result.current.handleAction("archive", ["1"]);
    });
  });
});
