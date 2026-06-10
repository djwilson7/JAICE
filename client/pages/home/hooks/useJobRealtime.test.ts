import { renderHook } from "@testing-library/react";
import { useJobRealtime } from "./useJobRealtime";
import { createClient } from "@supabase/supabase-js";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

describe("useJobRealtime", () => {
  const userId = "test-user-id";
  const rlsToken = "test-token";
  const onChange = vi.fn();

  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };

  const mockSupabase = {
    realtime: {
      setAuth: vi.fn(),
    },
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockReturnValue(mockSupabase);
    
    // Mock import.meta.env
    vi.stubGlobal('import', {
      meta: {
        env: {
          VITE_SUPABASE_URL: 'http://localhost:54321',
          VITE_SUPABASE_ANON_KEY: 'anon-key',
        }
      }
    });
  });

  it("should not initialize if rlsToken is missing", () => {
    renderHook(() => useJobRealtime(userId, null, onChange));
    expect(createClient).not.toHaveBeenCalled();
  });

  it("should not subscribe if userId is missing", () => {
    renderHook(() => useJobRealtime("", rlsToken, onChange));
    expect(mockSupabase.channel).not.toHaveBeenCalled();
  });

  it("should initialize supabase and subscribe to channel", () => {
    renderHook(() => useJobRealtime(userId, rlsToken, onChange));

    expect(createClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        global: { headers: { Authorization: `Bearer ${rlsToken}` } },
      })
    );
    expect(mockSupabase.realtime.setAuth).toHaveBeenCalledWith(rlsToken);
    expect(mockSupabase.channel).toHaveBeenCalledWith(`user:${userId}:job_applications`, {
      config: { private: true },
    });
    expect(mockChannel.on).toHaveBeenCalledWith("broadcast", { event: "*" }, expect.any(Function));
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it("should call onChange when a broadcast is received", () => {
    renderHook(() => useJobRealtime(userId, rlsToken, onChange));

    const broadcastHandler = mockChannel.on.mock.calls[0][2];
    const payload = { event: "INSERT", new: { id: 1 } };
    broadcastHandler(payload);

    expect(onChange).toHaveBeenCalledWith(payload);
  });

  it("should handle channel status changes", () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderHook(() => useJobRealtime(userId, rlsToken, onChange));

    const subscribeHandler = mockChannel.subscribe.mock.calls[0][0];
    
    subscribeHandler("SUBSCRIBED");
    expect(consoleSpy).not.toHaveBeenCalled();

    subscribeHandler("CLOSED");
    expect(consoleSpy).toHaveBeenCalledWith("Realtime channel dropped, attempting reconnect...");

    subscribeHandler("TIMED_OUT");
    expect(consoleSpy).toHaveBeenCalledTimes(2);

    consoleSpy.mockRestore();
  });

  it("should cleanup on unmount", () => {
    const { unmount } = renderHook(() => useJobRealtime(userId, rlsToken, onChange));
    unmount();
    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });
});
