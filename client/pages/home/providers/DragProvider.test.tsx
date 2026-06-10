import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DragProvider } from "./DragProvider";

describe("DragProvider", () => {
  it("renders children", () => {
    render(
      <DragProvider>
        <div data-testid="child">Child</div>
      </DragProvider>
    );
    expect(screen.getByTestId("child")).toBeTruthy();
  });
});
