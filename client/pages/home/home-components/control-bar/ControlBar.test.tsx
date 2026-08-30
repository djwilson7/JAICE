import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { ControlBar } from "./ControlBar";

describe("ControlBar", () => {
  it("renders children", () => {
    render(<ControlBar><div data-testid="child" /></ControlBar>);
    expect(screen.getByTestId("child")).toBeTruthy();
  });

  it("blocks descendant controls when disabled", () => {
    const onClick = vi.fn();
    const { container } = render(
      <ControlBar disabled><button onClick={onClick}>Action</button></ControlBar>
    );

    const controlBar = container.firstElementChild;
    expect(controlBar).toHaveAttribute("aria-disabled", "true");
    expect(controlBar).toHaveAttribute("inert");

    fireEvent.click(screen.getByRole("button", { name: "Action", hidden: true }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
