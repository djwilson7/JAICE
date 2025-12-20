import { useDrag } from "@/pages/home/hooks/useDrag";

export function PageShadow() {
  const { isDragging } = useDrag();

  if (isDragging) {
    return null;
  }

  return (
    <div
      className="relative bottom-0 w-full bg-transparent z-1"
      style={{ boxShadow: "var(--page-shadow)" }}
    ></div>
  );
}
