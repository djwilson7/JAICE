type RectEdges = Pick<DOMRect, "top" | "right" | "bottom" | "left">;

export function calculatePageTourLauncherLift(
  launcherRect: RectEdges,
  bottomRailRect: RectEdges,
  currentLift: number,
  gap = 12
) {
  const baselineTop = launcherRect.top + currentLift;
  const baselineBottom = launcherRect.bottom + currentLift;
  const overlapsHorizontally =
    launcherRect.left < bottomRailRect.right &&
    launcherRect.right > bottomRailRect.left;
  const overlapsVertically =
    baselineTop < bottomRailRect.bottom &&
    baselineBottom > bottomRailRect.top;

  if (!overlapsHorizontally || !overlapsVertically) return 0;

  return Math.max(0, Math.ceil(baselineBottom - bottomRailRect.top + gap));
}
