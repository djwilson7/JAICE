// import { localfiles } from "@/directory/path/to/localimport";

import React, { useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";

interface ColumnProps {
  id: string;
  title: string;
  children: React.ReactNode;
  bg: string;
  count: number;
  onDragEnter: (columnId: string) => void;
  onDragLeave: () => void;
  reportHeight: (columnId: string, height: number) => void;
  sharedHeight: number;
  viewportHeight: number;
}

export function Column({
  id,
  title,
  children,
  bg,
  count,
  onDragEnter,
  onDragLeave,
  reportHeight,
  sharedHeight,
  viewportHeight,
}: ColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null); // Ref to the column div

  useEffect(() => {
    const el = columnRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        reportHeight(id, entry.contentRect.height);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [id, reportHeight]);

  const columnStyle = {
    backgroundColor: bg,
    borderRadius: "8px",
    width: "100%",
    border: "1px solid #ccc",
    minWidth: "15rem",
    minHeight: `${Math.max(sharedHeight, viewportHeight)}px`,
    height: "auto",
  };

  // useCallback is used to memoize the drag handlers to prevent unnecessary re-renders
  const handlePointerEnter = useCallback(() => {
    onDragEnter(id);
  }, [onDragEnter, id]);

  const handlePointerLeave = useCallback(() => {
    onDragLeave();
  }, [onDragLeave]);

  // onPointerEnter and onPointerLeave are used to send the column id up to the parent for drag and drop handling
  // layout is used for smooth animations when removing or adding job cards (drag and drop)
  // React.Children.count(children) is the safe way to count the number of cards a columns has
  return (
    <motion.div
      id={id}
      ref={columnRef}
      style={columnStyle}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className="flex flex-col m-2 p-2 border-4 border-white transition-all duration-300"
      layout
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
    >
      <div className="flex items-center justify-between p-4 select-none">
        <h3>+</h3>
        <h3>{title}</h3>
        <h3>{count}</h3>
      </div>
      <div className="flex border-b mx-4 mb-2" />
      <div className="flex flex-col items-center p-2 gap-4">{children}</div>
    </motion.div>
  );
};
