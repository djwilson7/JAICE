import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { SelectedJobsProvider } from "./SelectedJobsProvider";
import { useSelectedJobs } from "@/pages/home/hooks/useSelectedJobs";

const TestComponent = () => {
  const { selectedJobs, toggleJobSelection } = useSelectedJobs();
  
  return (
    <div>
      <span data-testid="count">{selectedJobs.length}</span>
      <button data-testid="toggle1" onClick={() => toggleJobSelection({ id: '1' } as any)}>Toggle 1</button>
      <button data-testid="toggle2" onClick={() => toggleJobSelection({ id: '2' } as any)}>Toggle 2</button>
    </div>
  );
};

describe("SelectedJobsProvider", () => {
  it("renders children and handles state correctly", () => {
    render(
      <SelectedJobsProvider>
        <TestComponent />
      </SelectedJobsProvider>
    );
    
    expect(screen.getByTestId("count").textContent).toBe("0");

    act(() => {
      screen.getByTestId("toggle1").click();
    });
    expect(screen.getByTestId("count").textContent).toBe("1");

    act(() => {
      screen.getByTestId("toggle2").click();
    });
    expect(screen.getByTestId("count").textContent).toBe("2");

    // Untoggle 1
    act(() => {
      screen.getByTestId("toggle1").click();
    });
    expect(screen.getByTestId("count").textContent).toBe("1");
  });
});
