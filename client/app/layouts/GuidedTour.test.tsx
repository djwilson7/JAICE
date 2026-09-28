import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuidedTour } from "./GuidedTour";
import { JOB_LOCAL_CHANGE_EVENT } from "@/pages/home/utils/jobLocalChangeEvent";

describe("GuidedTour", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.style.overflow = "";
    window.localStorage.clear();
  });

  it("shows the welcome before the page-scoped tour steps", () => {
    const onNavigate = vi.fn();
    render(
      <GuidedTour
        enabled
        startRequested
        currentPath="/home"
        onNavigate={onNavigate}
      />
    );

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Welcome to the guided tour of JAICE"
    );
    expect(screen.queryByLabelText("JAICE guided tour")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(screen.getByRole("button", { name: /let’s begin/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("JAICE guided tour")).toBeInTheDocument();
    expect(
      screen.getByLabelText("JAICE guided tour").closest(".focal-shimmer")
    ).toHaveClass("guided-tour-step-card-shell");
    expect(screen.getByText("1/16")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    expect(document.body.style.overflow).toBe("");
    expect(
      document.querySelector<HTMLElement>(".guided-tour-focus-shimmer")
        ?.style.visibility
    ).toBe("hidden");
    expect(
      document.querySelector(".guided-tour-focus-connector-particle")
    ).not.toBeInTheDocument();
  });

  it("uses blue Resume guidance through AI Assist and white shimmer for Tags", () => {
    const { rerender } = render(
      <GuidedTour
        enabled
        startRequested
        currentPath="/resume"
        onNavigate={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /let’s begin/i }));

    expect(
      document.querySelectorAll(
        ".guided-tour-focus-shimmer--resume"
      )
    ).toHaveLength(8);

    for (let index = 0; index < 5; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }

    expect(screen.getByText("Controls appear where you work")).toBeInTheDocument();
    expect(
      document.querySelector(".guided-tour-focus-connector")
    ).toHaveClass("guided-tour-focus-connector--resume");

    for (let index = 0; index < 4; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }

    expect(screen.getByText("Improve bullets with AI Assist")).toBeInTheDocument();
    expect(
      document.querySelector(".guided-tour-focus-connector")
    ).toHaveClass("guided-tour-focus-connector--resume");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("Tag the focus of your experience")).toBeInTheDocument();
    expect(
      document.querySelector(".guided-tour-focus-shimmer--resume")
    ).not.toBeInTheDocument();
    expect(
      document.querySelector(".guided-tour-focus-connector")
    ).not.toHaveClass("guided-tour-focus-connector--resume");
    expect(
      document.querySelector(".guided-tour-focus-connector-particle")
    ).not.toBeInTheDocument();

    rerender(
      <GuidedTour
        enabled
        startRequested
        currentPath="/home"
        onNavigate={vi.fn()}
      />
    );

    expect(
      document.querySelector(".guided-tour-focus-shimmer--resume")
    ).not.toBeInTheDocument();
  });

  it.each([
    ["About", "/auth-about"],
    ["Dashboard", "/dashboard"],
  ])("moves the %s guide only at the scroll boundary", (_page, currentPath) => {
    const { container } = render(
      <>
        <div className="outlet-container" data-testid="tour-scroll-canvas" />
        <button data-guided-tour="app-dashboard-navigation">Dashboard</button>
        <GuidedTour
          enabled
          startRequested
          currentPath={currentPath}
          onNavigate={vi.fn()}
        />
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: /let’s begin/i }));

    const scrollCanvas = screen.getByTestId("tour-scroll-canvas");
    const guideCard = document.querySelector<HTMLElement>(
      '[data-guided-tour="guided-tour-card"]'
    )!;
    vi.spyOn(guideCard, "getBoundingClientRect").mockReturnValue({
      width: 400,
      height: 180,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    Object.defineProperties(scrollCanvas, {
      clientHeight: { configurable: true, value: 500 },
      scrollHeight: { configurable: true, value: 1_200 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });

    fireEvent.scroll(scrollCanvas);
    expect(
      guideCard
    ).toHaveAttribute("data-guide-placement", "bottom");
    expect(guideCard.style.getPropertyValue("--guided-tour-card-lift")).toBe(
      "0px"
    );

    scrollCanvas.scrollTop = 700;
    fireEvent.scroll(scrollCanvas);
    expect(
      guideCard
    ).toHaveAttribute("data-guide-placement", "top");
    expect(
      Number.parseFloat(
        guideCard.style.getPropertyValue("--guided-tour-card-lift")
      )
    ).toBeGreaterThan(0);

    scrollCanvas.scrollTop = 550;
    fireEvent.scroll(scrollCanvas);
    expect(
      guideCard
    ).toHaveAttribute("data-guide-placement", "bottom");
    expect(guideCard.style.getPropertyValue("--guided-tour-card-lift")).toBe(
      "0px"
    );

    scrollCanvas.scrollTop = 698;
    fireEvent.scroll(scrollCanvas);
    expect(
      guideCard
    ).toHaveAttribute("data-guide-placement", "bottom");
    expect(guideCard.style.getPropertyValue("--guided-tour-card-lift")).toBe(
      "0px"
    );

    scrollCanvas.scrollTop = 0;
    fireEvent.scroll(scrollCanvas);
    expect(
      guideCard
    ).toHaveAttribute("data-guide-placement", "bottom");
    expect(guideCard.style.getPropertyValue("--guided-tour-card-lift")).toBe(
      "0px"
    );

    expect(container.querySelector(".outlet-container")).toBe(scrollCanvas);
  });

  it("guides Dashboard hover details without advancing until Next is selected", () => {
    const onNavigate = vi.fn();
    const onNavigationModeChange = vi.fn();

    render(
      <>
        <div className="outlet-container" data-testid="dashboard-scroll-canvas">
          <div data-guided-tour="dashboard-grit-card">Grit</div>
          <div data-guided-tour="dashboard-reading-card">Reading</div>
          <div data-guided-tour="dashboard-avg-time-card">
            <button data-guided-tour="dashboard-avg-time-info">Info</button>
          </div>
          <div data-guided-tour="dashboard-stages-over-time-card">
            <div role="img" aria-label="Stages chart" />
          </div>
        </div>
        <button data-guided-tour="app-resume-navigation">Resume</button>
        <GuidedTour
          enabled
          startRequested
          currentPath="/dashboard"
          onNavigate={onNavigate}
          onNavigationModeChange={onNavigationModeChange}
        />
      </>
    );

    const scrollCanvas = screen.getByTestId("dashboard-scroll-canvas");
    const secondRow = document.querySelector<HTMLElement>(
      '[data-guided-tour="dashboard-avg-time-card"]'
    )!;
    const scrollTo = vi.fn(({ top }: ScrollToOptions) => {
      scrollCanvas.scrollTop = top ?? 0;
    });
    Object.defineProperty(scrollCanvas, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });
    vi.spyOn(scrollCanvas, "getBoundingClientRect").mockReturnValue({
      width: 900,
      height: 600,
      top: 72,
      right: 900,
      bottom: 672,
      left: 0,
      x: 0,
      y: 72,
      toJSON: () => ({}),
    });
    vi.spyOn(secondRow, "getBoundingClientRect").mockImplementation(() => ({
      width: 300,
      height: 256,
      top: 420 - scrollCanvas.scrollTop,
      right: 300,
      bottom: 676 - scrollCanvas.scrollTop,
      left: 0,
      x: 0,
      y: 420 - scrollCanvas.scrollTop,
      toJSON: () => ({}),
    }));

    fireEvent.click(screen.getByRole("button", { name: /let’s begin/i }));
    expect(screen.getByText("Your progress at a glance")).toBeInTheDocument();
    expect(screen.getByText("1/6")).toBeInTheDocument();
    expect(onNavigationModeChange).toHaveBeenLastCalledWith("locked");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Your Grit Score")).toBeInTheDocument();
    expect(screen.getByText("2/6")).toBeInTheDocument();
    expect(onNavigationModeChange).toHaveBeenLastCalledWith("closed");
    expect(scrollCanvas.style.overflowY).toBe("hidden");
    expect(scrollTo).not.toHaveBeenCalled();
    expect(
      document.querySelectorAll(".guided-tour-focus-mask").length
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Reading the Dashboard")).toBeInTheDocument();
    expect(screen.getByText("3/6")).toBeInTheDocument();
    expect(scrollCanvas.style.overflowY).toBe("hidden");
    expect(scrollTo).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(
      screen.getByText("Learn more about each metric")
    ).toBeInTheDocument();
    expect(screen.getByText("4/6")).toBeInTheDocument();
    expect(scrollCanvas.style.overflowY).toBe("hidden");
    expect(scrollTo).toHaveBeenLastCalledWith({
      top: 324,
      behavior: "smooth",
    });
    expect(
      document.querySelectorAll(".guided-tour-focus-mask").length
    ).toBeGreaterThan(0);
    expect(
      document.querySelectorAll(".guided-tour-focus-connector-particle")
    ).toHaveLength(42);

    fireEvent.pointerOver(screen.getByRole("button", { name: "Info" }));
    expect(
      screen.getByText("Learn more about each metric")
    ).toBeInTheDocument();
    expect(screen.getByText("4/6")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Inspect specific values")).toBeInTheDocument();
    expect(screen.getByText("5/6")).toBeInTheDocument();
    expect(scrollCanvas.style.overflowY).toBe("hidden");
    expect(scrollTo).toHaveBeenLastCalledWith({
      top: 324,
      behavior: "smooth",
    });

    fireEvent.pointerOver(screen.getByRole("img", { name: "Stages chart" }));
    expect(screen.getByText("Inspect specific values")).toBeInTheDocument();
    expect(screen.getByText("5/6")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Explore, then continue")).toBeInTheDocument();
    expect(screen.getByText("6/6")).toBeInTheDocument();
    expect(scrollCanvas.style.overflowY).toBe("");
    expect(scrollTo).toHaveBeenLastCalledWith({
      top: 0,
      behavior: "smooth",
    });
    expect(onNavigationModeChange).toHaveBeenLastCalledWith("resume-only");
    expect(
      screen.getByRole("button", { name: "Select Resume" })
    ).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Select Resume" }));
    expect(onNavigate).toHaveBeenLastCalledWith("/resume");
  });

  it("locks header and navigation on the first Resume step", () => {
    const onNavigationModeChange = vi.fn();
    const onResumeInteractionStateChange = vi.fn();

    render(
      <>
        <header data-guided-tour="resume-header">
          Resume controls
          <button data-guided-tour="resume-autosave-control">Auto-save</button>
        </header>
        <button data-guided-tour="resume-left-rail-toggle">Versions</button>
        <div data-guided-tour="resume-left-rail-panel">Resume versions</div>
        <button data-guided-tour="resume-right-rail-toggle">Open Jaice</button>
        <div data-guided-tour="resume-right-rail-panel">Jaice</div>
        <div data-guided-tour="resume-bottom-toolbar">
          <button data-guided-tour="resume-bottom-rail-toggle">Format</button>
          <div data-guided-tour="resume-bottom-rail-panel">Formatting</div>
        </div>
        <div id="print-canvas" data-guided-tour="resume-document">
          Resume document
          <section data-section="experience">
            Work Experience
            <button data-guided-tour="resume-experience-add-control">Add experience</button>
            <input className="resume-editor-bullet-composer" aria-label="Bullet composer" />
            <button data-guided-tour="resume-experience-organize-control">Move up</button>
            <button data-guided-tour="resume-experience-organize-control">Delete entry</button>
            <button data-guided-tour="resume-experience-enhance-control">AI Assist</button>
            <button data-guided-tour="resume-experience-enhance-control">Add Tag</button>
          </section>
        </div>
        <GuidedTour
          enabled
          startRequested
          currentPath="/resume"
          onNavigate={vi.fn()}
          onNavigationModeChange={onNavigationModeChange}
          onResumeInteractionStateChange={onResumeInteractionStateChange}
        />
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: /let’s begin/i }));

    expect(screen.getByText("A resume built to adapt")).toBeInTheDocument();
    expect(screen.getByText("1/13")).toBeInTheDocument();
    expect(onNavigationModeChange).toHaveBeenLastCalledWith("locked");
    expect(onResumeInteractionStateChange).toHaveBeenLastCalledWith(
      "overview"
    );

    const guideCard = document.querySelector<HTMLElement>(
      '[data-guided-tour="guided-tour-card"]'
    )!;
    const header = document.querySelector<HTMLElement>(
      '[data-guided-tour="resume-header"]'
    )!;
    const leftRail = document.querySelector<HTMLElement>(
      '[data-guided-tour="resume-left-rail-panel"]'
    )!;
    const rightRail = document.querySelector<HTMLElement>(
      '[data-guided-tour="resume-right-rail-panel"]'
    )!;
    const bottomRailToggle = document.querySelector<HTMLElement>(
      '[data-guided-tour="resume-bottom-rail-toggle"]'
    )!;
    const bottomToolbar = document.querySelector<HTMLElement>(
      '[data-guided-tour="resume-bottom-toolbar"]'
    )!;
    const bottomRail = document.querySelector<HTMLElement>(
      '[data-guided-tour="resume-bottom-rail-panel"]'
    )!;
    vi.spyOn(guideCard, "getBoundingClientRect").mockReturnValue({
      width: 400,
      height: 180,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    vi.spyOn(header, "getBoundingClientRect").mockReturnValue({
      width: 1_000,
      height: 80,
      top: 20,
      right: 1_000,
      bottom: 100,
      left: 0,
      x: 0,
      y: 20,
      toJSON: () => ({}),
    });
    vi.spyOn(leftRail, "getBoundingClientRect").mockReturnValue({
      width: 288,
      height: 600,
      top: 120,
      right: 288,
      bottom: 720,
      left: 0,
      x: 0,
      y: 120,
      toJSON: () => ({}),
    });
    vi.spyOn(rightRail, "getBoundingClientRect").mockReturnValue({
      width: 288,
      height: 600,
      top: 120,
      right: 1_000,
      bottom: 720,
      left: 712,
      x: 712,
      y: 120,
      toJSON: () => ({}),
    });
    vi.spyOn(bottomRail, "getBoundingClientRect").mockReturnValue({
      width: 800,
      height: 160,
      top: 560,
      right: 800,
      bottom: 720,
      left: 0,
      x: 0,
      y: 560,
      toJSON: () => ({}),
    });
    vi.spyOn(bottomRailToggle, "getBoundingClientRect").mockReturnValue({
      width: 80,
      height: 40,
      top: 510,
      right: 540,
      bottom: 550,
      left: 460,
      x: 460,
      y: 510,
      toJSON: () => ({}),
    });
    vi.spyOn(bottomToolbar, "getBoundingClientRect").mockReturnValue({
      width: 800,
      height: 210,
      top: 510,
      right: 900,
      bottom: 720,
      left: 100,
      x: 100,
      y: 510,
      toJSON: () => ({}),
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Build from a master resume")).toBeInTheDocument();
    expect(screen.getByText("2/13")).toBeInTheDocument();
    expect(onResumeInteractionStateChange).toHaveBeenLastCalledWith(
      "left-rail"
    );
    expect(document.querySelectorAll(".guided-tour-focus-mask")).toHaveLength(0);
    expect(onNavigationModeChange).toHaveBeenLastCalledWith("locked");

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onResumeInteractionStateChange).toHaveBeenLastCalledWith("overview");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onResumeInteractionStateChange).toHaveBeenLastCalledWith("left-rail");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Advice when you need it")).toBeInTheDocument();
    expect(screen.getByText("3/13")).toBeInTheDocument();
    expect(onResumeInteractionStateChange).toHaveBeenLastCalledWith(
      "right-rail"
    );
    expect(document.querySelectorAll(".guided-tour-focus-mask")).toHaveLength(0);
    expect(onNavigationModeChange).toHaveBeenLastCalledWith("locked");
    expect(guideCard).toHaveAttribute(
      "data-guide-placement",
      "left-of-target"
    );
    expect(
      Number.parseFloat(
        guideCard.style.getPropertyValue("--guided-tour-card-shift-x")
      )
    ).toBeLessThan(0);
    expect(
      Number.parseFloat(
        guideCard.style.getPropertyValue("--guided-tour-card-shift-x")
      )
    ).toBeGreaterThan(-576);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Control the page layout")).toBeInTheDocument();
    expect(screen.getByText("4/13")).toBeInTheDocument();
    expect(onResumeInteractionStateChange).toHaveBeenLastCalledWith(
      "bottom-rail"
    );
    expect(document.querySelectorAll(".guided-tour-focus-mask")).toHaveLength(0);
    expect(onNavigationModeChange).toHaveBeenLastCalledWith("locked");
    expect(
      Array.from(
        document.querySelectorAll<HTMLElement>(".guided-tour-focus-shimmer")
      ).filter((element) => element.style.visibility === "visible")
    ).toHaveLength(1);
    expect(guideCard).toHaveAttribute("data-guide-placement", "above-target");
    expect(
      Number.parseFloat(
        guideCard.style.getPropertyValue("--guided-tour-card-lift")
      )
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Edit your resume directly")).toBeInTheDocument();
    expect(screen.getByText("5/13")).toBeInTheDocument();
    expect(onResumeInteractionStateChange).toHaveBeenLastCalledWith("document");
    expect(onNavigationModeChange).toHaveBeenLastCalledWith("locked");
    expect(document.querySelectorAll(".guided-tour-focus-mask")).toHaveLength(0);
    expect(
      Array.from(
        document.querySelectorAll<HTMLElement>(".guided-tour-focus-shimmer")
      ).filter((element) => element.style.visibility === "visible")
    ).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Controls appear where you work")).toBeInTheDocument();
    expect(screen.getByText("6/13")).toBeInTheDocument();
    expect(onResumeInteractionStateChange).toHaveBeenLastCalledWith(
      "experience-overview"
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Add a work experience entry")).toBeInTheDocument();
    expect(screen.getByText("7/13")).toBeInTheDocument();
    expect(onResumeInteractionStateChange).toHaveBeenLastCalledWith(
      "experience-add"
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Edit fields and add bullets")).toBeInTheDocument();
    expect(screen.getByText("8/13")).toBeInTheDocument();
    expect(onResumeInteractionStateChange).toHaveBeenLastCalledWith(
      "experience-edit"
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Organize or remove entries")).toBeInTheDocument();
    expect(screen.getByText("9/13")).toBeInTheDocument();
    expect(onResumeInteractionStateChange).toHaveBeenLastCalledWith(
      "experience-organize"
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Improve bullets with AI Assist")).toBeInTheDocument();
    expect(screen.getByText("10/13")).toBeInTheDocument();
    expect(onResumeInteractionStateChange).toHaveBeenLastCalledWith(
      "experience-ai"
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Tag the focus of your experience")).toBeInTheDocument();
    expect(screen.getByText("11/13")).toBeInTheDocument();
    expect(onResumeInteractionStateChange).toHaveBeenLastCalledWith(
      "experience-tag"
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Your current version stays saved")).toBeInTheDocument();
    expect(screen.getByText("12/13")).toBeInTheDocument();
    expect(onResumeInteractionStateChange).toHaveBeenLastCalledWith("autosave");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Explore, then continue")).toBeInTheDocument();
    expect(screen.getByText("13/13")).toBeInTheDocument();
    expect(onResumeInteractionStateChange).toHaveBeenLastCalledWith("free");
    expect(onNavigationModeChange).toHaveBeenLastCalledWith("expanded");

    fireEvent.click(screen.getByRole("button", { name: "Finish tour" }));
    expect(screen.queryByText("Explore, then continue")).not.toBeInTheDocument();
    expect(onResumeInteractionStateChange).toHaveBeenLastCalledWith("idle");
  });

  it("moves between page sequences while each page owns its count", () => {
    const onNavigate = vi.fn();
    const onNavigationModeChange = vi.fn();
    const onDemoDataStateChange = vi.fn();
    const onHomeInteractionStateChange = vi.fn();
    const { rerender } = render(
      <>
        <div data-guided-tour="app-navigation" />
        <div data-guided-tour="home-workspace" />
        <div data-guided-tour="home-kanban" />
        <div data-guided-tour="home-controls" />
        <div data-guided-tour="home-processing" />
        <div data-guided-tour="home-offer-column" />
        <div data-guided-tour="home-accepted-column" />
        <div
          id="demo-email-juniper-offer"
          data-guided-tour="home-job-card"
        >
          <div data-guided-tour-action="toggle-email">Juniper offer</div>
        </div>
        <button data-guided-tour="app-about-navigation">About</button>
        <button data-guided-tour="app-dashboard-navigation">Dashboard</button>
        <button data-guided-tour="home-multi-select-control">Multi-Select</button>
        <button data-guided-tour="home-bulk-delete" title="Delete selected jobs">
          Bulk Delete
        </button>
        <button data-guided-tour="home-trash-control">Trash</button>
        <div role="dialog" aria-label="Confirm Deletion">
          <div className="modal"><button>Delete</button></div>
        </div>
        <div role="dialog" aria-label="Trash Bin">
          <div className="modal">
            Recently deleted
            <button type="button" title="Restore">Restore</button>
            <button type="button" aria-label="Close modal">x</button>
          </div>
        </div>
        <GuidedTour
          enabled
          startRequested
          currentPath="/home"
          onNavigate={onNavigate}
          onNavigationModeChange={onNavigationModeChange}
          onDemoDataStateChange={onDemoDataStateChange}
          onHomeInteractionStateChange={onHomeInteractionStateChange}
        />
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: /let’s begin/i }));
    expect(onNavigationModeChange).toHaveBeenLastCalledWith("locked");
    const persistentFocusShimmer = document.querySelector(
      ".guided-tour-focus-shimmer"
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Move through JAICE")).toBeInTheDocument();
    expect(screen.getByText("2/16")).toBeInTheDocument();
    expect(
      document.querySelectorAll(".guided-tour-focus-mask").length
    ).toBeGreaterThan(0);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onNavigationModeChange).toHaveBeenLastCalledWith(
      "expanded-locked"
    );
    expect(document.querySelector(".guided-tour-focus-shimmer")).toBe(
      persistentFocusShimmer
    );
    expect(
      document.querySelector<HTMLElement>(".guided-tour-focus-shimmer")
        ?.style.visibility
    ).toBe("visible");
    expect(
      document.querySelector<HTMLElement>(".guided-tour-focus-shimmer")
        ?.style.left
    ).toBe("0px");
    expect(
      document.querySelector<HTMLElement>(".guided-tour-focus-shimmer")
        ?.style.top
    ).toBe("0px");
    expect(
      document
        .querySelector(".guided-tour-focus-shimmer")
        ?.querySelectorAll(".focal-shimmer-particle")
    ).toHaveLength(60);
    expect(
      document.querySelectorAll(".guided-tour-focus-connector-particle")
    ).toHaveLength(42);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Controls in one place")).toBeInTheDocument();
    expect(screen.getByText("3/16")).toBeInTheDocument();
    expect(
      document.querySelectorAll(".guided-tour-focus-mask").length
    ).toBeGreaterThan(0);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onNavigationModeChange).toHaveBeenLastCalledWith("closed");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Organized by stage")).toBeInTheDocument();
    expect(screen.getByText("4/16")).toBeInTheDocument();
    expect(
      document.querySelectorAll(".guided-tour-focus-mask").length
    ).toBeGreaterThan(0);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onDemoDataStateChange).toHaveBeenLastCalledWith("hidden", 3);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("From inbox to workspace")).toBeInTheDocument();
    expect(screen.getByText("5/16")).toBeInTheDocument();
    expect(
      document.querySelectorAll(".guided-tour-focus-mask").length
    ).toBeGreaterThan(0);
    expect(onDemoDataStateChange).toHaveBeenLastCalledWith("processing", 4);
    expect(onNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("Organized by stage")).toBeInTheDocument();
    expect(onDemoDataStateChange).toHaveBeenLastCalledWith("hidden", 3);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onDemoDataStateChange).toHaveBeenLastCalledWith("processing", 4);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Sorted into place")).toBeInTheDocument();
    expect(screen.getByText("6/16")).toBeInTheDocument();
    expect(onDemoDataStateChange).toHaveBeenLastCalledWith("sorted", 5);
    expect(
      document.querySelector(".guided-tour-focus-connector-particle")
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onDemoDataStateChange).toHaveBeenLastCalledWith("processing", 4);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onDemoDataStateChange).toHaveBeenLastCalledWith("sorted", 5);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("More actions on demand")).toBeInTheDocument();
    expect(screen.getByText("7/16")).toBeInTheDocument();
    expect(onDemoDataStateChange).toHaveBeenLastCalledWith("sorted", 6);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Read the full email")).toBeInTheDocument();
    expect(screen.getByText("8/16")).toBeInTheDocument();
    expect(onDemoDataStateChange).toHaveBeenLastCalledWith("sorted", 7);

    fireEvent.click(screen.getByRole("button", { name: "Open card" }));
    expect(screen.getByText("Update a stage manually")).toBeInTheDocument();
    expect(screen.getByText("9/16")).toBeInTheDocument();
    expect(onDemoDataStateChange).toHaveBeenLastCalledWith("sorted", 8);
    expect(
      Array.from(
        document.querySelectorAll<HTMLElement>(
          ".guided-tour-focus-shimmer"
        )
      ).filter((element) => element.style.visibility === "visible")
    ).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("Read the full email")).toBeInTheDocument();
    expect(onDemoDataStateChange).toHaveBeenLastCalledWith("sorted", 7);
    fireEvent.click(screen.getByRole("button", { name: "Open card" }));
    expect(screen.getByText("Update a stage manually")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Move to Accepted" }));
    expect(screen.getByText("Start a bulk action")).toBeInTheDocument();
    expect(screen.getByText("10/16")).toBeInTheDocument();
    expect(onHomeInteractionStateChange).toHaveBeenLastCalledWith(
      "select-control"
    );
    expect(
      screen.getByRole("button", { name: "Select Multi-Select" })
    ).toBeEnabled();

    fireEvent.click(
      screen.getByRole("button", { name: "Select Multi-Select" })
    );
    expect(screen.getByText("Choose three emails")).toBeInTheDocument();
    expect(screen.getByText("11/16")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("Start a bulk action")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Multi-Select"));
    expect(screen.getByText("Choose three emails")).toBeInTheDocument();
    expect(screen.getByText("11/16")).toBeInTheDocument();
    expect(onHomeInteractionStateChange).toHaveBeenLastCalledWith(
      "selecting-cards"
    );
    expect(
      document.querySelector(".guided-tour-focus-connector-particle")
    ).not.toBeInTheDocument();

    const completeGuidedSelection = () =>
      window.dispatchEvent(
        new CustomEvent("guided-tour-selection-count", {
          detail: { count: 3 },
        })
      );
    window.addEventListener(
      "guided-tour-select-interview",
      completeGuidedSelection
    );
    expect(
      screen.getByRole("button", { name: "Select 3 cards" })
    ).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Select 3 cards" }));
    window.removeEventListener(
      "guided-tour-select-interview",
      completeGuidedSelection
    );
    expect(screen.getByText("Delete as a group")).toBeInTheDocument();
    expect(screen.getByText("12/16")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Select Delete" }));
    expect(screen.getByText("Confirm destructive changes")).toBeInTheDocument();
    expect(screen.getByText("13/16")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));
    expect(screen.getByText("Open recently deleted")).toBeInTheDocument();
    expect(screen.getByText("14/16")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open Trash" }));
    expect(screen.getByText("Recover recent changes")).toBeInTheDocument();
    expect(screen.getByText("15/16")).toBeInTheDocument();

    fireEvent(window, new CustomEvent("guided-tour-trash-restored"));
    expect(screen.getByText("Explore, then continue")).toBeInTheDocument();
    expect(screen.getByText("16/16")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
    expect(screen.getByText("Explore, then continue")).toBeInTheDocument();
    expect(screen.getByText("16/16")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Explore, then continue")).toBeInTheDocument();
    expect(screen.getByText("16/16")).toBeInTheDocument();
    expect(onHomeInteractionStateChange).toHaveBeenLastCalledWith("free");
    expect(
      screen.getByRole("button", { name: "Select About" })
    ).toBeEnabled();
    expect(onNavigationModeChange).toHaveBeenLastCalledWith("about-only");
    expect(document.querySelectorAll(".guided-tour-focus-mask")).toHaveLength(
      0
    );
    expect(
      document.querySelector(".guided-tour-focus-connector-particle")
    ).not.toBeInTheDocument();
    expect(
      Array.from(
        document.querySelectorAll<HTMLElement>(".guided-tour-focus-shimmer")
      ).filter((element) => element.style.visibility === "visible")
    ).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Select About" }));
    expect(onNavigate).toHaveBeenLastCalledWith("/auth-about");

    rerender(
      <>
        <div data-guided-tour="app-navigation" />
        <div data-guided-tour="home-workspace" />
        <div data-guided-tour="home-kanban" />
        <div data-guided-tour="home-controls" />
        <div data-guided-tour="home-processing" />
        <div data-guided-tour="home-offer-column" />
        <div data-guided-tour="home-accepted-column" />
        <div
          id="demo-email-juniper-offer"
          data-guided-tour="home-job-card"
        />
        <button data-guided-tour="app-about-navigation">About</button>
        <button data-guided-tour="app-dashboard-navigation">Dashboard</button>
        <button data-guided-tour="home-multi-select-control">Multi-Select</button>
        <button data-guided-tour="home-bulk-delete" title="Delete selected jobs">
          Bulk Delete
        </button>
        <button data-guided-tour="home-trash-control">Trash</button>
        <div role="dialog" aria-label="Confirm Deletion">
          <div className="modal"><button>Delete</button></div>
        </div>
        <div role="dialog" aria-label="Trash Bin">
          <div className="modal">Recently deleted</div>
        </div>
        <GuidedTour
          enabled
          startRequested={false}
          currentPath="/auth-about"
          onNavigate={onNavigate}
          onNavigationModeChange={onNavigationModeChange}
          onDemoDataStateChange={onDemoDataStateChange}
          onHomeInteractionStateChange={onHomeInteractionStateChange}
        />
      </>
    );

    expect(screen.getByText("About JAICE")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This is where you can learn about the inspiration behind the project and the developers. When you’re ready, tap Dashboard or click Next."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("1/1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
    expect(onNavigationModeChange).toHaveBeenLastCalledWith("dashboard-only");
    expect(
      Array.from(
        document.querySelectorAll<HTMLElement>(".guided-tour-focus-shimmer")
      ).filter((element) => element.style.visibility === "visible")
    ).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onNavigate).toHaveBeenLastCalledWith("/dashboard");
  });

  it("advances from hover to open and can replay the interaction after going back", () => {
    vi.useFakeTimers();

    render(
      <>
        <div data-guided-tour="app-navigation" />
        <div data-guided-tour="home-workspace" />
        <div data-guided-tour="home-kanban" />
        <div data-guided-tour="home-controls" />
        <div data-guided-tour="home-processing" />
        <div data-guided-tour="home-offer-column">
          <div id="demo-email-juniper-offer">
            <div data-guided-tour-action="toggle-email">Juniper offer</div>
          </div>
        </div>
        <div data-guided-tour="home-accepted-column" />
        <GuidedTour
          enabled
          startRequested
          currentPath="/home"
          onNavigate={vi.fn()}
        />
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: /let’s begin/i }));
    for (let next = 0; next < 6; next += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }

    expect(screen.getByText("More actions on demand")).toBeInTheDocument();
    expect(screen.getByText("7/16")).toBeInTheDocument();
    const hoverProgress = screen.getByRole("progressbar", {
      name: "Offer card hover progress",
    });
    expect(hoverProgress).toHaveAttribute(
      "aria-valuetext",
      "Hover over the offer card to start"
    );

    fireEvent.pointerOver(screen.getByText("Juniper offer"));
    expect(hoverProgress).toHaveClass("guided-tour-hover-progress--active");
    expect(hoverProgress).toHaveAttribute(
      "aria-valuetext",
      "Hovering for three seconds"
    );
    act(() => vi.advanceTimersByTime(2_999));
    expect(screen.getByText("More actions on demand")).toBeInTheDocument();

    fireEvent.pointerOut(screen.getByText("Juniper offer"));
    expect(hoverProgress).not.toHaveClass("guided-tour-hover-progress--active");
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("More actions on demand")).toBeInTheDocument();

    fireEvent.pointerOver(screen.getByText("Juniper offer"));
    act(() => vi.advanceTimersByTime(3_000));
    expect(screen.getByText("Read the full email")).toBeInTheDocument();
    expect(screen.getByText("8/16")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Juniper offer"));
    expect(screen.getByText("Update a stage manually")).toBeInTheDocument();
    expect(screen.getByText("9/16")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Move to Accepted" }));
    expect(screen.getByText("Start a bulk action")).toBeInTheDocument();
    expect(screen.getByText("10/16")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    fireEvent(
      window,
      new CustomEvent(JOB_LOCAL_CHANGE_EVENT, {
        detail: {
          before: {
            id: "demo-email-juniper-offer",
            column: "offer",
            applicationStage: "offer",
          },
          after: {
            id: "demo-email-juniper-offer",
            column: "accepted",
            applicationStage: "accepted",
          },
        },
      })
    );
    expect(screen.getByText("Start a bulk action")).toBeInTheDocument();
    expect(screen.getByText("10/16")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("Update a stage manually")).toBeInTheDocument();
    expect(screen.getByText("9/16")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("Read the full email")).toBeInTheDocument();
    expect(screen.getByText("8/16")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("More actions on demand")).toBeInTheDocument();
    expect(screen.getByText("7/16")).toBeInTheDocument();

    fireEvent.pointerOver(screen.getByText("Juniper offer"));
    act(() => vi.advanceTimersByTime(3_000));
    expect(screen.getByText("Read the full email")).toBeInTheDocument();
    expect(screen.getByText("8/16")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open card" }));
    expect(screen.getByText("Update a stage manually")).toBeInTheDocument();
    expect(screen.getByText("9/16")).toBeInTheDocument();
  });

  it("moves through bulk deletion and resets each presentation when going back", () => {
    render(
      <>
        <div data-guided-tour="app-navigation" />
        <div data-guided-tour="home-workspace" />
        <div data-guided-tour="home-kanban" />
        <div id="demo-email-juniper-offer">
          <div data-guided-tour-action="toggle-email">Juniper offer</div>
        </div>
        <button data-guided-tour="home-multi-select-control">Multi-Select</button>
        <button data-guided-tour="home-bulk-delete" title="Delete selected jobs">
          Bulk delete
        </button>
        <button data-guided-tour="home-trash-control">Trash</button>
        <div role="dialog" aria-label="Confirm Deletion">
          <div className="modal">
            <button type="button">Delete</button>
          </div>
        </div>
        <div role="dialog" aria-label="Trash Bin">
          <div className="modal">Recently deleted</div>
        </div>
        <GuidedTour
          enabled
          startRequested
          currentPath="/home"
          onNavigate={vi.fn()}
        />
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: /let’s begin/i }));
    for (let next = 0; next < 7; next += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Open card" }));
    fireEvent.click(screen.getByRole("button", { name: "Move to Accepted" }));

    expect(screen.getByText("Start a bulk action")).toBeInTheDocument();
    expect(screen.getByText("10/16")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Multi-Select"));
    expect(screen.getByText("Choose three emails")).toBeInTheDocument();
    fireEvent(
      window,
      new CustomEvent("guided-tour-selection-count", {
        detail: { count: 3 },
      })
    );
    expect(screen.getByText("Delete as a group")).toBeInTheDocument();
    expect(screen.getByText("12/16")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Delete selected jobs"));
    expect(screen.getByText("Confirm destructive changes")).toBeInTheDocument();
    expect(screen.getByText("13/16")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Open recently deleted")).toBeInTheDocument();
    expect(screen.getByText("14/16")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Trash"));
    expect(screen.getByText("Recover recent changes")).toBeInTheDocument();
    expect(screen.getByText("15/16")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Explore, then continue")).toBeInTheDocument();
    expect(screen.getByText("16/16")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select About" })
    ).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("Recover recent changes")).toBeInTheDocument();
    expect(screen.getByText("15/16")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("Open recently deleted")).toBeInTheDocument();
    expect(screen.getByText("14/16")).toBeInTheDocument();
  });

  it("stays absent outside demo mode and beneath the viewport guard", () => {
    const disabledTour = render(
      <GuidedTour
        enabled={false}
        startRequested
        currentPath="/home"
        onNavigate={vi.fn()}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    disabledTour.unmount();

    const suppressedTour = render(
      <GuidedTour
        enabled
        startRequested
        currentPath="/home"
        isSuppressed
        onNavigate={vi.fn()}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    suppressedTour.rerender(
      <GuidedTour
        enabled
        startRequested
        currentPath="/home"
        onNavigate={vi.fn()}
      />
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("resumes the full tour after refreshing the application shell", () => {
    const firstTour = render(
      <GuidedTour
        enabled
        startRequested
        currentPath="/home"
        onNavigate={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /let’s begin/i }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("From inbox to workspace")).toBeInTheDocument();
    firstTour.unmount();

    render(
      <GuidedTour
        enabled
        startRequested={false}
        currentPath="/home"
        onNavigate={vi.fn()}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("From inbox to workspace")).toBeInTheDocument();
    expect(screen.getByText("5/16")).toBeInTheDocument();
  });

  it("resumes a page refresher at the same step after refresh", () => {
    const firstTour = render(
      <GuidedTour
        enabled
        startRequested={false}
        pageTourRequest={{ id: 1, route: "/dashboard" }}
        currentPath="/dashboard"
        onNavigate={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Reading the Dashboard")).toBeInTheDocument();
    expect(screen.getByText("3/6")).toBeInTheDocument();
    firstTour.unmount();

    render(
      <GuidedTour
        enabled
        startRequested={false}
        currentPath="/dashboard"
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByText("Reading the Dashboard")).toBeInTheDocument();
    expect(screen.getByText("3/6")).toBeInTheDocument();
  });

  it("returns a completed page refresher to free roam without navigating", () => {
    const onNavigate = vi.fn();
    const onTourActiveChange = vi.fn();
    const pageTourRequest = { id: 1, route: "/auth-about" };
    const { rerender } = render(
      <GuidedTour
        enabled
        startRequested={false}
        pageTourRequest={pageTourRequest}
        currentPath="/auth-about"
        onNavigate={onNavigate}
        onTourActiveChange={onTourActiveChange}
      />
    );

    expect(screen.getByText("About JAICE")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Return to free roam" })
    );

    expect(screen.queryByLabelText("JAICE guided tour")).not.toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onTourActiveChange).toHaveBeenLastCalledWith(false);
    expect(
      window.localStorage.getItem("jaice-demo-guided-tour-session")
    ).toBeNull();

    rerender(
      <GuidedTour
        enabled
        startRequested={false}
        pageTourRequest={pageTourRequest}
        currentPath="/dashboard"
        onNavigate={onNavigate}
        onTourActiveChange={onTourActiveChange}
      />
    );

    expect(screen.queryByLabelText("JAICE guided tour")).not.toBeInTheDocument();
  });

  it("ends a page refresher when the user navigates to another page", () => {
    const pageTourRequest = { id: 1, route: "/dashboard" };
    const onTourActiveChange = vi.fn();
    const { rerender } = render(
      <GuidedTour
        enabled
        startRequested={false}
        pageTourRequest={pageTourRequest}
        currentPath="/dashboard"
        onNavigate={vi.fn()}
        onTourActiveChange={onTourActiveChange}
      />
    );

    expect(screen.getByText("Your progress at a glance")).toBeInTheDocument();

    rerender(
      <GuidedTour
        enabled
        startRequested={false}
        pageTourRequest={pageTourRequest}
        currentPath="/resume"
        onNavigate={vi.fn()}
        onTourActiveChange={onTourActiveChange}
      />
    );

    expect(screen.queryByLabelText("JAICE guided tour")).not.toBeInTheDocument();
    expect(onTourActiveChange).toHaveBeenLastCalledWith(false);
  });
});
