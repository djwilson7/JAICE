import { describe, it, expect } from "vitest";
import { applyJobChange } from "./applyJobChange";
import type { JobRealtimeEvent } from "@/pages/home/utils/convertToJobCard";
import type { JobCardType } from "@/types/jobCardType";

describe("applyJobChange", () => {
  it("handles INSERT by adding a new card", () => {
    const prev = [{ id: "1", column: "inbox" } as JobCardType];
    const event: JobRealtimeEvent = {
      event: "INSERT",
      payload: { record: { provider_message_id: "2", app_stage: "applied", title: "New Job" } }
    };

    const result = applyJobChange(prev, event);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("2");
    expect(result[0].title).toBe("New Job");
  });

  it("handles UPDATE by modifying an existing card", () => {
    const prev = [{ id: "1", column: "inbox", title: "Old Title" } as JobCardType];
    const event: JobRealtimeEvent = {
      event: "UPDATE",
      payload: { record: { provider_message_id: "1", app_stage: "applied", title: "New Title" } }
    };

    const result = applyJobChange(prev, event);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
    expect(result[0].title).toBe("New Title");
  });

  it("handles UPDATE removing card if archived or deleted", () => {
    const prev = [{ id: "1", column: "inbox" } as JobCardType];
    const event: JobRealtimeEvent = {
      event: "UPDATE",
      payload: { record: { provider_message_id: "1", is_archived: true } }
    };

    const result = applyJobChange(prev, event);
    expect(result).toHaveLength(0);
  });

  it("handles DELETE by removing card", () => {
    const prev = [{ id: "1", column: "inbox" } as JobCardType, { id: "2", column: "applied" } as JobCardType];
    const event: JobRealtimeEvent = {
      event: "DELETE",
      payload: { old: { provider_message_id: "1" } }
    };

    const result = applyJobChange(prev, event);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("returns previous array for unhandled events", () => {
    const prev = [{ id: "1", column: "inbox" } as JobCardType];
    const event: JobRealtimeEvent = { event: "UNKNOWN" };

    const result = applyJobChange(prev, event);
    expect(result).toBe(prev);
  });
});
