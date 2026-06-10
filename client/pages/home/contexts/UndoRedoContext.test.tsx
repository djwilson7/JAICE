import { describe, it, expect } from "vitest";
import { UndoRedoContext } from "./UndoRedoContext";

describe("UndoRedoContext", () => {
  it("exports a context object", () => {
    expect(UndoRedoContext).toBeTruthy();
  });

  it("default value is null", () => {
    expect(UndoRedoContext._currentValue).toBeNull();
  });
});
