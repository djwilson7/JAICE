import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { UndoRedoProvider } from "./UndoRedoProvider";
import { useUndoRedo } from "@/pages/home/hooks/useUndoRedo";
import { useEffect } from "react";

const TestComponent = () => {
  const { pushUndo, undo, redo, clear, hasUndo, hasRedo, undoCount, redoCount } = useUndoRedo();
  
  return (
    <div>
      <span data-testid="hasUndo">{hasUndo.toString()}</span>
      <span data-testid="hasRedo">{hasRedo.toString()}</span>
      <span data-testid="undoCount">{undoCount}</span>
      <span data-testid="redoCount">{redoCount}</span>
      <button data-testid="push" onClick={() => pushUndo({ id: '1', type: 'test', description: 'test', before: [{} as any], after: [{} as any] })}>Push</button>
      <button data-testid="undo" onClick={() => undo()}>Undo</button>
      <button data-testid="redo" onClick={() => redo()}>Redo</button>
      <button data-testid="clear" onClick={() => clear()}>Clear</button>
      <button data-testid="pushEmpty" onClick={() => pushUndo({ id: '2', type: 'test', description: 'empty', before: [], after: [] })}>Push Empty</button>
    </div>
  );
};

describe("UndoRedoProvider", () => {
  it("renders children", () => {
    render(
      <UndoRedoProvider>
        <div data-testid="child">Child</div>
      </UndoRedoProvider>
    );
    expect(screen.getByTestId("child")).toBeTruthy();
  });

  it("handles push, undo, redo, clear", () => {
    render(
      <UndoRedoProvider>
        <TestComponent />
      </UndoRedoProvider>
    );

    expect(screen.getByTestId("undoCount").textContent).toBe("0");
    expect(screen.getByTestId("hasUndo").textContent).toBe("false");

    act(() => {
      screen.getByTestId("push").click();
    });

    expect(screen.getByTestId("undoCount").textContent).toBe("1");
    expect(screen.getByTestId("hasUndo").textContent).toBe("true");

    act(() => {
      screen.getByTestId("pushEmpty").click();
    });
    // Should still be 1 since empty push is ignored
    expect(screen.getByTestId("undoCount").textContent).toBe("1");

    act(() => {
      screen.getByTestId("undo").click();
    });

    expect(screen.getByTestId("undoCount").textContent).toBe("0");
    expect(screen.getByTestId("redoCount").textContent).toBe("1");
    expect(screen.getByTestId("hasRedo").textContent).toBe("true");

    act(() => {
      screen.getByTestId("redo").click();
    });

    expect(screen.getByTestId("undoCount").textContent).toBe("1");
    expect(screen.getByTestId("redoCount").textContent).toBe("0");

    act(() => {
      screen.getByTestId("clear").click();
    });

    expect(screen.getByTestId("undoCount").textContent).toBe("0");
    expect(screen.getByTestId("redoCount").textContent).toBe("0");
  });

  it("handles empty undo and redo safely", () => {
    render(
      <UndoRedoProvider>
        <TestComponent />
      </UndoRedoProvider>
    );

    act(() => {
      screen.getByTestId("undo").click();
      screen.getByTestId("redo").click();
    });

    expect(screen.getByTestId("undoCount").textContent).toBe("0");
  });
});
