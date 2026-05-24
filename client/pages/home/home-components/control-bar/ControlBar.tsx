export function ControlBar({
  children,
  fitParent = false,
}: {
  children: React.ReactNode;
  fitParent?: boolean;
}) {
  return (
    <div className="control-bar" style={fitParent ? { minWidth: 0 } : undefined}>
        {children}
    </div>
  );
}
