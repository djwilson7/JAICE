export type GuidedTourSpotlightTarget =
  | "app-navigation"
  | "home-controls"
  | "home-workspace"
  | "home-kanban"
  | "home-processing"
  | "home-job-cards"
  | "home-offer-card"
  | "home-offer-card-accepted-column"
  | "home-offer-column"
  | "home-accepted-column"
  | "home-offer-accepted-columns"
  | "home-multi-select-control"
  | "home-bulk-delete"
  | "home-delete-confirmation"
  | "home-trash-control"
  | "home-trash-modal"
  | "app-about-navigation"
  | "app-dashboard-navigation"
  | "app-resume-navigation"
  | "dashboard-grit-card"
  | "dashboard-reading-card"
  | "dashboard-avg-time-card"
  | "dashboard-avg-time-info"
  | "dashboard-stages-over-time-card";

export type GuidedTourDemoDataState =
  | "hidden"
  | "processing"
  | "sorted"
  | "bulk-deleted";
export type GuidedTourHomeInteractionState =
  | "idle"
  | "select-control"
  | "selecting-cards"
  | "bulk-selected"
  | "delete-confirmation"
  | "trash-ready"
  | "trash-open"
  | "free";
export type GuidedTourNavigationMode =
  | "closed"
  | "locked"
  | "expanded-locked"
  | "expanded"
  | "about-only"
  | "dashboard-only"
  | "resume-only";

export type GuidedTourStep = {
  title: string;
  description: string;
  spotlight?: GuidedTourSpotlightTarget;
  shimmer?: GuidedTourSpotlightTarget;
  connector?: boolean;
  demoDataState?: GuidedTourDemoDataState;
  homeInteractionState?: GuidedTourHomeInteractionState;
  navigationMode?: Exclude<GuidedTourNavigationMode, "closed">;
  scrollPosition?: "top" | "dashboard-second-row";
  lockScroll?: boolean;
  waitForNavigation?: boolean;
  waitForAction?: boolean;
  actionLabel?: string;
  actionTarget?: GuidedTourSpotlightTarget;
  actionControlLabel?: string;
  actionEvent?:
    | "guided-tour-open-offer"
    | "guided-tour-accept-offer"
    | "guided-tour-select-interview";
  actionAdvances?: boolean;
};

export type GuidedTourSection = {
  route: string;
  steps: readonly GuidedTourStep[];
};

export const GUIDED_TOUR_SECTIONS: readonly GuidedTourSection[] = [
  {
    route: "/home",
    steps: [
      {
        title: "Your job search workspace",
        description:
          "JAICE brings your job search into one workspace. As new emails arrive, it organizes each opportunity, surfaces relevant details, and keeps every stage current from your inbox.",
        navigationMode: "locked",
      },
      {
        title: "Move through JAICE",
        description:
          "Use the navigation bar to move between your workspace, product overview, analytics, and resume. Your display settings and tour exit stay within reach here too.",
        spotlight: "app-navigation",
        navigationMode: "expanded-locked",
      },
      {
        title: "Controls in one place",
        description:
          "Use the control bar to search, sort, review, and manage your applications. Tour steps will enable individual controls when it’s time to use them.",
        spotlight: "home-controls",
      },
      {
        title: "Organized by stage",
        description:
          "This Kanban board organizes job-related emails by their current stage. Each new signal keeps the right opportunity—and your next step—easy to find.",
        spotlight: "home-kanban",
      },
      {
        title: "From inbox to workspace",
        description:
          "New job-related emails enter Processing before they are organized. JAICE reads each signal, extracts the useful details, and prepares it for the right stage.",
        spotlight: "home-processing",
        shimmer: "home-job-cards",
        demoDataState: "processing",
      },
      {
        title: "Sorted into place",
        description:
          "Once processed, each email becomes an application card in the column that matches its current stage. Your workspace stays organized as new signals arrive.",
        spotlight: "home-kanban",
        shimmer: "home-job-cards",
        connector: false,
        demoDataState: "sorted",
      },
      {
        title: "More actions on demand",
        description:
          "Hover over the offer card to reveal the actions available for that email. From there you can edit, archive, review, or return to the original message.",
        spotlight: "home-offer-column",
        shimmer: "home-offer-card",
        demoDataState: "sorted",
      },
      {
        title: "Read the full email",
        description:
          "Tap the offer card to expand the email and review the details behind its current stage. Tap it again when you’re ready to collapse it.",
        spotlight: "home-offer-column",
        shimmer: "home-offer-card",
        demoDataState: "sorted",
        waitForAction: true,
        actionLabel: "Open card",
        actionEvent: "guided-tour-open-offer",
        actionAdvances: true,
      },
      {
        title: "Update a stage manually",
        description:
          "Not every update has to come from your inbox. Drag the offer card into Accepted to update its stage manually.",
        spotlight: "home-offer-accepted-columns",
        shimmer: "home-offer-card-accepted-column",
        demoDataState: "sorted",
        waitForAction: true,
        actionLabel: "Move to Accepted",
        actionEvent: "guided-tour-accept-offer",
        actionAdvances: true,
      },
      {
        title: "Start a bulk action",
        description:
          "Multi-select lets you manage several emails in one pass. Select the Multi-Select control to begin.",
        spotlight: "home-workspace",
        shimmer: "home-multi-select-control",
        demoDataState: "sorted",
        homeInteractionState: "select-control",
        waitForAction: true,
        actionLabel: "Select Multi-Select",
        actionTarget: "home-multi-select-control",
      },
      {
        title: "Choose three emails",
        description:
          "Select any three cards from the board. The bulk-action bar will keep your choices together as you move between columns.",
        spotlight: "home-workspace",
        shimmer: "home-job-cards",
        connector: false,
        demoDataState: "sorted",
        homeInteractionState: "selecting-cards",
        waitForAction: true,
        actionLabel: "Select 3 cards",
        actionEvent: "guided-tour-select-interview",
      },
      {
        title: "Delete as a group",
        description:
          "Your selected emails can now be reviewed, archived, or deleted together. Select Delete to remove this group from the main workspace.",
        spotlight: "home-workspace",
        shimmer: "home-bulk-delete",
        demoDataState: "sorted",
        homeInteractionState: "bulk-selected",
        waitForAction: true,
        actionLabel: "Select Delete",
        actionTarget: "home-bulk-delete",
        actionControlLabel: "Delete selected jobs",
      },
      {
        title: "Confirm destructive changes",
        description:
          "Deletion pauses before anything leaves the workspace. Confirm Delete to continue; these emails will remain recoverable from Trash for 30 days.",
        shimmer: "home-delete-confirmation",
        demoDataState: "sorted",
        homeInteractionState: "delete-confirmation",
        waitForAction: true,
        actionLabel: "Confirm Delete",
        actionTarget: "home-delete-confirmation",
        actionControlLabel: "Delete",
      },
      {
        title: "Open recently deleted",
        description:
          "Deleted emails leave the active board without disappearing immediately. Open Trash to review the items you just removed.",
        spotlight: "home-workspace",
        shimmer: "home-trash-control",
        demoDataState: "bulk-deleted",
        homeInteractionState: "trash-ready",
        waitForAction: true,
        actionLabel: "Open Trash",
        actionTarget: "home-trash-control",
        actionControlLabel: "Trash",
      },
      {
        title: "Recover recent changes",
        description:
          "Recently deleted emails remain available here for 30 days. They can be restored, archived, or permanently removed when needed.",
        shimmer: "home-trash-modal",
        demoDataState: "bulk-deleted",
        homeInteractionState: "trash-open",
      },
      {
        title: "Explore, then continue",
        description:
          "The Home workspace is now yours to explore freely. When you’re ready, select About from the expanded navigation to continue.",
        demoDataState: "bulk-deleted",
        homeInteractionState: "free",
        navigationMode: "about-only",
        shimmer: "app-about-navigation",
        connector: false,
        waitForNavigation: true,
      },
    ],
  },
  {
    route: "/auth-about",
    steps: [
      {
        title: "About JAICE",
        description:
          "This is where you can learn about the inspiration behind the project and the developers. When you’re ready, tap Dashboard or click Next.",
        navigationMode: "dashboard-only",
        shimmer: "app-dashboard-navigation",
        connector: false,
      },
    ],
  },
  {
    route: "/dashboard",
    steps: [
      {
        title: "Your progress at a glance",
        description:
          "The Dashboard turns your application history into a clear view of momentum, consistency, stage balance, and recent activity.",
        navigationMode: "locked",
      },
      {
        title: "Your Grit Score",
        description:
          "Your Grit Score combines application activity, consistency, and follow-through into one signal that reflects the momentum behind your search.",
        spotlight: "dashboard-grit-card",
        lockScroll: true,
      },
      {
        title: "Reading the Dashboard",
        description:
          "Use this quick reference to understand what the Dashboard summarizes and how each signal can help you evaluate your search.",
        spotlight: "dashboard-reading-card",
        lockScroll: true,
      },
      {
        title: "Learn more about each metric",
        description:
          "Hover over the highlighted info icon to see what this metric shows, how it is calculated, and how to interpret it. Click Next when you’re ready.",
        spotlight: "dashboard-avg-time-card",
        shimmer: "dashboard-avg-time-info",
        scrollPosition: "dashboard-second-row",
        lockScroll: true,
      },
      {
        title: "Inspect specific values",
        description:
          "Hover over any graph or chart to see the specific metrics behind each point. Click Next when you’re ready to continue.",
        spotlight: "dashboard-stages-over-time-card",
        scrollPosition: "dashboard-second-row",
        lockScroll: true,
      },
      {
        title: "Explore, then continue",
        description:
          "Explore the Dashboard to learn more about your activity. When you’re ready, select Resume from the expanded navigation to continue.",
        navigationMode: "resume-only",
        shimmer: "app-resume-navigation",
        connector: false,
        waitForNavigation: true,
        actionLabel: "Select Resume",
        scrollPosition: "top",
      },
    ],
  },
  {
    route: "/resume",
    steps: [
      {
        title: "A resume built to adapt",
        description:
          "The resume workspace keeps your experience ready for each opportunity. We’ll highlight the editing controls that support tailored applications.",
      },
    ],
  },
];
