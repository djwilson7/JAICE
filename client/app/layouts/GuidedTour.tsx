import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { FocalShimmer } from "@/global-components/FocalShimmer";
import {
  GUIDED_TOUR_SECTIONS,
  type GuidedTourDemoDataState,
  type GuidedTourHomeInteractionState,
  type GuidedTourNavigationMode,
  type GuidedTourResumeInteractionState,
  type GuidedTourSpotlightTarget,
} from "./guidedTourSteps";
import {
  JOB_LOCAL_CHANGE_EVENT,
  type JobLocalChangeDetail,
} from "@/pages/home/utils/jobLocalChangeEvent";

type GuidedTourProps = {
  enabled: boolean;
  startRequested: boolean;
  fullTourRequestId?: string;
  pageTourRequest?: {
    id: number;
    route: string;
  } | null;
  currentPath: string;
  isSuppressed?: boolean;
  onNavigate: (route: string) => void;
  onTourActiveChange?: (isActive: boolean) => void;
  onFullTourComplete?: () => void;
  onNavigationModeChange?: (mode: GuidedTourNavigationMode) => void;
  onDemoDataStateChange?: (
    state: GuidedTourDemoDataState,
    revision: number
  ) => void;
  onHomeInteractionStateChange?: (
    state: GuidedTourHomeInteractionState
  ) => void;
  onResumeInteractionStateChange?: (
    state: GuidedTourResumeInteractionState
  ) => void;
};

type TourPhase = "inactive" | "welcome" | "active";
type TourMode = "full" | "page";

type PersistedTourSession = {
  phase: Exclude<TourPhase, "inactive">;
  tourMode: TourMode;
  sectionIndex: number;
  pageProgress: Record<string, number>;
  fullTourRequestId?: string;
};

export const GUIDED_TOUR_SESSION_KEY = "jaice-demo-guided-tour-session";

function readPersistedTourSession(): PersistedTourSession | null {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(GUIDED_TOUR_SESSION_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as PersistedTourSession;
    if (
      (session.phase !== "welcome" && session.phase !== "active") ||
      (session.tourMode !== "full" && session.tourMode !== "page") ||
      !session.pageProgress
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

type SpotlightRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
};

const FOCUS_SHIMMER_INSET = 0;
const MAX_FOCUS_SHIMMERS = 8;
const OFFER_HOVER_DURATION_MS = 3_000;
const BLUE_RESUME_CONNECTOR_STATES = new Set<GuidedTourResumeInteractionState>([
  "experience-overview",
  "experience-add",
  "experience-edit",
  "experience-organize",
  "experience-ai",
]);
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
    target === "resume-left-surface"
      ? Array.from(
          document.querySelectorAll<HTMLElement>(
            '[data-guided-tour="resume-header"], [data-guided-tour="resume-left-rail-panel"]'
          )
        )
      : target === "resume-right-surface"
        ? Array.from(
            document.querySelectorAll<HTMLElement>(
              '[data-guided-tour="resume-header"], [data-guided-tour="resume-right-rail-panel"]'
            )
          )
        : target === "resume-bottom-surface"
          ? Array.from(
              document.querySelectorAll<HTMLElement>(
                '[data-guided-tour="resume-bottom-rail-panel"], [data-guided-tour="resume-bottom-rail-toggle"]'
            )
          )
          : target === "resume-experience-section"
            ? Array.from(
                document.querySelectorAll<HTMLElement>(
                  '#print-canvas [data-section="experience"]'
                )
              )
            : target === "resume-experience-edit-controls"
              ? Array.from(
                  document.querySelectorAll<HTMLElement>(
                    '#print-canvas [data-guided-tour="resume-experience-edit-control"], #print-canvas .resume-editor-bullet-composer'
                  )
                )
              : target === "resume-experience-organize-controls"
                ? Array.from(
                    document.querySelectorAll<HTMLElement>(
                      '[data-guided-tour="resume-experience-organize-control"]'
                    )
                  )
          : target === "resume-left-rail"
            ? Array.from(
                document.querySelectorAll<HTMLElement>(
                  '[data-guided-tour="resume-left-rail-panel"], [data-guided-tour="resume-left-rail-toggle"]'
                )
              )
            : target === "resume-right-rail"
              ? Array.from(
                  document.querySelectorAll<HTMLElement>(
                    '[data-guided-tour="resume-right-rail-panel"], [data-guided-tour="resume-right-rail-toggle"]'
                  )
                )
              : target === "resume-bottom-rail"
                ? Array.from(
                    document.querySelectorAll<HTMLElement>(
                      '[data-guided-tour="resume-bottom-rail-panel"], [data-guided-tour="resume-bottom-rail-toggle"]'
                    )
                  )
                : target === "home-job-cards"
                  ? Array.from(
                      document.querySelectorAll<HTMLElement>(
                        '[data-guided-tour="home-job-card"]'
                      )
                    )
                  : target === "home-offer-card"
                    ? [
                        document.querySelector<HTMLElement>(
                          "#demo-email-juniper-offer"
                        ),
                      ]
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
                            : target.startsWith("resume-")
                              ? Array.from(
                                  document.querySelectorAll<HTMLElement>(
                                    `[data-guided-tour="${target}"]`
                                  )
                                )
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

type MaskTile = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function buildMaskTiles(rects: SpotlightRect[]): MaskTile[] {
  if (rects.length === 0 || typeof window === "undefined") return [];

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const clippedRects = rects
    .map((rect) => ({
      top: Math.max(0, Math.min(viewportHeight, rect.top)),
      left: Math.max(0, Math.min(viewportWidth, rect.left)),
      right: Math.max(0, Math.min(viewportWidth, rect.right)),
      bottom: Math.max(0, Math.min(viewportHeight, rect.bottom)),
    }))
    .filter((rect) => rect.right > rect.left && rect.bottom > rect.top);

  if (clippedRects.length === 0) {
    return [
      { top: 0, left: 0, width: viewportWidth, height: viewportHeight },
    ];
  }

  const yEdges = Array.from(
    new Set([
      0,
      viewportHeight,
      ...clippedRects.flatMap((rect) => [rect.top, rect.bottom]),
    ])
  ).sort((first, second) => first - second);

  return yEdges.slice(0, -1).flatMap((top, index) => {
    const bottom = yEdges[index + 1];
    if (bottom <= top) return [];

    const intervals = clippedRects
      .filter((rect) => rect.top < bottom && rect.bottom > top)
      .map((rect) => [rect.left, rect.right] as const)
      .sort((first, second) => first[0] - second[0]);
    const merged = intervals.reduce<Array<[number, number]>>(
      (result, interval) => {
        const previous = result[result.length - 1];
        if (previous && interval[0] <= previous[1]) {
          previous[1] = Math.max(previous[1], interval[1]);
        } else {
          result.push([interval[0], interval[1]]);
        }
        return result;
      },
      []
    );

    const tiles: MaskTile[] = [];
    let cursor = 0;
    merged.forEach(([left, right]) => {
      if (left > cursor) {
        tiles.push({
          top,
          left: cursor,
          width: left - cursor,
          height: bottom - top,
        });
      }
      cursor = Math.max(cursor, right);
    });
    if (cursor < viewportWidth) {
      tiles.push({
        top,
        left: cursor,
        width: viewportWidth - cursor,
        height: bottom - top,
      });
    }
    return tiles;
  });
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
  connectorTarget = shimmerTarget,
  showConnector = true,
  showMask = true,
  useResumeShimmer = false,
  useResumeConnector = false,
}: {
  target?: GuidedTourSpotlightTarget;
  shimmerTarget?: GuidedTourSpotlightTarget;
  connectorTarget?: GuidedTourSpotlightTarget;
  showConnector?: boolean;
  showMask?: boolean;
  useResumeShimmer?: boolean;
  useResumeConnector?: boolean;
}) {
  const spotlightRects = useTargetRects(target);
  const shimmerRects = useTargetRects(shimmerTarget);
  const connectorRects = useTargetRects(connectorTarget);
  const cardRects = useTargetRects("guided-tour-card" as GuidedTourSpotlightTarget);
  const maskTiles = buildMaskTiles(spotlightRects);
  const combinedConnectorRect = combineRects(connectorRects);
  const cardRect = cardRects[0] ?? null;
  const targetCenter = combinedConnectorRect
    ? {
        x: (combinedConnectorRect.left + combinedConnectorRect.right) / 2,
        y: (combinedConnectorRect.top + combinedConnectorRect.bottom) / 2,
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
    combinedConnectorRect && cardCenter
      ? getRectEdgePoint(combinedConnectorRect, cardCenter)
      : null;

  return createPortal(
    <>
      {showMask && target && maskTiles.length > 0 && (
        <div className="guided-tour-focus-mask-layer" aria-hidden="true">
          {maskTiles.map((tile, index) => (
            <span
              key={`${tile.top}-${tile.left}-${index}`}
              className="guided-tour-focus-mask"
              style={tile}
            />
          ))}
        </div>
      )}
      {Array.from({ length: MAX_FOCUS_SHIMMERS }, (_, index) => {
        const rect = shimmerRects[index];
        return (
          <FocalShimmer
            key={index}
            className={`guided-tour-focus-shimmer${
              useResumeShimmer ? " guided-tour-focus-shimmer--resume" : ""
            }`}
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
        className={`guided-tour-focus-connector${
          useResumeConnector ? " guided-tour-focus-connector--resume" : ""
        }`}
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
  fullTourRequestId,
  pageTourRequest = null,
  currentPath,
  isSuppressed = false,
  onNavigate,
  onTourActiveChange,
  onFullTourComplete,
  onNavigationModeChange,
  onDemoDataStateChange,
  onHomeInteractionStateChange,
  onResumeInteractionStateChange,
}: GuidedTourProps) {
  const restoredSessionRef = useRef<
    PersistedTourSession | null | undefined
  >(undefined);
  if (restoredSessionRef.current === undefined) {
    const storedSession = enabled ? readPersistedTourSession() : null;
    const isSameFullTourRequest =
      storedSession?.tourMode === "full" &&
      (!fullTourRequestId ||
        storedSession.fullTourRequestId === fullTourRequestId);
    restoredSessionRef.current =
      storedSession && (!startRequested || isSameFullTourRequest)
        ? storedSession
        : null;
  }
  const restoredSession = restoredSessionRef.current;
  const [phase, setPhase] = useState<TourPhase>(() =>
    restoredSession?.phase ??
    (enabled && startRequested ? "welcome" : "inactive")
  );
  const [tourMode, setTourMode] = useState<TourMode>(
    restoredSession?.tourMode ?? "full"
  );
  const [sectionIndex, setSectionIndex] = useState(() => {
    if (restoredSession) {
      const currentSection = GUIDED_TOUR_SECTIONS.findIndex(
        (candidate) => candidate.route === currentPath
      );
      if (currentSection >= 0) return currentSection;
      if (GUIDED_TOUR_SECTIONS[restoredSession.sectionIndex]) {
        return restoredSession.sectionIndex;
      }
    }
    const matchingSection = GUIDED_TOUR_SECTIONS.findIndex(
      (section) => section.route === currentPath
    );
    return matchingSection >= 0 ? matchingSection : 0;
  });
  const [pageProgress, setPageProgress] = useState<Record<string, number>>(
    restoredSession?.pageProgress ?? {}
  );
  const fullTourRequestIdRef = useRef(
    restoredSession?.fullTourRequestId ?? fullTourRequestId
  );
  const handledPageTourRequestIdRef = useRef<number | null>(null);
  const welcomeRef = useRef<HTMLDivElement>(null);
  const [isOfferHovering, setIsOfferHovering] = useState(false);

  const showWelcome = enabled && phase === "welcome" && !isSuppressed;
  const showSteps = enabled && phase === "active" && !isSuppressed;
  const section = GUIDED_TOUR_SECTIONS[sectionIndex];
  const stepIndex = pageProgress[section.route] ?? 0;
  const step = section.steps[stepIndex];
  const isPageTour = tourMode === "page";
  const isLastPageStep = stepIndex === section.steps.length - 1;

  useEffect(() => {
    onTourActiveChange?.(enabled && phase !== "inactive");
  }, [enabled, onTourActiveChange, phase]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    try {
      if (phase === "inactive") {
        window.localStorage.removeItem(GUIDED_TOUR_SESSION_KEY);
        return;
      }
      window.localStorage.setItem(
        GUIDED_TOUR_SESSION_KEY,
        JSON.stringify({
          phase,
          tourMode,
          sectionIndex,
          pageProgress,
          fullTourRequestId: fullTourRequestIdRef.current,
        } satisfies PersistedTourSession)
      );
    } catch {
      // The tour remains usable when browser storage is unavailable.
    }
  }, [enabled, pageProgress, phase, sectionIndex, tourMode]);

  useEffect(() => {
    if (!enabled || !pageTourRequest) return;
    if (handledPageTourRequestIdRef.current === pageTourRequest.id) return;
    handledPageTourRequestIdRef.current = pageTourRequest.id;

    const matchingSection = GUIDED_TOUR_SECTIONS.findIndex(
      (candidate) => candidate.route === pageTourRequest.route
    );
    if (matchingSection < 0) return;

    const route = GUIDED_TOUR_SECTIONS[matchingSection].route;
    setTourMode("page");
    setSectionIndex(matchingSection);
    setPageProgress((progress) => ({ ...progress, [route]: 0 }));
    setPhase("active");
  }, [enabled, pageTourRequest]);

  useEffect(() => {
    const navigationMode = showSteps
      ? isPageTour && isLastPageStep
        ? "closed"
        : step.navigationMode ?? "closed"
      : "closed";
    onNavigationModeChange?.(navigationMode);

    return () => onNavigationModeChange?.("closed");
  }, [
    isLastPageStep,
    isPageTour,
    onNavigationModeChange,
    showSteps,
    step.navigationMode,
  ]);

  useEffect(() => {
    if (!showSteps) return;

    const isHome = section.route === "/home";
    if (isHome) {
      onDemoDataStateChange?.(step.demoDataState ?? "hidden", stepIndex);
    }
    onHomeInteractionStateChange?.(
      isHome ? step.homeInteractionState ?? "idle" : "idle"
    );
    onResumeInteractionStateChange?.(
      showSteps && section.route === "/resume"
        ? step.resumeInteractionState ?? "idle"
        : "idle"
    );
  }, [
    onDemoDataStateChange,
    onHomeInteractionStateChange,
    onResumeInteractionStateChange,
    section.route,
    showSteps,
    step.demoDataState,
    step.homeInteractionState,
    step.resumeInteractionState,
    stepIndex,
  ]);

  useEffect(() => {
    if (!showSteps || section.route !== "/home") return;

    let offerHoverTimer: ReturnType<typeof setTimeout> | null = null;
    const getOfferCard = (event: Event) =>
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("#demo-email-juniper-offer")
        : null;
    const isOfferCardEvent = (event: Event) => Boolean(getOfferCard(event));
    const advanceHomeStep = () => {
      setPageProgress((progress) => ({
        ...progress,
        [section.route]: stepIndex + 1,
      }));
    };
    const handleOfferHover = (event: Event) => {
      if (stepIndex !== 6 || offerHoverTimer !== null) return;

      const offerCard = getOfferCard(event);
      if (!offerCard) return;

      const previousTarget = (event as PointerEvent).relatedTarget;
      if (previousTarget instanceof Node && offerCard.contains(previousTarget)) {
        return;
      }

      setIsOfferHovering(true);
      offerHoverTimer = window.setTimeout(() => {
        offerHoverTimer = null;
        advanceHomeStep();
      }, OFFER_HOVER_DURATION_MS);
    };
    const handleOfferHoverEnd = (event: Event) => {
      if (stepIndex !== 6 || offerHoverTimer === null) return;

      const offerCard = getOfferCard(event);
      if (!offerCard) return;

      const nextTarget = (event as PointerEvent).relatedTarget;
      if (nextTarget instanceof Node && offerCard.contains(nextTarget)) return;

      window.clearTimeout(offerHoverTimer);
      offerHoverTimer = null;
      setIsOfferHovering(false);
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
    document.addEventListener("pointerout", handleOfferHoverEnd);
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
      if (offerHoverTimer !== null) window.clearTimeout(offerHoverTimer);
      document.removeEventListener("pointerover", handleOfferHover);
      document.removeEventListener("pointerout", handleOfferHoverEnd);
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
      setIsOfferHovering(false);
    };
  }, [section.route, showSteps, stepIndex]);

  useEffect(() => {
    if (phase !== "active") return;

    if (tourMode === "page") {
      if (currentPath !== section.route) {
        onHomeInteractionStateChange?.("idle");
        onResumeInteractionStateChange?.("idle");
        setPhase("inactive");
      }
      return;
    }

    const matchingSection = GUIDED_TOUR_SECTIONS.findIndex(
      (section) => section.route === currentPath
    );
    if (matchingSection >= 0) setSectionIndex(matchingSection);
  }, [
    currentPath,
    onHomeInteractionStateChange,
    onResumeInteractionStateChange,
    phase,
    section.route,
    tourMode,
  ]);

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
      const isAtBottom = hasScrollableContent && remainingScroll <= 1;
      const topEdge = 96;
      const bottomAnchoredTop =
        window.innerHeight - guideCard.getBoundingClientRect().height - 24;
      const travelDistance = Math.max(0, bottomAnchoredTop - topEdge);
      const lift = isAtBottom ? travelDistance : 0;

      guideCard.style.setProperty(
        "--guided-tour-card-lift",
        `${lift}px`
      );
      guideCard.dataset.guidePlacement = isAtBottom ? "top" : "bottom";
    };

    updateGuidePlacement();
    scrollCanvas.addEventListener("scroll", updateGuidePlacement, {
      passive: true,
    });
    window.addEventListener("resize", updateGuidePlacement);

    return () => {
      scrollCanvas.removeEventListener("scroll", updateGuidePlacement);
      window.removeEventListener("resize", updateGuidePlacement);
      guideCard.style.removeProperty("--guided-tour-card-lift");
      guideCard.dataset.guidePlacement = "bottom";
    };
  }, [section.route, showSteps, stepIndex]);

  useEffect(() => {
    if (!showSteps || (!step.lockScroll && !step.scrollPosition)) return;

    const scrollCanvas = document.querySelector<HTMLElement>(
      ".outlet-container"
    );
    if (!scrollCanvas) return;

    const previousOverflowY = scrollCanvas.style.overflowY;

    if (step.scrollPosition) {
      let scrollTop = 0;
      if (step.scrollPosition === "dashboard-second-row") {
        const secondRow = document.querySelector<HTMLElement>(
          '[data-guided-tour="dashboard-avg-time-card"]'
        );
        if (secondRow) {
          scrollTop = Math.max(
            0,
            scrollCanvas.scrollTop +
              secondRow.getBoundingClientRect().top -
              scrollCanvas.getBoundingClientRect().top -
              24
          );
        }
      }

      scrollCanvas.scrollTo({ top: scrollTop, behavior: "smooth" });
    }

    if (step.lockScroll) scrollCanvas.style.overflowY = "hidden";

    return () => {
      scrollCanvas.style.overflowY = previousOverflowY;
    };
  }, [section.route, showSteps, step.lockScroll, step.scrollPosition]);

  useEffect(() => {
    if (
      !showSteps ||
      !step.guidePlacement ||
      !step.spotlight
    ) {
      return;
    }

    const guideCard = document.querySelector<HTMLElement>(
      '[data-guided-tour="guided-tour-card"]'
    );
    if (!guideCard) return;

    const updateGuidePlacement = () => {
      const targets = getTargetElements(
        step.guidePlacementTarget ?? step.spotlight
      );
      if (targets.length === 0) return;
      const targetTop = Math.min(
        ...targets.map((target) => target.getBoundingClientRect().top)
      );
      const guideRect = guideCard.getBoundingClientRect();

      if (step.guidePlacement === "above-spotlight") {
        const naturalTop = window.innerHeight - guideRect.height - 24;
        const requestedLift = Math.max(0, window.innerHeight - targetTop);
        const maximumLift = Math.max(0, naturalTop - 96);
        const lift = Math.min(requestedLift, maximumLift);
        guideCard.style.setProperty("--guided-tour-card-lift", `${lift}px`);
        guideCard.style.removeProperty("--guided-tour-card-shift-x");
        guideCard.dataset.guidePlacement = "above-target";
        return;
      }

      const targetLeft = Math.min(
        ...targets.map((target) => target.getBoundingClientRect().left)
      );
      const naturalLeft = window.innerWidth - guideRect.width - 24;
      const requestedShift = Math.min(0, targetLeft - window.innerWidth);
      const maximumLeftShift = 24 - naturalLeft;
      const shift = Math.max(requestedShift, maximumLeftShift);
      guideCard.style.setProperty(
        "--guided-tour-card-shift-x",
        `${shift}px`
      );
      guideCard.style.removeProperty("--guided-tour-card-lift");
      guideCard.dataset.guidePlacement = "left-of-target";
    };

    let animationFrame = 0;
    const followLayout = () => {
      updateGuidePlacement();
      animationFrame = window.requestAnimationFrame(followLayout);
    };
    followLayout();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      guideCard.style.removeProperty("--guided-tour-card-lift");
      guideCard.style.removeProperty("--guided-tour-card-shift-x");
      guideCard.dataset.guidePlacement = "bottom";
    };
  }, [
    showSteps,
    step.guidePlacement,
    step.guidePlacementTarget,
    step.spotlight,
  ]);

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

  const isFirstTourStep = isPageTour
    ? stepIndex === 0
    : sectionIndex === 0 && stepIndex === 0;
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

    if (isPageTour) return;

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

    if (isPageTour) return;

    const nextSection = GUIDED_TOUR_SECTIONS[sectionIndex + 1];
    if (!nextSection) return;
    setSectionIndex(sectionIndex + 1);
    onNavigate(nextSection.route);
  };

  const runForwardAction = () => {
    if (isPageTour && isLastPageStep) {
      onHomeInteractionStateChange?.("idle");
      onResumeInteractionStateChange?.("idle");
      setPhase("inactive");
      return;
    }
    if (step.completesTour) {
      onResumeInteractionStateChange?.("idle");
      setPhase("inactive");
      onFullTourComplete?.();
      return;
    }
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
        connectorTarget={step.connectorTarget}
        showConnector={step.connector !== false}
        showMask={step.showSpotlightMask !== false}
        useResumeShimmer={
          section.route === "/resume" &&
          step.resumeInteractionState !== "experience-tag"
        }
        useResumeConnector={
          section.route === "/resume" &&
          BLUE_RESUME_CONNECTOR_STATES.has(
            step.resumeInteractionState ?? "idle"
          )
        }
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
          <div className="guided-tour-step-heading">
            <h2>
              {isPageTour && isLastPageStep && section.route !== "/auth-about"
                ? "Explore, then return to free roam"
                : step.title}
            </h2>
            {section.route === "/home" && stepIndex === 6 ? (
              <span
                className={`guided-tour-hover-progress${
                  isOfferHovering
                    ? " guided-tour-hover-progress--active"
                    : ""
                }`}
                role="progressbar"
                aria-label="Offer card hover progress"
                aria-valuetext={
                  isOfferHovering
                    ? "Hovering for three seconds"
                    : "Hover over the offer card to start"
                }
              >
                <svg viewBox="0 0 28 28" aria-hidden="true">
                  <circle
                    className="guided-tour-hover-progress-track"
                    cx="14"
                    cy="14"
                    r="11"
                    pathLength="1"
                  />
                  <circle
                    className="guided-tour-hover-progress-value"
                    cx="14"
                    cy="14"
                    r="11"
                    pathLength="1"
                  />
                </svg>
              </span>
            ) : null}
          </div>
          <p>
            {isPageTour && isLastPageStep
              ? section.route === "/auth-about"
                ? "This page explains the inspiration behind JAICE and introduces the team. When you’re ready, return to free roam and continue exploring anywhere in the demo."
                : `You’ve refreshed the major controls on this page. Keep exploring here, or return to free roam and move anywhere in the demo.`
              : step.description}
          </p>
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
                (!isPageTour && isLastTourStep && !step.completesTour) ||
                (step.waitForAction &&
                  !step.actionTarget &&
                  !step.actionEvent)
              }
            >
              {isPageTour && isLastPageStep
                ? "Return to free roam"
                : step.actionLabel ??
                  (step.waitForNavigation ? "Select About" : "Next")}
            </button>
          </div>
        </aside>
      </FocalShimmer>
    </>,
    document.body
  );
}
