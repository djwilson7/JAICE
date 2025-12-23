export function KanbanContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex align-items:stretch gap-4 justify-evenly w-full">{children}</div>
  );
}
