import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Button, { HoverIconButton } from "./button";
import React from "react";

describe("Button", () => {
  it("renders correctly with all props", () => {
    const onClick = vi.fn();
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();
    
    render(
      <Button 
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        isSelected={true}
        type="submit"
        disabled={false}
        title="My Button"
        className="custom-class"
      >
        Click Me
      </Button>
    );

    const button = screen.getByRole("button", { name: "Click Me" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("selected");
    expect(button).toHaveClass("custom-class");
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveAttribute("title", "My Button");

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();

    fireEvent.mouseEnter(button);
    expect(onMouseEnter).toHaveBeenCalled();

    fireEvent.mouseLeave(button);
    expect(onMouseLeave).toHaveBeenCalled();
  });

  it("handles missing handlers", () => {
      render(<Button>No Handlers</Button>);
      const button = screen.getByRole("button");
      fireEvent.click(button);
      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);
  });
});

describe("HoverIconButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("handles success flow", async () => {
    const onClick = vi.fn().mockResolvedValue(true);
    render(
      <HoverIconButton
        baseIcon="base.svg"
        hoverIcon="hover.svg"
        successIcon="success.svg"
        failureIcon="fail.svg"
        alt="Test Icon"
        onClick={onClick}
      />
    );
    
    const button = screen.getByRole("button");
    const img = screen.getByAltText("Test Icon");
    
    await act(async () => {
        fireEvent.click(button);
    });
    
    expect(img).toHaveAttribute("src", "success.svg");

    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(img).toHaveAttribute("src", "base.svg");
  });

  it("handles failure flow (returns false)", async () => {
    const onClick = vi.fn().mockResolvedValue(false);
    render(
      <HoverIconButton
        baseIcon="base.svg"
        hoverIcon="hover.svg"
        successIcon="success.svg"
        failureIcon="fail.svg"
        alt="Test Icon"
        onClick={onClick}
      />
    );
    
    const button = screen.getByRole("button");
    const img = screen.getByAltText("Test Icon");
    
    await act(async () => {
        fireEvent.click(button);
    });
    
    expect(img).toHaveAttribute("src", "fail.svg");

    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(img).toHaveAttribute("src", "base.svg");
  });

  it("handles failure flow (throws error)", async () => {
    const onClick = vi.fn().mockRejectedValue(new Error("Fail"));
    render(
      <HoverIconButton
        baseIcon="base.svg"
        hoverIcon="hover.svg"
        successIcon="success.svg"
        failureIcon="fail.svg"
        alt="Test Icon"
        onClick={onClick}
      />
    );
    
    const button = screen.getByRole("button");
    const img = screen.getByAltText("Test Icon");
    
    await act(async () => {
        fireEvent.click(button);
    });
    
    expect(img).toHaveAttribute("src", "fail.svg");
  });

  it("handles hover states correctly", () => {
      render(
        <HoverIconButton
          baseIcon="base.svg"
          hoverIcon="hover.svg"
          successIcon="success.svg"
          failureIcon="fail.svg"
          alt="Test Icon"
          onClick={() => {}}
          hoverClassName="my-hover"
        />
      );

      const button = screen.getByRole("button");
      const img = screen.getByAltText("Test Icon");

      fireEvent.mouseEnter(button);
      expect(img).toHaveAttribute("src", "hover.svg");
      expect(img).toHaveClass("my-hover");

      fireEvent.mouseLeave(button);
      expect(img).toHaveAttribute("src", "base.svg");
  });
});
