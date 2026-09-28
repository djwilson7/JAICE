import { NavButton } from "../nav-components/NavButton";
import { ThemeToggleButton } from "../nav-components/ThemeToggleButton";

import { MainHeader } from "@/app/nav-components/MainHeader";
import { DemoDisclosure } from "@/app/nav-components/DemoDisclosure";

import { Outlet, useLocation, useNavigate } from "react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { IS_DEMO_MODE } from "@/global-services/projectMode";

// Icons
import homeIcon from "@/assets/icons/home.svg";
import aboutIcon from "@/assets/icons/book-open-cover.svg";
import dashboardIcon from "@/assets/icons/chart-pie-alt.svg";
import settingsIcon from "@/assets/icons/settings.svg";
import quitIcon from "@/assets/icons/user-logout.svg";

import resumeIcon from "@/assets/icons/resume.svg";

import { motion } from "framer-motion";
import { api } from "@/global-services/api";
import type { NavigationBehavior } from "@/pages/settings/provider/settingsTypes";
import { useSettings } from "@/pages/settings/provider/settingsContext";
import { DesktopViewportOverlay } from "./DesktopViewportGuard";
import { useDesktopViewportGuard } from "./desktopViewportGuardState";
import { GUIDED_TOUR_SESSION_KEY, GuidedTour } from "./GuidedTour";
import { GuidedTourSessionProvider } from "./GuidedTourSessionProvider";
import type {
  GuidedTourDemoDataState,
  GuidedTourHomeInteractionState,
  GuidedTourNavigationMode,
  GuidedTourResumeInteractionState,
} from "./guidedTourSteps";
import { calculatePageTourLauncherLift } from "./pageTourLauncherPosition";

const primaryOptions = {
  home: { route: "/home", label: "Home", icon: homeIcon, title: "Go to Home" },
  about: {
    route: "/auth-about",
    label: "About",
    icon: aboutIcon,
    title: "Go to About",
  },
  dashboard: {
    route: "/dashboard",
    label: "Dashboard",
    icon: dashboardIcon,
    title: "Go to Dashboard",
  },
  resume: {
    route: "/resume",
    label: "Resume",
    icon: resumeIcon,
    title: "Go to Resume",
  },
};

const settingsOptions = {
  settings: {
    route: "/settings",
    label: "Settings",
    icon: settingsIcon,
    title: "Go to Settings",
  },
  quit: { route: "/", label: "Quit", icon: quitIcon, title: "Logout" },
};

const navLabels = [
  ...Object.values(primaryOptions).map((option) => option.label),
  ...Object.values(settingsOptions).map((option) => option.label),
  "Light Mode",
  "Dark Mode",
  "Black and White",
];

const longestNavLabelLength = Math.max(
  ...navLabels.map((label) => label.length)
);

const NAV_CLOSED_WIDTH = "3rem";
const navLabelWidthCh = longestNavLabelLength * 0.61;

const NAV_WIDTHS = {
  closed: NAV_CLOSED_WIDTH,
  open: `calc(${NAV_CLOSED_WIDTH} + ${navLabelWidthCh}ch + 0.625rem)`,
};

const DEMO_TOUR_COMPLETE_KEY = "jaice-demo-full-tour-complete";
const PAGE_TOUR_LABELS: Record<string, string> = {
  "/home": "Home",
  "/auth-about": "About",
  "/dashboard": "Dashboard",
  "/resume": "Resume",
};

function hasCompletedDemoTour() {
  if (!IS_DEMO_MODE || typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(DEMO_TOUR_COMPLETE_KEY) === "true";
  } catch {
    return false;
  }
}

function hasActiveDemoTour() {
  if (!IS_DEMO_MODE || typeof window === "undefined") return false;

  try {
    return Boolean(window.localStorage.getItem(GUIDED_TOUR_SESSION_KEY));
  } catch {
    return false;
  }
}

export function NavigationBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const guidedTourLocationState = location.state as {
    startGuidedTour?: boolean;
    guidedTourRequestId?: string;
  } | null;
  const startGuidedTour = Boolean(guidedTourLocationState?.startGuidedTour);
  const fullTourRequestId = guidedTourLocationState?.guidedTourRequestId;
  const completedTourOnLoad = hasCompletedDemoTour();
  const activeTourOnLoad = startGuidedTour || hasActiveDemoTour();

  const [selectedButton, setSelectedButton] = useState<string>("");

  const [navIsHovered, setNavIsHovered] = useState<boolean>(false);
  const [tourNavigationMode, setTourNavigationMode] =
    useState<GuidedTourNavigationMode>("closed");
  const [demoDataSnapshot, setDemoDataSnapshot] = useState<{
    state: GuidedTourDemoDataState;
    revision: number;
    homeInteractionState: GuidedTourHomeInteractionState;
  }>({
    state:
      completedTourOnLoad && !activeTourOnLoad ? "free-roam" : "hidden",
    revision: 0,
    homeInteractionState: "idle",
  });
  const [demoDeletedJobIds, setDemoDeletedJobIds] = useState<string[]>([]);
  const [resumeInteractionState, setResumeInteractionState] =
    useState<GuidedTourResumeInteractionState>("idle");
  const [isTourActive, setIsTourActive] = useState(
    activeTourOnLoad
  );
  const [hasUnlockedFreeRoam, setHasUnlockedFreeRoam] =
    useState(completedTourOnLoad);
  const [pageTourRequest, setPageTourRequest] = useState<{
    id: number;
    route: string;
  } | null>(null);
  const pageTourLauncherRef = useRef<HTMLElement>(null);
  const updateDemoDataSnapshot = useCallback(
    (state: GuidedTourDemoDataState, revision: number) => {
      setDemoDataSnapshot((current) =>
        current.state === state && current.revision === revision
          ? current
          : { ...current, state, revision }
      );
    },
    []
  );
  const updateHomeInteractionState = useCallback(
    (homeInteractionState: GuidedTourHomeInteractionState) => {
      setDemoDataSnapshot((current) =>
        current.homeInteractionState === homeInteractionState
          ? current
          : { ...current, homeInteractionState }
      );
    },
    []
  );

  const hoverMode = useSettings().navigationBehavior as NavigationBehavior;
  const isViewportBlocked = useDesktopViewportGuard(IS_DEMO_MODE);

  useEffect(() => {
    if (!startGuidedTour) return;

    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate, startGuidedTour]);

  const completeFullTour = useCallback(() => {
    setHasUnlockedFreeRoam(true);
    setIsTourActive(false);
    setDemoDeletedJobIds([]);
    setDemoDataSnapshot({
      state: "free-roam",
      revision: 0,
      homeInteractionState: "idle",
    });
    try {
      window.localStorage.setItem(DEMO_TOUR_COMPLETE_KEY, "true");
    } catch {
      // Free roam still works for this session when storage is unavailable.
    }
  }, []);

  const startPageTour = () => {
    setIsTourActive(true);
    setDemoDeletedJobIds([]);
    setDemoDataSnapshot({
      state: "hidden",
      revision: 0,
      homeInteractionState: "idle",
    });
    setPageTourRequest((request) => ({
      id: (request?.id ?? 0) + 1,
      route: location.pathname,
    }));
  };

  const handleTourActiveChange = useCallback(
    (isActive: boolean) => {
      setIsTourActive(isActive);
      if (!isActive && hasUnlockedFreeRoam) {
        setDemoDeletedJobIds([]);
        setDemoDataSnapshot({
          state: "free-roam",
          revision: 0,
          homeInteractionState: "idle",
        });
      }
    },
    [hasUnlockedFreeRoam]
  );

  const pageTourLabel = PAGE_TOUR_LABELS[location.pathname];
  const showPageTourLauncher =
    IS_DEMO_MODE &&
    hasUnlockedFreeRoam &&
    !isTourActive &&
    Boolean(pageTourLabel);

  useEffect(() => {
    const launcher = pageTourLauncherRef.current;
    if (!showPageTourLauncher || !launcher) return;

    let animationFrame = 0;
    let measurementTimer = 0;

    const measure = () => {
      const bottomRailPanel = document.querySelector(
        '[data-guided-tour="resume-bottom-rail-panel"]'
      );
      const toolbar = bottomRailPanel?.closest(".resume-toolbar") ?? null;

      const currentLift =
        Number.parseFloat(
          launcher.style.getPropertyValue("--page-tour-launcher-lift")
        ) || 0;
      const nextLift = toolbar
        ? calculatePageTourLauncherLift(
            launcher.getBoundingClientRect(),
            toolbar.getBoundingClientRect(),
            currentLift
          )
        : 0;

      if (nextLift !== currentLift) {
        launcher.style.setProperty(
          "--page-tour-launcher-lift",
          `${nextLift}px`
        );
      }
    };

    const scheduleMeasurement = (delay = 0) => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(measurementTimer);
      measurementTimer = window.setTimeout(() => {
        animationFrame = window.requestAnimationFrame(measure);
      }, delay);
    };

    const mutationObserver = new MutationObserver((mutations) => {
      const rightRailChanged = mutations.some(
        (mutation) =>
          mutation.type === "attributes" &&
          mutation.attributeName === "data-collapsed"
      );
      const bottomRailPanel = document.querySelector(
        '[data-guided-tour="resume-bottom-rail-panel"]'
      );

      scheduleMeasurement(
        rightRailChanged ? 320 : bottomRailPanel ? 220 : 0
      );
    });
    mutationObserver.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-collapsed"],
    });
    const handleResize = () => scheduleMeasurement(100);
    window.addEventListener("resize", handleResize);
    scheduleMeasurement(220);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(measurementTimer);
      mutationObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      launcher.style.removeProperty("--page-tour-launcher-lift");
    };
  }, [showPageTourLauncher]);

  useEffect(() => {
    // Update selected button based on current path
    const path = location.pathname;

    if (path === "/home") {
      setSelectedButton("home");
    } else if (path === "/auth-about") {
      setSelectedButton("about");
    } else if (path === "/dashboard") {
      setSelectedButton("dashboard");
    } else if (path === "/resume") {
      setSelectedButton("resume");
    } else if (path === "/settings") {
      setSelectedButton("settings");
    } else setSelectedButton("");
  }, [location.pathname]);

  const handleButtonClick = async (route: string, buttonId: string) => {
    setSelectedButton(buttonId);
    if (route === "/") {
      if (IS_DEMO_MODE) {
        navigate(route, { replace: true });
        return;
      }

      console.log("Logging out...");
      try {
        await api("/api/auth/logout", { method: "POST" });
      } catch (error) {
        console.error("Backend logout failed:", error);
      } finally {
        try {
          const { logOut } = await import("@/global-services/auth");
          await logOut();
        } finally {
          navigate(route, { replace: true });
        }
      }
      return;
    }
    navigate(route);
  };

  const isStepOneLocked = tourNavigationMode === "locked";
  const isNavigationLocked =
    isStepOneLocked || tourNavigationMode === "expanded-locked";
  const isTourExpanded =
    tourNavigationMode === "expanded-locked" ||
    tourNavigationMode === "expanded" ||
    tourNavigationMode === "about-only" ||
    tourNavigationMode === "dashboard-only" ||
    tourNavigationMode === "resume-only";
  const isNavExpanded =
    isTourExpanded ||
    (isStepOneLocked
      ? navIsHovered
      : hoverMode === "open" || (hoverMode === "hover" && navIsHovered));
  const showNavLabels =
    isTourExpanded ||
    (isStepOneLocked
      ? navIsHovered
      : navIsHovered && hoverMode !== "closed");
  const showOnlyAbout = tourNavigationMode === "about-only";
  const showOnlyDashboard = tourNavigationMode === "dashboard-only";
  const showOnlyResume = tourNavigationMode === "resume-only";
  const focusedNavigationKey = showOnlyAbout
    ? "about"
    : showOnlyDashboard
      ? "dashboard"
      : showOnlyResume
        ? "resume"
      : null;
  const hasFocusedNavigation = focusedNavigationKey !== null;
  const targetNavWidth = isNavExpanded ? NAV_WIDTHS.open : NAV_WIDTHS.closed;
  const navTransition = {
    type: "spring" as const,
    stiffness: 260,
    damping: 32,
    mass: 0.9,
  };

  return (
    <GuidedTourSessionProvider
      demoDataState={demoDataSnapshot.state}
      demoDataRevision={demoDataSnapshot.revision}
      homeInteractionState={demoDataSnapshot.homeInteractionState}
      resumeInteractionState={resumeInteractionState}
      deletedJobIds={demoDeletedJobIds}
      recordDeletedJobIds={setDemoDeletedJobIds}
    >
    <>
    <div
      className="h-screen min-page-width overflow-x-hidden"
      inert={isViewportBlocked ? true : undefined}
      aria-hidden={isViewportBlocked || undefined}
    >
      <MainHeader disabled={isStepOneLocked} />

      <div className={`app-content`}>
        <motion.nav
          className="flex absolute left-0 top-0 h-full primary-color z-40"
          id="navigation-bar"
          data-guided-tour="app-navigation"
          animate={{ width: targetNavWidth }}
          transition={navTransition}
          onMouseEnter={() => setNavIsHovered(true)}
          onMouseLeave={() => setNavIsHovered(false)}
        >
          <motion.div
            className="z-50 h-full w-full flex flex-col gap-1.5 overflow-hidden p-1.5"
            layout
            transition={navTransition}
          >
            <div className="flex flex-col h-full w-full justify-between">
              <section aria-label="Navigation Buttons" className="flex w-full">
                <ul
                  className="flex w-full flex-col items-center gap-1"
                  style={{ fontFamily: "var(--font-subheading)" }}
                >
                  {Object.entries(primaryOptions).map(([key, option]) => (
                    <li
                      key={key}
                      className={`w-full ${
                        hasFocusedNavigation && key !== focusedNavigationKey
                          ? "guided-tour-nav-muted"
                          : ""
                      }`}
                      inert={
                        hasFocusedNavigation && key !== focusedNavigationKey
                          ? true
                          : undefined
                      }
                    >
                      <NavButton
                        icon={option.icon}
                        label={option.label}
                        onClick={() => handleButtonClick(option.route, key)}
                        isSelected={selectedButton === key}
                        hoverMode={hoverMode}
                        title={option.title}
                        showLabel={showNavLabels}
                        guidedTourTarget={
                          key === "about"
                            ? "app-about-navigation"
                            : key === "dashboard"
                              ? "app-dashboard-navigation"
                              : key === "resume"
                                ? "app-resume-navigation"
                              : undefined
                        }
                        disabled={
                          isNavigationLocked ||
                          (hasFocusedNavigation && key !== focusedNavigationKey)
                        }
                      />
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-label="Settings and account">
                <div className="flex w-full flex-col items-center justify-center overflow-hidden p-1.5">
                  <hr className="header-split" />
                </div>
                <ul
                  className="flex w-full flex-col items-center gap-1"
                  style={{ fontFamily: "var(--font-subheading)" }}
                >
                  {!IS_DEMO_MODE && (
                    <li
                      key="theme-toggle"
                      className={`w-full ${
                        hasFocusedNavigation ? "guided-tour-nav-muted" : ""
                      }`}
                      inert={hasFocusedNavigation ? true : undefined}
                    >
                      <ThemeToggleButton
                        hoverMode={hoverMode}
                        showLabel={showNavLabels}
                        disabled={isNavigationLocked || hasFocusedNavigation}
                      />
                    </li>
                  )}
                  {/* <li key="menu-expand">
                    <MenuToggleButton
                      hoverMode={hoverMode}
                      setHoverMode={setHoverMode}
                    />
                  </li> This no longer exists, now we react to state instead*/}
                  {Object.entries(settingsOptions)
                    .filter(([key]) => !IS_DEMO_MODE || key !== "settings")
                    .map(([key, option]) => (
                    <li
                      key={key}
                      className={`w-full ${
                        hasFocusedNavigation
                          ? `guided-tour-nav-muted ${
                              key === "quit"
                                ? "guided-tour-nav-exit"
                                : ""
                            }`
                          : ""
                      }`}
                      inert={
                        hasFocusedNavigation &&
                        key !== "quit"
                          ? true
                          : undefined
                      }
                    >
                      <NavButton
                        icon={option.icon}
                        label={option.label}
                        onClick={() => handleButtonClick(option.route, key)}
                        isSelected={selectedButton === key}
                        hoverMode={hoverMode}
                        title={option.title}
                        showLabel={showNavLabels}
                        disabled={
                          (key !== "quit" && isNavigationLocked) ||
                          (hasFocusedNavigation &&
                            key !== "quit")
                        }
                      />
                    </li>
                    ))}
                </ul>
              </section>
            </div>
          </motion.div>
        </motion.nav>
        <motion.div
          className="outlet-container"
          animate={{
            marginLeft: targetNavWidth,
            width: `calc(100vw - ${targetNavWidth})`,
          }}
          transition={navTransition}
          style={{ background: "var(--page-gradient)" }}
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
    {IS_DEMO_MODE && <DemoDisclosure />}
    {showPageTourLauncher && (
      <aside ref={pageTourLauncherRef} className="page-tour-launcher" aria-label="Page tour refresher">
        <strong>Need a refresher?</strong>
        <span>Replay the highlights for this page.</span>
        <button type="button" onClick={startPageTour}>
          Restart {pageTourLabel} tour
        </button>
      </aside>
    )}
    <GuidedTour
      enabled={IS_DEMO_MODE}
      startRequested={startGuidedTour}
      fullTourRequestId={fullTourRequestId}
      pageTourRequest={pageTourRequest}
      currentPath={location.pathname}
      isSuppressed={isViewportBlocked}
      onNavigate={(route) => navigate(route)}
      onTourActiveChange={handleTourActiveChange}
      onFullTourComplete={completeFullTour}
      onNavigationModeChange={setTourNavigationMode}
      onDemoDataStateChange={updateDemoDataSnapshot}
      onHomeInteractionStateChange={updateHomeInteractionState}
      onResumeInteractionStateChange={setResumeInteractionState}
    />
    <DesktopViewportOverlay isOpen={isViewportBlocked} />
    </>
    </GuidedTourSessionProvider>
  );
}
