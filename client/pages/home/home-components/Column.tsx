import React, { useRef, useCallback, useState } from "react";
import { motion } from "framer-motion";
import plusIcon from "@/assets/icons/plus.svg";
import { EmptyColumnPlaceholder } from "@/pages/home/home-components/EmptyColumnPlaceholder";
import Button from "@/global-components/button";
import { ColumnTitle } from "./ColumnTitle";

interface ColumnProps {
  id: string;
  title: string;
  children: React.ReactNode;
  bg: string;
  count: number;
  onDragEnter: (columnId: string) => void;
  onDragLeave: () => void;
  viewportHeight: number;
  showToggleRejectButton?: boolean;
  onToggleReject?: () => void;
  isHighlighted: string | null;
  openJobAppModal: (columnId: string) => void;
}

export function Column({
  id,
  title,
  children,
  bg,
  count,
  onDragEnter,
  onDragLeave,
  viewportHeight,
  showToggleRejectButton,
  onToggleReject,
  isHighlighted,
  openJobAppModal,
}: ColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const hasChildren = count > 0;

  const columnStyle = {
    background: bg,
    width: "100%",
    minWidth: "20rem",
    minHeight: `${viewportHeight}px`,
    height: "auto",
    flex: 1,
  };

  const handlePointerEnter = useCallback(() => {
    onDragEnter(id);
  }, [onDragEnter, id]);

  const handlePointerLeave = useCallback(() => {
    onDragLeave();
  }, [onDragLeave]);

  const highlightColumn = isHighlighted === id || isHighlighted === "all";
  const [addButtonStyle, setAddButtonStyle] = useState("w-3 h-3");

  function handleMouseOverAddButton() {
    setAddButtonStyle("w-5 h-5");
  }

  function handleMouseOutAddButton() {
    setAddButtonStyle("w-3 h-3");
  }

  return (
    <motion.div
      id={id}
      ref={columnRef}
      style={columnStyle}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={`flex flex-col m-2 p-2 animate-element corner-radius shadow ${
        highlightColumn ? "highlighted" : ""
      }`}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
      layout
    >
      <div className="flex relative items-center justify-between w-full h-[4rem] select-none">
        <div className="absolute left-2 mx-2 w-8 h-8 justify-center items-center">
          <Button
            type="button"
            className="roundSmall"
            aria-label={`Add new application to ${title} stage`}
            title={`Add new application to ${title} stage`}
            onClick={() => openJobAppModal(id)}
            onMouseEnter={handleMouseOverAddButton}
            onMouseLeave={handleMouseOutAddButton}
          >
            <img
              src={plusIcon}
              alt="Add Application"
              className={`flex ${addButtonStyle} icon animate-element`}
            />
          </Button>
        </div>

        <ColumnTitle
          title={title}
          index={0}
          onToggle={onToggleReject}
          canToggle={showToggleRejectButton}
        />

        <div className="flex absolute right-2 mx-2 h-full items-center justify-center ">
          <h3>{count}</h3>
        </div>
      </div>
      <div className="flex border-b mx-4 mb-2" />
      <div className="flex flex-col items-center p-2 gap-4">
        {hasChildren ? (
          children
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {<EmptyColumnPlaceholder title={title} />}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
