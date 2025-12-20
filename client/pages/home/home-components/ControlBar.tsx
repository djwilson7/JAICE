export function ControlBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-[50px] justify-start">
      <div className="w-full min-w-[63rem] h-[50px] flex items-center justify-between gap-4">
        {children}
      </div>
    </div>
  );
}
