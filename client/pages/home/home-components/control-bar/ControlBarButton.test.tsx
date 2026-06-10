import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ControlBarButton } from "./ControlBarButton";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    img: ({ ...props }: any) => <img {...props} />,
  },
}));

describe("ControlBarButton", () => {
  const defaultProps = {
    onClick: vi.fn(),
    icon: "test-icon.svg",
    iconHoverColor: "hover-color",
    label: "Test Label",
    alt: "Test Alt",
  };

  it("renders correctly with label", () => {
    render(<ControlBarButton {...defaultProps} />);
    expect(screen.getByText("Test Label")).toBeInTheDocument();
    expect(screen.getByAltText("Test Alt")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute("title", "Test Label");
  });

  it("renders correctly in compact mode", () => {
    render(<ControlBarButton {...defaultProps} compact={true} />);
    expect(screen.queryByText("Test Label")).not.toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute("title", "Test Label");
  });

  it("calls onClick when clicked", () => {
    render(<ControlBarButton {...defaultProps} />);
    fireEvent.click(screen.getByRole("button"));
    expect(defaultProps.onClick).toHaveBeenCalled();
  });

  it("applies prominent class when prominent is true", () => {
    const { container } = render(<ControlBarButton {...defaultProps} prominent={true} />);
    expect(container.firstChild).toHaveClass("control-bar-container-red");
  });

  it("updates icon class on hover", () => {
    render(<ControlBarButton {...defaultProps} />);
    const button = screen.getByRole("button");
    const img = screen.getByAltText("Test Alt");

    expect(img).toHaveClass("icon");

    fireEvent.mouseEnter(button);
    expect(img).toHaveClass("hover-color");
    expect(img).not.toHaveClass("icon");

    fireEvent.mouseLeave(button);
    expect(img).toHaveClass("icon");
  });

  it("uses alt for title if label is missing", () => {
    render(<ControlBarButton {...defaultProps} label={undefined} />);
    expect(screen.getByRole("button")).toHaveAttribute("title", "Test Alt");
  });
});
