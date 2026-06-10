import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ControlBar } from "./ControlBar";

describe("ControlBar", () => {
  it("renders children", () => {
    render(<ControlBar><div data-testid="child" /></ControlBar>);
    expect(screen.getByTestId("child")).toBeTruthy();
  });
});
