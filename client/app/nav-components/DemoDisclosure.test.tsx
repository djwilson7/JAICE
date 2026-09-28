import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DemoDisclosure } from "./DemoDisclosure";

describe("DemoDisclosure", () => {
  it("identifies the demo and exposes its safety context accessibly", () => {
    render(<DemoDisclosure />);

    const disclosure = screen.getByLabelText("Demo environment");
    const tooltip = screen.getByRole("tooltip");

    expect(disclosure).toHaveTextContent("Demo");
    expect(
      disclosure.querySelector(".demo-disclosure__warning")
    ).toBeInTheDocument();
    expect(disclosure).toHaveAttribute(
      "aria-describedby",
      "demo-disclosure-tooltip"
    );
    expect(tooltip).toHaveTextContent(
      "To keep this demo safe and self-contained, it uses simulated data and the actual application frontend without external-service connections."
    );
  });
});
