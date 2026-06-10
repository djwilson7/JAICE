import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CheckBoxToggle } from "./CheckBoxToggle";
import * as useIsMultiSelectingHook from "@/pages/home/hooks/useIsMultiSelecting";
import * as useSelectedJobsHook from "@/pages/home/hooks/useSelectedJobs";
import React from "react";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock("@/pages/home/hooks/useIsMultiSelecting", () => ({
  useIsMultiSelecting: vi.fn(),
}));

vi.mock("@/pages/home/hooks/useSelectedJobs", () => ({
  useSelectedJobs: vi.fn(),
}));

describe("CheckBoxToggle", () => {
  const setIsMultiSelecting = vi.fn();
  const setSelectedJobs = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useIsMultiSelectingHook.useIsMultiSelecting as any).mockReturnValue({
      isMultiSelecting: false,
      setIsMultiSelecting,
    });
    (useSelectedJobsHook.useSelectedJobs as any).mockReturnValue({
      setSelectedJobs,
    });
  });

  it("renders correctly with label and icons", () => {
    render(
      <CheckBoxToggle 
        label="Multi Select" 
        inactiveIcon="off.svg" 
        activeIcon="on.svg" 
        hoverIconColor="hover-red" 
      />
    );
    expect(screen.getByText("Multi Select")).toBeInTheDocument();
    const img = screen.getByAltText("Toggle Icon");
    expect(img).toHaveAttribute("src", "off.svg");
    expect(img).toHaveClass("icon");
  });

  it("toggles ON correctly", () => {
    render(<CheckBoxToggle hoverIconColor="red" />);
    fireEvent.click(screen.getByRole("button"));
    expect(setIsMultiSelecting).toHaveBeenCalledWith(true);
    expect(setSelectedJobs).not.toHaveBeenCalled();
  });

  it("toggles OFF and clears selection", () => {
    (useIsMultiSelectingHook.useIsMultiSelecting as any).mockReturnValue({
      isMultiSelecting: true,
      setIsMultiSelecting,
    });
    render(<CheckBoxToggle hoverIconColor="red" />);
    fireEvent.click(screen.getByRole("button"));
    expect(setIsMultiSelecting).toHaveBeenCalledWith(false);
    expect(setSelectedJobs).toHaveBeenCalledWith([]);
  });

  it("updates icon class on hover", () => {
    render(<CheckBoxToggle hoverIconColor="hover-red" />);
    const button = screen.getByRole("button");
    const img = screen.getByAltText("Toggle Icon");

    fireEvent.mouseEnter(button);
    expect(img).toHaveClass("hover-red");

    fireEvent.mouseLeave(button);
    expect(img).toHaveClass("icon");
  });

  it("uses active icon and color when multi-selecting", () => {
    (useIsMultiSelectingHook.useIsMultiSelecting as any).mockReturnValue({
      isMultiSelecting: true,
      setIsMultiSelecting,
    });
    render(
      <CheckBoxToggle 
        activeIcon="on.svg" 
        hoverIconColor="hover-red" 
      />
    );
    const img = screen.getByAltText("Toggle Icon");
    expect(img).toHaveAttribute("src", "on.svg");
    expect(img).toHaveClass("hover-red");
  });

  it("renders compact mode without label", () => {
    render(<CheckBoxToggle label="Label" compact={true} hoverIconColor="red" />);
    expect(screen.queryByText("Label")).not.toBeInTheDocument();
  });

  it("hits checkbox onChange (console.log)", () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const { container } = render(<CheckBoxToggle hoverIconColor="red" />);
      const input = container.querySelector('input[type="checkbox"]');
      if (input) fireEvent.click(input);
      expect(logSpy).toHaveBeenCalledWith("Checked Box");
      logSpy.mockRestore();
  });
});
