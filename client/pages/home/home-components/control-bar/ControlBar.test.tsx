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
      <ControlBar disabled>
        <button onClick={onClick} title="Action tooltip">Action</button>
      </ControlBar>
    );

    const controlBar = container.firstElementChild;
    expect(controlBar).toHaveAttribute("aria-disabled", "true");
    expect(controlBar).not.toHaveAttribute("inert");
    expect(screen.getByTitle("Action tooltip")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Action" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("allows only the focused guided control when it is interactive", () => {
    const onMultiSelect = vi.fn();
    const onOther = vi.fn();
    render(
      <ControlBar
        guidedFocusTarget="home-multi-select-control"
        guidedFocusInteractive
      >
        <button
          data-guided-tour="home-multi-select-control"
          onClick={onMultiSelect}
        >
          Multi-Select
        </button>
        <button onClick={onOther}>Other</button>
      </ControlBar>
    );

    fireEvent.click(screen.getByRole("button", { name: "Other" }));
    fireEvent.click(screen.getByRole("button", { name: "Multi-Select" }));
    expect(onOther).not.toHaveBeenCalled();
    expect(onMultiSelect).toHaveBeenCalledOnce();
  });

  it("keeps the focused guided control visible while locking its action", () => {
    const onMultiSelect = vi.fn();
    const { container } = render(
      <ControlBar guidedFocusTarget="home-multi-select-control">
        <button
          data-guided-tour="home-multi-select-control"
          onClick={onMultiSelect}
        >
          Multi-Select
        </button>
      </ControlBar>
    );

    expect(container.firstElementChild).toHaveAttribute(
      "data-guided-focus-interactive",
      "false"
    );
    fireEvent.click(screen.getByRole("button", { name: "Multi-Select" }));
    expect(onMultiSelect).not.toHaveBeenCalled();
  });
});
