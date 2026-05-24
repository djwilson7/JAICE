import { useDrag } from "@/pages/home/hooks/useDrag";

export function KanbanContent({ children }: { children: React.ReactNode }) {
  const { isDragging } = useDrag();

  return (
    <div
      className={`flex min-h-0 w-full flex-1 items-stretch gap-4 p-1 ${
        isDragging ? "overflow-visible" : "overflow-x-auto overflow-y-visible"
      }`}
    >
      {children}
    </div>
  );
}
