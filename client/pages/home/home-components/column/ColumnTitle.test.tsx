import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ColumnTitle } from "./ColumnTitle";
import * as useSettingsHook from "@/pages/settings/provider/settingsContext";
import React from "react";

vi.mock("@/pages/settings/provider/settingsContext", () => ({
  useSettings: vi.fn(),
}));

describe("ColumnTitle", () => {
  const setSelectedPrimaryColumn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useSettingsHook.useSettings as any).mockReturnValue({
      primaryColumnBehavior: "separate",
      selectedPrimaryColumn: "accepted",
      setSelectedPrimaryColumn,
    });
  });

  it("renders basic title and count", () => {
    render(<ColumnTitle title="Applied" count={5} />);
    expect(screen.getByText("Applied")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders unified title for Accepted/Rejected", () => {
    (useSettingsHook.useSettings as any).mockReturnValue({
      primaryColumnBehavior: "unified",
      selectedPrimaryColumn: "accepted",
      setSelectedPrimaryColumn,
    });

    render(<ColumnTitle title="Accepted" count={3} />);
    
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
    
    // Test toggle click on Accepted
    fireEvent.click(screen.getByText("Accepted").parentElement!);
    expect(setSelectedPrimaryColumn).toHaveBeenCalledWith("rejected");
  });

  it("toggles correctly when Rejected is the base title", () => {
      (useSettingsHook.useSettings as any).mockReturnValue({
        primaryColumnBehavior: "unified",
        selectedPrimaryColumn: "rejected",
        setSelectedPrimaryColumn,
      });
  
      render(<ColumnTitle title="Rejected" count={3} />);
      
      fireEvent.click(screen.getByText("Rejected").parentElement!);
      expect(setSelectedPrimaryColumn).toHaveBeenCalledWith("accepted");
  });

  it("does not render unified if behavior is separate", () => {
      render(<ColumnTitle title="Accepted" count={3} />);
      expect(screen.queryByText("Rejected")).not.toBeInTheDocument();
  });
});
