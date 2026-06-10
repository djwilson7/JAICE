import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AboutPage from "./AboutPage";
import { MemoryRouter } from "react-router";

const mockNavigate = vi.fn();
vi.mock("react-router", async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/global-services/useBrandImage", () => ({
  useBrandImage: () => "mock-image.png",
}));

describe("AboutPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly in public mode", () => {
    render(
      <MemoryRouter>
        <AboutPage isPublic={true} />
      </MemoryRouter>
    );
    expect(screen.getByText("JAICE")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    
    fireEvent.click(screen.getByText("Home"));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("renders correctly in app mode (non-public)", () => {
    render(
      <MemoryRouter>
        <AboutPage isPublic={false} />
      </MemoryRouter>
    );
    expect(screen.getByText("JAICE")).toBeInTheDocument();
    expect(screen.queryByText("Home")).not.toBeInTheDocument();
  });

  it("renders the team members", () => {
      render(
        <MemoryRouter>
          <AboutPage />
        </MemoryRouter>
      );
      expect(screen.getByText("Dontai")).toBeInTheDocument();
      expect(screen.getByText("Maya")).toBeInTheDocument();
      expect(screen.getByText("Antonio")).toBeInTheDocument();
      expect(screen.getByText("Sephen")).toBeInTheDocument();
  });
});
