import React, { useCallback, useEffect, useRef, useState, forwardRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EmptyColumnPlaceholder } from "@/pages/home/home-components/column/EmptyColumnPlaceholder";
import { ColumnTitle } from "@/pages/home/home-components/column/ColumnTitle";
import { useDrag } from "@/pages/home/hooks/useDrag";
import type { KanBanColumn } from "@/pages/home/home-components/column/KanBanColumn";
import { getCSSVar } from "@/utils/getCSSVar";
import { isValidColumn } from "@/types/validColumns";
import { useSettings } from "@/pages/settings/provider/settingsContext";
import { getJobsMovingToColumn } from "@/pages/home/utils/jobDisplayColumn";

const SCROLL_EDGE_THRESHOLD = 8;

interface ColumnProps {
  column: KanBanColumn;
  children: React.ReactNode;
  count: number;
  isHighlighted: string | null;
}

export const Column = forwardRef<HTMLDivElement, ColumnProps>(({
  column,
  children,
  count,
  isHighlighted,
}, ref) => {
  const { setDragTarget, isDragging, dragTarget, draggedJobs } = useDrag();
  const { reviewBehavior } = useSettings();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollContentRef = useRef<HTMLDivElement | null>(null);
  const [scrollShadow, setScrollShadow] = useState({
    top: false,
    bottom: false,
  });
  const hasChildren = count > 0;
  const previewCount = isValidColumn(column.id)
    ? getJobsMovingToColumn(draggedJobs, column.id, reviewBehavior).length
    : 0;
  const showDropPreview =
    isDragging && dragTarget === column.id && previewCount > 0;

  const highlightColumn =
    isHighlighted === column.id || isHighlighted === "all";

  const updateScrollShadow = useCallback(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const maxScrollTop = scrollEl.scrollHeight - scrollEl.clientHeight;
    const hasOverflow = maxScrollTop > SCROLL_EDGE_THRESHOLD;

    setScrollShadow({
      top: hasOverflow && scrollEl.scrollTop > SCROLL_EDGE_THRESHOLD,
      bottom:
        hasOverflow &&
        scrollEl.scrollTop < maxScrollTop - SCROLL_EDGE_THRESHOLD,
    });
  }, []);

  useEffect(() => {
    updateScrollShadow();

    const scrollEl = scrollRef.current;
    const scrollContentEl = scrollContentRef.current;
    if (!scrollEl || !scrollContentEl || typeof ResizeObserver === "undefined") return;

    const resizeObserver = new ResizeObserver(updateScrollShadow);
    resizeObserver.observe(scrollEl);
    resizeObserver.observe(scrollContentEl);

    return () => {
      resizeObserver.disconnect();
    };
  }, [children, count, updateScrollShadow]);

  return (
    <motion.div
      ref={ref}
      layout
      className={
        column.id === "processing"
          ? "flex h-full min-h-full shrink-0 overflow-hidden"
          : "flex h-full min-h-full min-w-[16.5rem] flex-[0_0_16.5rem] self-stretch 2xl:min-w-[18.5rem] 2xl:flex-[1_0_18.5rem]"
      }
      initial={column.id === "processing" ? { width: 0, opacity: 0 } : false}
      animate={column.id === "processing" ? { width: "auto", opacity: 1 } : false}
      exit={column.id === "processing" ? { width: 0, opacity: 0 } : undefined}
      transition={
        column.id === "processing"
          ? { duration: 0.28, ease: [0.32, 0.72, 0, 1] }
          : { duration: parseFloat(getCSSVar("--animation-duration")), ease: "easeInOut" }
      }
    >
      <div
        className={
          column.id === "processing"
            ? "flex h-full min-h-full min-w-[16.5rem] flex-[0_0_16.5rem] self-stretch w-full 2xl:min-w-[18.5rem] 2xl:flex-[1_0_18.5rem]"
            : "flex h-full w-full min-w-0"
        }
      >
      <motion.div
        style={{
          pointerEvents: column.visible ? "auto" : "none",
          background: column.bg,
          width: "100%",
        }}
        className={`kanban-column-surface flex h-full min-h-full flex-col px-2 py-4 corner-radius ${
          highlightColumn ? "highlighted" : ""
        }`}
        data-drag-target={column.id}
        onPointerEnter={() =>
          setDragTarget(isValidColumn(column.id) ? column.id : null)
        }
        onPointerLeave={() => setDragTarget(null)}
      >
        {/* Header */}
        <div className="flex relative w-full items-center justify-between select-none">
          <ColumnTitle title={column.title} count={count} />
        </div>

        <div className="flex w-full py-4">
          <div className="column-divider w-full" />
        </div>

        <div
          className={`kanban-column-scroll-frame ${
            scrollShadow.top && !isDragging ? "kanban-column-scroll-shadow-top" : ""
          } ${
            scrollShadow.bottom && !isDragging
              ? "kanban-column-scroll-shadow-bottom"
              : ""
          } flex min-h-0 w-full flex-1`}
        >
          <div
            ref={scrollRef}
            onScroll={updateScrollShadow}
            className={`kanban-column-scroll ${
              isDragging ? "kanban-column-scroll-dragging" : ""
            } flex h-full min-h-0 w-full flex-col items-center gap-2 py-0 pl-0 pr-0.5`}
          >
            <div
              ref={scrollContentRef}
              className="flex w-full flex-col items-center gap-2"
            >
              <AnimatePresence initial={false}>
                {showDropPreview && (
                  <motion.div
                    className="kanban-drop-preview job-card flex min-h-[4.5rem] w-full shrink-0 items-center justify-center px-4 py-3 text-center"
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <span>
                      Add {previewCount}{" "}
                      {previewCount === 1 ? "Email" : "Emails"} to the &quot;
                      {column.title}&quot; column?
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              {hasChildren ? (
                children
              ) : (
                <motion.div
                  className="w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <EmptyColumnPlaceholder title={column.title} />
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
      </div>
    </motion.div>
  );
});
