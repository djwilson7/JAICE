import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useDrag } from "@/pages/home/hooks/useDrag";

const SCROLL_EDGE_THRESHOLD = 8;

export function KanbanContent({ children }: { children: ReactNode }) {
  const { isDragging } = useDrag();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollContentRef = useRef<HTMLDivElement | null>(null);
  const [scrollShadow, setScrollShadow] = useState({
    left: false,
    right: false,
  });

  const updateScrollShadow = useCallback(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const maxScrollLeft = scrollEl.scrollWidth - scrollEl.clientWidth;
    const hasOverflow = maxScrollLeft > SCROLL_EDGE_THRESHOLD;

    setScrollShadow({
      left: hasOverflow && scrollEl.scrollLeft > SCROLL_EDGE_THRESHOLD,
      right:
        hasOverflow &&
        scrollEl.scrollLeft < maxScrollLeft - SCROLL_EDGE_THRESHOLD,
    });
  }, []);

  useEffect(() => {
    updateScrollShadow();

    const scrollEl = scrollRef.current;
    const scrollContentEl = scrollContentRef.current;
    if (!scrollEl || !scrollContentEl || typeof ResizeObserver === "undefined")
      return;

    const resizeObserver = new ResizeObserver(updateScrollShadow);
    resizeObserver.observe(scrollEl);
    resizeObserver.observe(scrollContentEl);

    return () => {
      resizeObserver.disconnect();
    };
  }, [children, updateScrollShadow]);

  return (
    <div
      className={`kanban-content-frame ${
        scrollShadow.left && !isDragging ? "kanban-content-shadow-left" : ""
      } ${
        scrollShadow.right && !isDragging ? "kanban-content-shadow-right" : ""
      } flex min-h-0 w-full flex-1`}
    >
      <div
        ref={scrollRef}
        onScroll={updateScrollShadow}
        className={`kanban-content-scroll flex min-h-0 w-full flex-1 ${
          isDragging ? "overflow-visible" : "overflow-x-auto overflow-y-visible"
        }`}
      >
        <div
          ref={scrollContentRef}
          className="flex min-h-0 min-w-full items-stretch gap-2 p-1"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
