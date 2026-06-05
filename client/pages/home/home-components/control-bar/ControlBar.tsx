export function ControlBar({
  children,
  fitParent = false,
  className = "",
}: {
  children: React.ReactNode;
  fitParent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`control-bar ${className}`}
      style={fitParent ? { minWidth: 0 } : undefined}
    >
        {children}
    </div>
  );
}
