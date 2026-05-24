import React, { useState } from "react";
import { motion } from "framer-motion";
import plusIcon from "@/assets/icons/plus.svg";
import { EmptyColumnPlaceholder } from "@/pages/home/home-components/column/EmptyColumnPlaceholder";
import Button from "@/global-components/button";
import { ColumnTitle } from "@/pages/home/home-components/column/ColumnTitle";
import { useDrag } from "@/pages/home/hooks/useDrag";
import type { DragTarget } from "@/types/dragTarget";
import type { KanBanColumn } from "@/pages/home/home-components/column/KanBanColumn";
import { getCSSVar } from "@/utils/getCSSVar";

interface ColumnProps {
  column: KanBanColumn;
  children: React.ReactNode;
  count: number;
  isHighlighted: string | null;
  openJobAppModal: (columnId: string) => void;
}

export function Column({
  column,
  children,
  count,
  isHighlighted,
  openJobAppModal,
}: ColumnProps) {
  const { setDragTarget, isDragging } = useDrag();
  const hasChildren = count > 0;

  const highlightColumn =
    isHighlighted === column.id || isHighlighted === "all";

  const [addButtonStyle, setAddButtonStyle] = useState("w-5 h-5");

  const shouldHideAddButton =
    column.title === "Processing" || column.title === "Review";
  
  if (column.visible === false) {
    return null;
  }

  return (
    <motion.div
      className="flex h-full min-h-full min-w-[19rem] flex-[0_0_19rem] self-stretch 2xl:min-w-[21rem] 2xl:flex-[1_0_21rem]"
      transition={{ duration: parseFloat(getCSSVar("--animation-duration")), ease: "easeInOut" }}
    >
      <motion.div
        style={{
          pointerEvents: column.visible ? "auto" : "none",
          background: column.bg,
          width: "100%",
        }}
        className={`flex h-full min-h-full flex-col p-2 corner-radius shadow ${
          highlightColumn ? "highlighted" : ""
        }`}
        onPointerEnter={() => setDragTarget(column.id as DragTarget)}
        onPointerLeave={() => setDragTarget(null)}
      >
        {/* Header */}
        <div className="flex relative items-center justify-between w-full h-[4rem] select-none">
          <div className="absolute left-2 mx-2 w-8 h-8 justify-center items-center hidden 2xl:flex">
            {!shouldHideAddButton && (
              <Button
                type="button"
                className="roundSmall"
                aria-label={`Add new application to ${column.title} stage`}
                title={`Add new application to ${column.title} stage`}
                onClick={() => openJobAppModal(column.id)}
                onMouseEnter={() => setAddButtonStyle("w-7 h-7")}
                onMouseLeave={() => setAddButtonStyle("w-5 h-5")}
              >
                <img
                  src={plusIcon}
                  alt="Add Application"
                  className={`flex ${addButtonStyle} icon animate-element`}
                />
              </Button>
            )}
          </div>

          <ColumnTitle title={column.title} />

          <div className="flex absolute right-2 mx-2 h-full items-center justify-center hidden 2xl:flex">
            <h3>{count}</h3>
          </div>
        </div>

        <div className="flex border-b mx-4 mb-2" />

        <div
          className={`kanban-column-scroll ${
            isDragging ? "kanban-column-scroll-dragging" : ""
          } flex min-h-0 w-full flex-1 flex-col items-center gap-4 py-0 pl-0 pr-0.5`}
        >
          {hasChildren ? (
            children
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <EmptyColumnPlaceholder title={column.title} />
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
