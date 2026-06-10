import { describe, it, expect } from "vitest";
import { kanBanColumns } from "./KanBanColumn";

describe("KanBanColumn", () => {
  it("exists", () => {
    expect(kanBanColumns.length).toBeGreaterThan(0);
  });
});
