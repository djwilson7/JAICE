import type {
  GuidedTourDemoDataState,
  GuidedTourHomeInteractionState,
} from "@/app/layouts/guidedTourSteps";

export function areDemoHomeControlsEnabled(
  demoDataState: GuidedTourDemoDataState,
  homeInteractionState: GuidedTourHomeInteractionState
) {
  return (
    demoDataState === "free-roam" ||
    [
      "select-control",
      "selecting-cards",
      "bulk-selected",
      "delete-confirmation",
      "trash-ready",
      "trash-open",
      "free",
    ].includes(homeInteractionState)
  );
}
