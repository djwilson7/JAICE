import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingAnimation } from "./LoadingAnimation";

vi.mock("lottie-react", () => ({
  default: ({ animationData }: { animationData: unknown }) => (
    <div data-testid="lottie" data-animation={JSON.stringify(animationData)} />
  ),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...rest}>{children}</div>
    ),
  },
}));

vi.mock("@/utils/getThemeData", () => ({
  useThemeData: () => ({ loadingAnimation: { v: "5.0" } }),
}));

describe("LoadingAnimation", () => {
  it("renders without crashing", () => {
    render(<LoadingAnimation />);
    expect(screen.getByTestId("lottie")).toBeTruthy();
  });

  it("passes loadingAnimation data to Lottie", () => {
    render(<LoadingAnimation />);
    const lottie = screen.getByTestId("lottie");
    expect(lottie.getAttribute("data-animation")).toBe(JSON.stringify({ v: "5.0" }));
  });
});
