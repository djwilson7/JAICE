import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NavButton } from "./NavButton";

vi.mock("@/global-components/button", () => ({
  default: ({ children, onClick, className, title }: any) => (
    <button onClick={onClick} className={className} title={title}>
      {children}
    </button>
  ),
}));

describe("NavButton", () => {
  it("renders correctly and handles click", () => {
    const onClick = vi.fn();
    render(
      <NavButton
        icon="icon.png"
        label="My Button"
        onClick={onClick}
        isSelected={false}
        hoverMode="hover"
        title="My Title"
        showLabel={true}
      />
    );
    
    expect(screen.getByText("My Button")).toBeInTheDocument();
    expect(screen.getByAltText("My Button")).toHaveAttribute("src", "icon.png");
    
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
