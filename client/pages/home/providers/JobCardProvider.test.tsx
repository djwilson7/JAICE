import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { JobCardProvider } from "./JobCardProvider";
import { useJobCard } from "@/pages/home/hooks/useJobCard";

const TestComponent = () => {
  const { expandAll, commandId, openCount, registerOpen, registerClose, expandAllCards, collapseAllCards } = useJobCard();
  
  return (
    <div>
      <span data-testid="expandAll">{expandAll.toString()}</span>
      <span data-testid="commandId">{commandId}</span>
      <span data-testid="openCount">{openCount === Infinity ? 'Infinity' : openCount}</span>
      <button data-testid="registerOpen" onClick={registerOpen}>Open</button>
      <button data-testid="registerClose" onClick={registerClose}>Close</button>
      <button data-testid="expandAllCards" onClick={expandAllCards}>Expand All</button>
      <button data-testid="collapseAllCards" onClick={collapseAllCards}>Collapse All</button>
    </div>
  );
};

describe("JobCardProvider", () => {
  it("renders children and handles state correctly", () => {
    render(
      <JobCardProvider>
        <TestComponent />
      </JobCardProvider>
    );
    
    expect(screen.getByTestId("expandAll").textContent).toBe("false");
    expect(screen.getByTestId("commandId").textContent).toBe("0");
    expect(screen.getByTestId("openCount").textContent).toBe("0");

    act(() => {
      screen.getByTestId("registerOpen").click();
    });
    expect(screen.getByTestId("openCount").textContent).toBe("1");

    act(() => {
      screen.getByTestId("registerClose").click();
    });
    expect(screen.getByTestId("openCount").textContent).toBe("0");
    
    // min is 0
    act(() => {
      screen.getByTestId("registerClose").click();
    });
    expect(screen.getByTestId("openCount").textContent).toBe("0");

    act(() => {
      screen.getByTestId("expandAllCards").click();
    });
    expect(screen.getByTestId("expandAll").textContent).toBe("true");
    expect(screen.getByTestId("commandId").textContent).toBe("1");
    expect(screen.getByTestId("openCount").textContent).toBe("Infinity");

    act(() => {
      screen.getByTestId("collapseAllCards").click();
    });
    expect(screen.getByTestId("expandAll").textContent).toBe("false");
    expect(screen.getByTestId("commandId").textContent).toBe("2");
    expect(screen.getByTestId("openCount").textContent).toBe("0");
  });
});
