export function ControlBar({
  children,
  fitParent = false,
  className = "",
  disabled = false,
}: {
  children: React.ReactNode;
  fitParent?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={`control-bar ${className} ${disabled ? "control-bar-disabled" : ""}`}
      style={fitParent ? { minWidth: 0 } : undefined}
      aria-disabled={disabled}
      inert={disabled ? true : undefined}
      onClickCapture={disabled ? (event) => {
        event.preventDefault();
        event.stopPropagation();
      } : undefined}
    >
        {children}
    </div>
  );
}
