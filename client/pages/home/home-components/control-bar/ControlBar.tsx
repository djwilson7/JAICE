export function ControlBar({
  children,
  fitParent = false,
  className = "",
  disabled = false,
  guidedFocusTarget,
  guidedFocusInteractive = false,
}: {
  children: React.ReactNode;
  fitParent?: boolean;
  className?: string;
  disabled?: boolean;
  guidedFocusTarget?: "home-multi-select-control" | "home-trash-control";
  guidedFocusInteractive?: boolean;
}) {
  const isGuidedRestricted = guidedFocusTarget !== undefined;

  const blockRestrictedClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!isGuidedRestricted) return;

    const target = event.target as Element;
    const isFocusedControl = Boolean(
      target.closest(`[data-guided-tour="${guidedFocusTarget}"]`)
    );
    if (!isFocusedControl || !guidedFocusInteractive) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <div
      className={`control-bar ${className} ${disabled ? "control-bar-disabled" : ""} ${
        isGuidedRestricted
          ? `control-bar-guided-restricted control-bar-guided-focus-${guidedFocusTarget === "home-trash-control" ? "trash" : "multi"}`
          : ""
      }`}
      style={fitParent ? { minWidth: 0 } : undefined}
      aria-disabled={disabled}
      data-guided-focus-interactive={
        isGuidedRestricted ? String(guidedFocusInteractive) : undefined
      }
      onClickCapture={blockRestrictedClick}
    >
        {children}
    </div>
  );
}
