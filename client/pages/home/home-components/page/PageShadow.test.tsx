import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageShadow } from "./PageShadow";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} data-testid="page-shadow-div" {...rest} />
    ),
  },
}));

vi.mock("@/pages/home/hooks/useDrag", () => ({
  useDrag: vi.fn(),
}));

vi.mock("../../hooks/useIsMultiSelecting", () => ({
  useIsMultiSelecting: vi.fn(),
}));

import { useDrag } from "@/pages/home/hooks/useDrag";
import { useIsMultiSelecting } from "../../hooks/useIsMultiSelecting";

describe("PageShadow", () => {
  it("returns null when isDragging is true", () => {
    (useDrag as ReturnType<typeof vi.fn>).mockReturnValue({ isDragging: true });
    (useIsMultiSelecting as ReturnType<typeof vi.fn>).mockReturnValue({ isMultiSelecting: false });

    const { container } = render(<PageShadow />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the shadow div when not dragging", () => {
    (useDrag as ReturnType<typeof vi.fn>).mockReturnValue({ isDragging: false });
    (useIsMultiSelecting as ReturnType<typeof vi.fn>).mockReturnValue({ isMultiSelecting: false });

    render(<PageShadow />);
    expect(screen.getByTestId("page-shadow-div")).toBeTruthy();
  });

  it("renders with multiSelect animate state when isMultiSelecting is true", () => {
    (useDrag as ReturnType<typeof vi.fn>).mockReturnValue({ isDragging: false });
    (useIsMultiSelecting as ReturnType<typeof vi.fn>).mockReturnValue({ isMultiSelecting: true });

    render(<PageShadow />);
    expect(screen.getByTestId("page-shadow-div")).toBeTruthy();
  });
});
