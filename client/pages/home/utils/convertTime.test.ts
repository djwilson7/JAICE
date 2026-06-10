import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { convertTime } from "./convertTime";

describe("convertTime", () => {
  beforeAll(() => {
    // Mock the timezone so output is consistent across environments
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockImplementation(
      () => ({ timeZone: "UTC" } as any)
    );
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns undefined for falsy inputs", () => {
    expect(convertTime(null)).toBeUndefined();
    expect(convertTime(undefined)).toBeUndefined();
    expect(convertTime("")).toBeUndefined();
  });

  it("returns undefined for invalid strings", () => {
    expect(convertTime("invalid-date-string")).toBeUndefined();
  });

  it("handles valid ISO format strings", () => {
    // 2023-10-01T12:00:00Z in UTC should be "Oct 1, 2023, 12:00 PM"
    expect(convertTime("2023-10-01T12:00:00Z")).toBe("Oct 1, 2023, 12:00 PM");
  });

  it("handles ms strings", () => {
    // 1696161600000 is 2023-10-01T12:00:00.000Z
    expect(convertTime("1696161600000")).toBe("Oct 1, 2023, 12:00 PM");
  });

  it("handles number timestamp", () => {
    expect(convertTime(1696161600000)).toBe("Oct 1, 2023, 12:00 PM");
  });
});
