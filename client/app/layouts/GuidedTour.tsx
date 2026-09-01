import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { FocalShimmer } from "@/global-components/FocalShimmer";
import {
  GUIDED_TOUR_SECTIONS,
  type GuidedTourDemoDataState,
  type GuidedTourHomeInteractionState,
  type GuidedTourNavigationMode,
  type GuidedTourSpotlightTarget,
} from "./guidedTourSteps";
import {
  JOB_LOCAL_CHANGE_EVENT,
  type JobLocalChangeDetail,
} from "@/pages/home/utils/jobLocalChangeEvent";

type GuidedTourProps = {
  enabled: boolean;
  startRequested: boolean;
  currentPath: string;
  isSuppressed?: boolean;
  onNavigate: (route: string) => void;
  onNavigationModeChange?: (mode: GuidedTourNavigationMode) => void;
  onDemoDataStateChange?: (
    state: GuidedTourDemoDataState,
    revision: number
  ) => void;
  onHomeInteractionStateChange?: (
    state: GuidedTourHomeInteractionState
  ) => void;
};

type TourPhase = "inactive" | "welcome" | "active";

type SpotlightRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
};

const FOCUS_SHIMMER_INSET = 0;
const MAX_FOCUS_SHIMMERS = 8;
const SCROLL_TRACKED_TOUR_ROUTES = new Set(["/auth-about", "/dashboard"]);
const CONNECTOR_PARTICLES = Array.from({ length: 42 }, (_, index) => ({
  progress: (((index * 47) % 97) + 1) / 100,
  offset: ((index * 31) % 13) - 6,
  size: 0.65 + ((index * 19) % 11) / 10,
  delay: -((index * 0.57) % 4.9),
  duration: 2.9 + ((index * 23) % 19) / 10,
})).sort((first, second) => first.progress - second.progress);

function getTargetElements(target?: GuidedTourSpotlightTarget) {
  if (!target) return [];

  const elements =
    target === "home-job-cards"
      ? Array.from(
          document.querySelectorAll<HTMLElement>(
            '[data-guided-tour="home-job-card"]'
          )
        )
      : target === "home-offer-card"
        ? [document.querySelector<HTMLElement>("#demo-email-juniper-offer")]
        : target === "home-offer-card-accepted-column"
          ? [
              document.querySelector<HTMLElement>(
                "#demo-email-juniper-offer"
              ),
              document.querySelector<HTMLElement>(
                '[data-guided-tour="home-accepted-column"]'
              ),
            ]
        : target === "home-offer-accepted-columns"
          ? [
              document.querySelector<HTMLElement>(
                '[data-guided-tour="home-offer-column"]'
              ),
              document.querySelector<HTMLElement>(
                '[data-guided-tour="home-accepted-column"]'
              ),
            ]
          : target === "home-delete-confirmation"
            ? [
                document.querySelector<HTMLElement>(
                  '[role="dialog"][aria-label="Confirm Deletion"] .modal'
                ),
              ]
            : target === "home-trash-modal"
              ? [
                  document.querySelector<HTMLElement>(
                    '[role="dialog"][aria-label="Trash Bin"] .modal'
                  ),
                ]
              : [
                  document.querySelector<HTMLElement>(
                    `[data-guided-tour="${target}"]`
                  ),
                ];

  return elements.filter(
    (element): element is HTMLElement => element !== null
  );
}

function useTargetRects(target?: GuidedTourSpotlightTarget) {
  const [rects, setRects] = useState<SpotlightRect[]>([]);

  useEffect(() => {
    if (!target) {
      setRects([]);
      return;
    }

    let observedElements: HTMLElement[] = [];
    let animationFrame = 0;
    const updateRects = () => {
      const nextRects = observedElements
        .slice(0, MAX_FOCUS_SHIMMERS)
        .map((element) => element.getBoundingClientRect())
        .map((rect) => ({
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
        }));

      setRects((currentRects) => {
        const unchanged =
          currentRects.length === nextRects.length &&
          nextRects.every((rect, index) => {
            const current = currentRects[index];
            return (
              Math.abs(current.top - rect.top) < 0.25 &&
              Math.abs(current.left - rect.left) < 0.25 &&
              Math.abs(current.right - rect.right) < 0.25 &&
              Math.abs(current.bottom - rect.bottom) < 0.25
            );
          });
        return unchanged ? currentRects : nextRects;
      });
    };
    const followLayout = () => {
      updateRects();
      animationFrame = window.requestAnimationFrame(followLayout);
    };
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateRects);
    const syncTarget = () => {
      const nextElements = getTargetElements(target);
      const targetsUnchanged =
        nextElements.length === observedElements.length &&
        nextElements.every(
          (element, index) => element === observedElements[index]
        );

      if (!targetsUnchanged) {
        resizeObserver?.disconnect();
        observedElements = nextElements;
        observedElements.forEach((element) => resizeObserver?.observe(element));
      }
      updateRects();
    };
    const mutationObserver =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(syncTarget);

    syncTarget();
    animationFrame = window.requestAnimationFrame(followLayout);
    mutationObserver?.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", syncTarget);

    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", syncTarget);
    };
  }, [target]);

  return rects;
}

function combineRects(rects: SpotlightRect[]) {
  if (rects.length === 0) return null;
  return {
    top: Math.min(...rects.map((rect) => rect.top)),
    left: Math.min(...rects.map((rect) => rect.left)),
    right: Math.max(...rects.map((rect) => rect.right)),
    bottom: Math.max(...rects.map((rect) => rect.bottom)),
  };
}

function getRectEdgePoint(rect: SpotlightRect, toward: { x: number; y: number }) {
  const center = {
    x: (rect.left + rect.right) / 2,
    y: (rect.top + rect.bottom) / 2,
  };
  const halfWidth = Math.max(0, (rect.right - rect.left) / 2);
  const halfHeight = Math.max(0, (rect.bottom - rect.top) / 2);
  const deltaX = toward.x - center.x;
  const deltaY = toward.y - center.y;
  const scale = Math.min(
    deltaX === 0 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(deltaX),
    deltaY === 0 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(deltaY)
  );

  if (!Number.isFinite(scale)) return center;
  return {
    x: center.x + deltaX * scale,
    y: center.y + deltaY * scale,
  };
}

function GuidedTourSpotlight({
  target,
  shimmerTarget = target,
  showConnector = true,
}: {
  target?: GuidedTourSpotlightTarget;
  shimmerTarget?: GuidedTourSpotlightTarget;
  showConnector?: boolean;
}) {
  const spotlightRects = useTargetRects(target);
  const shimmerRects = useTargetRects(shimmerTarget);
  const cardRects = useTargetRects("guided-tour-card" as GuidedTourSpotlightTarget);
  const combinedRect = combineRects(spotlightRects);
  const combinedShimmerRect = combineRects(shimmerRects);
  const cardRect = cardRects[0] ?? null;
  const targetCenter = combinedShimmerRect
    ? {
        x: (combinedShimmerRect.left + combinedShimmerRect.right) / 2,
        y: (combinedShimmerRect.top + combinedShimmerRect.bottom) / 2,
      }
    : null;
  const cardCenter = cardRect
    ? {
        x: (cardRect.left + cardRect.right) / 2,
        y: (cardRect.top + cardRect.bottom) / 2,
      }
    : null;
  const connectorStart =
    cardRect && targetCenter
      ? getRectEdgePoint(cardRect, targetCenter)
      : null;
  const connectorEnd =
    combinedShimmerRect && cardCenter
      ? getRectEdgePoint(combinedShimmerRect, cardCenter)
      : null;

  return createPortal(
    <>
      {target && combinedRect && (
        <div className="guided-tour-focus-mask-layer" aria-hidden="true">
          <span
            className="guided-tour-focus-mask guided-tour-focus-mask-top"
            style={{ height: Math.max(0, combinedRect.top) }}
          />
          <span
            className="guided-tour-focus-mask guided-tour-focus-mask-left"
            style={{
              top: combinedRect.top,
              width: Math.max(0, combinedRect.left),
              height: Math.max(0, combinedRect.bottom - combinedRect.top),
            }}
          />
          <span
            className="guided-tour-focus-mask guided-tour-focus-mask-right"
            style={{
              top: combinedRect.top,
              left: combinedRect.right,
              height: Math.max(0, combinedRect.bottom - combinedRect.top),
            }}
          />
          <span
            className="guided-tour-focus-mask guided-tour-focus-mask-bottom"
            style={{ top: combinedRect.bottom }}
          />
        </div>
      )}
      {Array.from({ length: MAX_FOCUS_SHIMMERS }, (_, index) => {
        const rect = shimmerRects[index];
        return (
          <FocalShimmer
            key={index}
            className="guided-tour-focus-shimmer"
            aria-hidden="true"
            style={
              rect
                ? {
                    top: rect.top + FOCUS_SHIMMER_INSET,
                    left: rect.left + FOCUS_SHIMMER_INSET,
                    width: Math.max(
                      0,
                      rect.right - rect.left - FOCUS_SHIMMER_INSET * 2
                    ),
                    height: Math.max(
                      0,
                      rect.bottom - rect.top - FOCUS_SHIMMER_INSET * 2
                    ),
                    visibility: "visible",
                  }
                : { visibility: "hidden" }
            }
          />
        );
      })}
      <svg
        className="guided-tour-focus-connector"
        aria-hidden="true"
        width="100%"
        height="100%"
      >
        {showConnector && connectorStart && connectorEnd &&
          CONNECTOR_PARTICLES.map((particle, index) => {
            const deltaX = connectorEnd.x - connectorStart.x;
            const deltaY = connectorEnd.y - connectorStart.y;
            const length = Math.hypot(deltaX, deltaY) || 1;
            const normalX = -deltaY / length;
            const normalY = deltaX / length;
            const x =
              connectorStart.x +
              deltaX * particle.progress +
              normalX * particle.offset;
            const y =
              connectorStart.y +
              deltaY * particle.progress +
              normalY * particle.offset;
            const style = {
              animationDelay: `${particle.delay.toFixed(2)}s`,
              animationDuration: `${particle.duration.toFixed(2)}s`,
              "--connector-drift-x": `${(
                (((index * 17) % 9) - 4) *
                0.4
              ).toFixed(2)}px`,
              "--connector-drift-y": `${(
                (((index * 29) % 11) - 5) *
                0.35
              ).toFixed(2)}px`,
            } as CSSProperties;

            return (
              <circle
                key={index}
                className="guided-tour-focus-connector-particle"
                cx={x}
                cy={y}
                r={particle.size}
                style={style}
              />
            );
          })}
      </svg>
    </>,
    document.body
  );
}

export function GuidedTour({
  enabled,
  startRequested,
  currentPath,
  isSuppressed = false,
  onNavigate,
  onNavigationModeChange,
  onDemoDataStateChange,
  onHomeInteractionStateChange,
}: GuidedTourProps) {
  const [phase, setPhase] = useState<TourPhase>(() =>
    enabled && startRequested ? "welcome" : "inactive"
  );
  const [sectionIndex, setSectionIndex] = useState(() => {
    const matchingSection = GUIDED_TOUR_SECTIONS.findIndex(
      (section) => section.route === currentPath
    );
    return matchingSection >= 0 ? matchingSection : 0;
  });
  const [pageProgress, setPageProgress] = useState<Record<string, number>>({});
  const welcomeRef = useRef<HTMLDivElement>(null);

  const showWelcome = enabled && phase === "welcome" && !isSuppressed;
  const showSteps = enabled && phase === "active" && !isSuppressed;
  const section = GUIDED_TOUR_SECTIONS[sectionIndex];
  const stepIndex = pageProgress[section.route] ?? 0;
  const step = section.steps[stepIndex];

  useEffect(() => {
    const navigationMode = showSteps
      ? step.navigationMode ?? "closed"
      : "closed";
    onNavigationModeChange?.(navigationMode);

    return () => onNavigationModeChange?.("closed");
  }, [onNavigationModeChange, showSteps, step.navigationMode]);

  useEffect(() => {
    if (!showSteps) return;

    const isHome = section.route === "/home";
    if (isHome) {
      onDemoDataStateChange?.(step.demoDataState ?? "hidden", stepIndex);
    }
    onHomeInteractionStateChange?.(
      isHome ? step.homeInteractionState ?? "idle" : "idle"
    );
  }, [
    onDemoDataStateChange,
    onHomeInteractionStateChange,
    section.route,
    showSteps,
    step.demoDataState,
    step.homeInteractionState,
    stepIndex,
  ]);

  useEffect(() => {
    if (!showSteps || section.route !== "/home") return;

    const isOfferCardEvent = (event: Event) =>
      event.target instanceof Element &&
      Boolean(event.target.closest("#demo-email-juniper-offer"));
    const advanceHomeStep = () => {
      setPageProgress((progress) => ({
        ...progress,
        [section.route]: stepIndex + 1,
      }));
    };
    const handleOfferHover = (event: Event) => {
      if (stepIndex === 6 && isOfferCardEvent(event)) advanceHomeStep();
    };
    const handleOfferOpen = (event: Event) => {
      if (
        stepIndex === 7 &&
        isOfferCardEvent(event) &&
        event.target instanceof Element &&
        event.target.closest('[data-guided-tour-action="toggle-email"]')
      ) {
        advanceHomeStep();
      }
    };
    const handleBulkDelete = (event: Event) => {
      if (
        stepIndex === 11 &&
        event.target instanceof Element &&
        event.target.closest('[title="Delete selected jobs"]')
      ) {
        advanceHomeStep();
      }
    };
    const handleDeleteConfirmation = (event: Event) => {
      if (!(event.target instanceof Element) || stepIndex !== 12) return;

      const button = event.target.closest("button");
      const dialog = event.target.closest(
        '[role="dialog"][aria-label="Confirm Deletion"]'
      );
      if (dialog && button?.textContent?.trim() === "Delete") {
        advanceHomeStep();
      }
    };
    const handleMultiSelect = (event: Event) => {
      if (
        stepIndex === 9 &&
        event.target instanceof Element &&
        event.target.closest('[data-guided-tour="home-multi-select-control"]')
      ) {
        advanceHomeStep();
      }
    };
    const handleTrashOpen = (event: Event) => {
      if (
        stepIndex === 13 &&
        event.target instanceof Element &&
        event.target.closest('[data-guided-tour="home-trash-control"]')
      ) {
        advanceHomeStep();
      }
    };
    const handleTrashCompletion = (event: Event) => {
      if (!(event.target instanceof Element) || stepIndex !== 14) return;

      const dialog = event.target.closest(
        '[role="dialog"][aria-label="Trash Bin"]'
      );
      const button = event.target.closest("button");
      const action = button?.getAttribute("aria-label") ?? button?.title;

      if (dialog && action === "Close modal") {
        advanceHomeStep();
      }
    };
    const handleTrashRestore = () => {
      if (stepIndex === 14) advanceHomeStep();
    };
    const handleSelectionCount = (event: Event) => {
      if (
        stepIndex === 10 &&
        event instanceof CustomEvent &&
        event.detail?.count === 3
      ) {
        advanceHomeStep();
      }
    };
    const handleManualStageUpdate = (event: Event) => {
      if (stepIndex !== 8 || !(event instanceof CustomEvent)) return;

      const { after } = event.detail as JobLocalChangeDetail;
      if (
        after?.id === "demo-email-juniper-offer" &&
        (after.column === "accepted" || after.applicationStage === "accepted")
      ) {
        advanceHomeStep();
      }
    };
    const handleTourClick = (event: Event) => {
      handleOfferOpen(event);
      handleMultiSelect(event);
      handleBulkDelete(event);
      handleDeleteConfirmation(event);
      handleTrashOpen(event);
      handleTrashCompletion(event);
    };

    document.addEventListener("pointerover", handleOfferHover);
    document.addEventListener("click", handleTourClick);
    window.addEventListener(
      "guided-tour-selection-count",
      handleSelectionCount
    );
    window.addEventListener(JOB_LOCAL_CHANGE_EVENT, handleManualStageUpdate);
    window.addEventListener(
      "guided-tour-trash-restored",
      handleTrashRestore
    );

    return () => {
      document.removeEventListener("pointerover", handleOfferHover);
      document.removeEventListener("click", handleTourClick);
      window.removeEventListener(
        "guided-tour-selection-count",
        handleSelectionCount
      );
      window.removeEventListener(
        JOB_LOCAL_CHANGE_EVENT,
        handleManualStageUpdate
      );
      window.removeEventListener(
        "guided-tour-trash-restored",
        handleTrashRestore
      );
    };
  }, [section.route, showSteps, stepIndex]);

  useEffect(() => {
    if (phase !== "active") return;

    const matchingSection = GUIDED_TOUR_SECTIONS.findIndex(
      (section) => section.route === currentPath
    );
    if (matchingSection >= 0) setSectionIndex(matchingSection);
  }, [currentPath, phase]);

  useEffect(() => {
    if (!showSteps || !SCROLL_TRACKED_TOUR_ROUTES.has(section.route)) return;

    const scrollCanvas = document.querySelector<HTMLElement>(
      ".outlet-container"
    );
    const guideCard = document.querySelector<HTMLElement>(
      '[data-guided-tour="guided-tour-card"]'
    );
    if (!scrollCanvas || !guideCard) return;

    const updateGuidePlacement = () => {
      const remainingScroll =
        scrollCanvas.scrollHeight -
        scrollCanvas.scrollTop -
        scrollCanvas.clientHeight;
      const hasScrollableContent =
        scrollCanvas.scrollHeight > scrollCanvas.clientHeight + 1;
      const travelRange = Math.min(
        320,
        Math.max(160, scrollCanvas.clientHeight * 0.35)
      );
      const scrollProgress = hasScrollableContent
        ? Math.min(1, Math.max(0, 1 - remainingScroll / travelRange))
        : 0;
      const topEdge = 96;
      const bottomEdge =
        window.innerHeight - guideCard.getBoundingClientRect().height - 24;
      const travelDistance = Math.max(0, bottomEdge - topEdge);
      const offset = travelDistance * (1 - scrollProgress);

      guideCard.style.setProperty(
        "--guided-tour-card-offset",
        `${offset}px`
      );
      guideCard.dataset.guidePlacement =
        scrollProgress >= 0.99
          ? "top"
          : scrollProgress <= 0.01
            ? "bottom"
            : "moving";
    };

    updateGuidePlacement();
    scrollCanvas.addEventListener("scroll", updateGuidePlacement, {
      passive: true,
    });
    window.addEventListener("resize", updateGuidePlacement);

    return () => {
      scrollCanvas.removeEventListener("scroll", updateGuidePlacement);
      window.removeEventListener("resize", updateGuidePlacement);
      guideCard.style.removeProperty("--guided-tour-card-offset");
      guideCard.dataset.guidePlacement = "bottom";
    };
  }, [section.route, showSteps]);

  useEffect(() => {
    if (!showWelcome) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const keepInputInWelcome = (event: Event) => {
      if (welcomeRef.current?.contains(event.target as Node)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };
    const keepFocusInWelcome = (event: FocusEvent) => {
      if (!welcomeRef.current?.contains(event.target as Node)) {
        welcomeRef.current
          ?.querySelector<HTMLElement>("button")
          ?.focus();
      }
    };
    const blockedEvents = [
      "click",
      "pointerdown",
      "wheel",
      "touchmove",
      "keydown",
      "input",
      "change",
      "submit",
    ];

    document.body.style.overflow = "hidden";
    blockedEvents.forEach((eventName) =>
      document.addEventListener(eventName, keepInputInWelcome, {
        capture: true,
        passive: false,
      })
    );
    document.addEventListener("focusin", keepFocusInWelcome, true);
    welcomeRef.current?.querySelector<HTMLElement>("button")?.focus();

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      blockedEvents.forEach((eventName) =>
        document.removeEventListener(eventName, keepInputInWelcome, true)
      );
      document.removeEventListener("focusin", keepFocusInWelcome, true);
      previouslyFocused?.focus();
    };
  }, [showWelcome]);

  if (!showWelcome && !showSteps) return null;

  if (showWelcome) {
    return createPortal(
      <div className="guided-tour-welcome-overlay">
        <div
          ref={welcomeRef}
          className="guided-tour-welcome-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guided-tour-welcome-title"
          aria-describedby="guided-tour-welcome-description"
        >
          <p className="guided-tour-welcome-eyebrow">Guided tour</p>
          <h1 id="guided-tour-welcome-title">
            Welcome to the guided tour of JAICE
          </h1>
          <p id="guided-tour-welcome-description">
            JAICE turns job-search emails into an organized view of
            applications, next steps, and progress. We’ll walk through the
            major features across each workspace.
          </p>
          <div className="guided-tour-welcome-actions">
            <button type="button" onClick={() => setPhase("active")}>
              Let’s begin
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const isFirstTourStep = sectionIndex === 0 && stepIndex === 0;
  const isLastTourStep =
    sectionIndex === GUIDED_TOUR_SECTIONS.length - 1 &&
    stepIndex === section.steps.length - 1;

  const moveBackward = () => {
    if (stepIndex > 0) {
      setPageProgress((progress) => ({
        ...progress,
        [section.route]: stepIndex - 1,
      }));
      return;
    }

    const previousSection = GUIDED_TOUR_SECTIONS[sectionIndex - 1];
    if (!previousSection) return;
    setSectionIndex(sectionIndex - 1);
    onNavigate(previousSection.route);
  };

  const moveForward = () => {
    if (stepIndex < section.steps.length - 1) {
      setPageProgress((progress) => ({
        ...progress,
        [section.route]: stepIndex + 1,
      }));
      return;
    }

    const nextSection = GUIDED_TOUR_SECTIONS[sectionIndex + 1];
    if (!nextSection) return;
    setSectionIndex(sectionIndex + 1);
    onNavigate(nextSection.route);
  };

  const runForwardAction = () => {
    if (step.actionEvent) {
      window.dispatchEvent(new CustomEvent(step.actionEvent));
      if (step.actionAdvances) moveForward();
      return;
    }
    if (step.actionTarget) {
      const target = getTargetElements(step.actionTarget)[0];
      const clickables = target
        ? [
            ...(target.matches('button, [role="button"]') ? [target] : []),
            ...Array.from(
              target.querySelectorAll<HTMLElement>('button, [role="button"]')
            ),
          ]
        : [];
      const control = step.actionControlLabel
        ? clickables.find((element) => {
            const label =
              element.getAttribute("aria-label") ??
              element.getAttribute("title") ??
              element.textContent?.trim();
            return label === step.actionControlLabel;
          })
        : clickables[0];
      control?.click();
      return;
    }
    moveForward();
  };

  return createPortal(
    <>
      <GuidedTourSpotlight
        target={step.spotlight}
        shimmerTarget={step.shimmer}
        showConnector={step.connector !== false}
      />
      <FocalShimmer
        className="guided-tour-step-card-shell"
        data-guided-tour="guided-tour-card"
        data-guide-placement="bottom"
      >
        <aside
          className="guided-tour-step-card"
          aria-label="JAICE guided tour"
          aria-live="polite"
        >
          <span className="guided-tour-step-count">
            {stepIndex + 1}/{section.steps.length}
          </span>
          <h2>{step.title}</h2>
          <p>{step.description}</p>
          <div className="guided-tour-step-actions">
            <button
              type="button"
              onClick={moveBackward}
              disabled={isFirstTourStep}
            >
              Previous
            </button>
            <button
              type="button"
              onClick={runForwardAction}
              disabled={
                isLastTourStep ||
                (step.waitForAction &&
                  !step.actionTarget &&
                  !step.actionEvent)
              }
            >
              {step.actionLabel ??
                (step.waitForNavigation ? "Select About" : "Next")}
            </button>
          </div>
        </aside>
      </FocalShimmer>
    </>,
    document.body
  );
}
