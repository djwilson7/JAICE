import { describe, it, expect, vi } from "vitest";
import { convertToJobCard, convertToJobCardArray, convertBroadcastToJobCard, RawJobApplication, JobRealtimeEvent } from "./convertToJobCard";

// Mock convertTime
vi.mock("@/pages/home/utils/convertTime", () => ({
  convertTime: vi.fn((date) => (date ? "Mocked Date" : undefined)),
}));

describe("convertToJobCard", () => {
  it("converts raw job correctly", () => {
    const rawJob: RawJobApplication = {
      provider_message_id: "msg-1",
      title: "Software Engineer",
      company_name: "Tech Corp",
      salary: 100000,
      app_stage: "inbox",
      needs_review: true,
      recently_added: true,
      received_at: "2023-10-01",
    };

    const result = convertToJobCard(rawJob);

    expect(result.id).toBe("msg-1");
    expect(result.title).toBe("Software Engineer");
    expect(result.companyName).toBe("Tech Corp");
    expect(result.salary).toBe(100000);
    expect(result.column).toBe("inbox");
    expect(result.reviewNeeded).toBe(true);
    expect(result.recentlyAdded).toBe(true);
    expect(result.date).toBe("Mocked Date");
  });

  it("handles empty fields and defaults", () => {
    const rawJob: RawJobApplication = {};
    const result = convertToJobCard(rawJob);

    expect(result.id).toBe("undefined");
    expect(result.title).toBe("No Title");
    expect(result.column).toBe("applied");
    expect(result.reviewNeeded).toBe(false);
    expect(result.recentlyAdded).toBe(false);
  });

  describe("convertToJobCardArray", () => {
    it("converts an array of raw jobs", () => {
      const result = convertToJobCardArray([{ provider_message_id: "1" }, { provider_message_id: "2" }]);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("1");
      expect(result[1].id).toBe("2");
    });

    it("handles empty input", () => {
      expect(convertToJobCardArray()).toEqual([]);
    });
  });

  describe("convertBroadcastToJobCard", () => {
    it("returns null if no event record or provider_message_id", () => {
      expect(convertBroadcastToJobCard({} as JobRealtimeEvent)).toBeNull();
      expect(convertBroadcastToJobCard({ payload: { record: {} } } as JobRealtimeEvent)).toBeNull();
    });

    it("converts payload correctly", () => {
      const event: JobRealtimeEvent = {
        payload: {
          record: {
            provider_message_id: "bcast-1",
            title: "Broadcast Job",
            app_stage: "applied",
          }
        }
      };

      const result = convertBroadcastToJobCard(event);
      expect(result).not.toBeNull();
      expect(result?.id).toBe("bcast-1");
      expect(result?.title).toBe("Broadcast Job");
      expect(result?.column).toBe("applied");
    });
  });
});
