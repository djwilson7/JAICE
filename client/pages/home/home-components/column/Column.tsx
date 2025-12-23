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
  viewportHeight: number;
  isHighlighted: string | null;
  openJobAppModal: (columnId: string) => void;
}

export function Column({
  column,
  children,
  count,
  viewportHeight,
  isHighlighted,
  openJobAppModal,
}: ColumnProps) {
  const { setDragTarget } = useDrag();
  const hasChildren = count > 0;

  const highlightColumn =
    isHighlighted === column.id || isHighlighted === "all";

  const [addButtonStyle, setAddButtonStyle] = useState("w-5 h-5");

  const shouldHideAddButton =
    column.title === "Processing" || column.title === "Review";

  return (
    <motion.div
      className="flex"
      style={{
        minWidth: 0,
      }}
      animate={{
        flexGrow: column.visible ? 1 : 0,
        flexShrink: 1,
        flexBasis: column.visible ? "20rem" : "0rem",
        opacity: column.visible ? 1 : 0,
      }}
      transition={{ duration: parseFloat(getCSSVar("--animation-duration")), ease: "easeInOut" }}
    >
      <motion.div
        style={{
          pointerEvents: column.visible ? "auto" : "none",
          background: column.bg,
          minHeight: viewportHeight,
          width: "100%",
        }}
        className={`flex flex-col p-2 corner-radius shadow ${
          highlightColumn ? "highlighted" : ""
        }`}
        onPointerEnter={() => setDragTarget(column.id as DragTarget)}
        onPointerLeave={() => setDragTarget(null)}
      >
        {/* Header */}
        <div className="flex relative items-center justify-between w-full h-[4rem] select-none">
          <div className="absolute left-2 mx-2 w-8 h-8 justify-center items-center">
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

          <div className="flex absolute right-2 mx-2 h-full items-center justify-center">
            <h3>{count}</h3>
          </div>
        </div>

        <div className="flex border-b mx-4 mb-2" />

        <div className="flex flex-col items-center p-2 gap-4">
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
