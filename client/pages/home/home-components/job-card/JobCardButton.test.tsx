import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JobCardButton } from "./JobCardButton";

describe("JobCardButton", () => {
  const defaultProps = {
    onClick: vi.fn(),
    icon: "test-icon.svg",
    iconHoverColor: "hover-color",
    label: "Test Label",
    title: "Test Title",
  };

  it("renders correctly when visible", () => {
    render(<JobCardButton {...defaultProps} />);
    const button = screen.getByRole("button", { name: /test label/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("title", "Test Title");
    
    const img = screen.getByAltText("Edit Icon");
    expect(img).toHaveAttribute("src", "test-icon.svg");
    expect(img).not.toHaveClass("hover-color");
  });

  it("returns null when not visible", () => {
    const { container } = render(<JobCardButton {...defaultProps} isVisible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("calls onClick when clicked", () => {
    render(<JobCardButton {...defaultProps} />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
  });

  it("updates hover state and applies hover class", () => {
    render(<JobCardButton {...defaultProps} />);
    const button = screen.getByRole("button");
    const img = screen.getByAltText("Edit Icon");

    fireEvent.mouseEnter(button);
    expect(img).toHaveClass("hover-color");

    fireEvent.mouseLeave(button);
    expect(img).not.toHaveClass("hover-color");
  });
});
