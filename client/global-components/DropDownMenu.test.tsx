import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { DropDownMenu } from "./DropDownMenu";
import React from "react";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    img: ({ ...props }: any) => <img {...props} />,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/utils/getCSSVar", () => ({
  getCSSVar: () => "0.2",
}));

describe("DropDownMenu", () => {
  const setSelectedOption = vi.fn();
  const leftIcon = "left.svg";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders non-compact and selects option", () => {
    render(
      <DropDownMenu
        selectedOption="new"
        setSelectedOption={setSelectedOption}
        leftIcon={leftIcon}
      />
    );

    expect(screen.getByText("Most Recent")).toBeInTheDocument();
    
    // Toggle open
    fireEvent.click(screen.getByRole("button", { name: "Order Job Cards" }));
    
    // Select an option
    fireEvent.click(screen.getByText("Oldest First"));
    expect(setSelectedOption).toHaveBeenCalledWith("old");
  });

  it("renders compact mode and selects option", () => {
    render(
      <DropDownMenu
        selectedOption="az"
        setSelectedOption={setSelectedOption}
        leftIcon={leftIcon}
        compact={true}
      />
    );

    const trigger = screen.getByRole("button", { name: /Order Job Cards: Ascend/i });
    expect(trigger).toBeInTheDocument();

    // Toggle open
    fireEvent.click(trigger);

    // Select an option
    fireEvent.click(screen.getByText("Most Recent"));
    expect(setSelectedOption).toHaveBeenCalledWith("new");
  });

  it("closes on Escape key", () => {
    render(
      <DropDownMenu
        selectedOption="new"
        setSelectedOption={setSelectedOption}
        leftIcon={leftIcon}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Order Job Cards" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes on outside click", () => {
    render(
      <div data-testid="outside">
        <DropDownMenu
          selectedOption="new"
          setSelectedOption={setSelectedOption}
          leftIcon={leftIcon}
        />
      </div>
    );

    fireEvent.click(screen.getByRole("button", { name: "Order Job Cards" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("stops propagation on menu click", () => {
    render(
      <DropDownMenu
        selectedOption="new"
        setSelectedOption={setSelectedOption}
        leftIcon={leftIcon}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Order Job Cards" }));
    const menu = screen.getByRole("menu");
    const stopSpy = vi.spyOn(Event.prototype, "stopPropagation");
    
    fireEvent.click(menu);
    expect(stopSpy).toHaveBeenCalled();
  });

  it("clears order when clicking clear icon", () => {
    render(
      <DropDownMenu
        selectedOption="az"
        setSelectedOption={setSelectedOption}
        leftIcon={leftIcon}
      />
    );

    const clearIcon = screen.getByAltText("Clear Order Icon");
    fireEvent.click(clearIcon);
    expect(setSelectedOption).toHaveBeenCalledWith("old");
  });

  it("uses default option if selectedOption is invalid", () => {
      render(
        <DropDownMenu
          selectedOption="invalid"
          setSelectedOption={setSelectedOption}
          leftIcon={leftIcon}
        />
      );
      // "old" is the default fallback, which is "Oldest First"
      expect(screen.getByText("Oldest First")).toBeInTheDocument();
  });
});
