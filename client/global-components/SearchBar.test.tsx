import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SearchBar } from "./SearchBar";
import * as settingsContextModule from "@/pages/settings/provider/settingsContext";
import React from "react";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    img: ({ ...props }: any) => <img {...props} />,
  },
}));

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: vi.fn(),
}));

describe("SearchBar", () => {
  const setSearchQuery = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (settingsContextModule.useSettings as any).mockReturnValue({ theme: "light" });
    vi.stubGlobal('requestAnimationFrame', vi.fn(cb => cb()));
  });

  it("renders correctly and accepts input", async () => {
    render(<SearchBar searchQuery="" setSearchQuery={setSearchQuery} />);
    fireEvent.click(screen.getByTitle("Search Job Cards").parentElement!);
    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "test" } });
    expect(setSearchQuery).toHaveBeenCalledWith("test");
  });

  it("always shows input when alwaysShowInput is true", () => {
    render(<SearchBar searchQuery="" setSearchQuery={setSearchQuery} alwaysShowInput={true} />);
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("handles collapsed state and activation", () => {
    const onActivate = vi.fn();
    render(<SearchBar searchQuery="" setSearchQuery={setSearchQuery} collapsed={true} onCollapsedActivate={onActivate} />);
    fireEvent.click(screen.getByTitle("Search Job Cards").parentElement!);
    expect(onActivate).toHaveBeenCalled();
  });

  it("responds to focusSignal", () => {
    const { rerender } = render(<SearchBar searchQuery="" setSearchQuery={setSearchQuery} />);
    rerender(<SearchBar searchQuery="" setSearchQuery={setSearchQuery} focusSignal={1} />);
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("clears search query and prevents default on mousedown", () => {
    render(<SearchBar searchQuery="something" setSearchQuery={setSearchQuery} />);
    const clearBtn = screen.getByAltText("Clear Search Icon");
    
    // Test onMouseDown
    const event = new MouseEvent('mousedown', { cancelable: true, bubbles: true });
    const spy = vi.spyOn(event, 'preventDefault');
    fireEvent(clearBtn, event);
    expect(spy).toHaveBeenCalled();

    // Test onClick
    fireEvent.click(clearBtn);
    expect(setSearchQuery).toHaveBeenCalledWith("");
  });

  it("collapses on outside click when query is empty", () => {
    render(
      <div data-testid="outside">
        <SearchBar searchQuery="" setSearchQuery={setSearchQuery} />
      </div>
    );
    fireEvent.click(screen.getByTitle("Search Job Cards").parentElement!);
    fireEvent.pointerDown(screen.getByTestId("outside"));
    expect(screen.queryByPlaceholderText("Search...")).not.toBeInTheDocument();
  });

  it("does not collapse on outside click if query is NOT empty", () => {
    render(
      <div data-testid="outside">
        <SearchBar searchQuery="test" setSearchQuery={setSearchQuery} />
      </div>
    );
    fireEvent.pointerDown(screen.getByTestId("outside"));
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("renders premium variant in dark mode", () => {
    (settingsContextModule.useSettings as any).mockReturnValue({ theme: "dark" });
    render(<SearchBar searchQuery="t" setSearchQuery={setSearchQuery} variant="premium" />);
    const container = screen.getByTitle("Search Job Cards").parentElement!;
    expect(container.style.background).toContain("rgba(15, 23, 42, 0.62)");
    
    const clearBtn = screen.getByAltText("Clear Search Icon");
    expect(clearBtn).toHaveClass("opacity-40");
  });

  it("renders premium variant in light mode", () => {
    (settingsContextModule.useSettings as any).mockReturnValue({ theme: "light" });
    render(<SearchBar searchQuery="t" setSearchQuery={setSearchQuery} variant="premium" />);
    const container = screen.getByTitle("Search Job Cards").parentElement!;
    expect(container.style.background).toContain("rgba(255, 255, 255, 0.86)");
  });

  it("handles input focus/blur events", () => {
      render(<SearchBar searchQuery="" setSearchQuery={setSearchQuery} alwaysShowInput />);
      const input = screen.getByPlaceholderText("Search...");
      fireEvent.focus(input);
      fireEvent.blur(input);
  });
});
