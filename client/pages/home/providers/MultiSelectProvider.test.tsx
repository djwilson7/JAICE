import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MultiSelectProvider } from "./MultiSelectProvider";
import { useIsMultiSelecting } from "@/pages/home/hooks/useIsMultiSelecting";

const TestComponent = () => {
  const { isMultiSelecting, setIsMultiSelecting } = useIsMultiSelecting();
  
  return (
    <div>
      <span data-testid="status">{isMultiSelecting.toString()}</span>
      <button data-testid="toggle" onClick={() => setIsMultiSelecting(prev => !prev)}>Toggle</button>
    </div>
  );
};

describe("MultiSelectProvider", () => {
  it("renders children and handles state correctly", () => {
    render(
      <MultiSelectProvider>
        <TestComponent />
      </MultiSelectProvider>
    );
    
    expect(screen.getByTestId("status").textContent).toBe("false");

    act(() => {
      screen.getByTestId("toggle").click();
    });
    expect(screen.getByTestId("status").textContent).toBe("true");

    act(() => {
      screen.getByTestId("toggle").click();
    });
    expect(screen.getByTestId("status").textContent).toBe("false");
  });
});
