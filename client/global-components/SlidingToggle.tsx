// import { localfiles } from "@/directory/path/to/localimport";

import React, { useState } from "react";

interface SlidingToggleProps {
  leftLabel: string;
  rightLabel: string;
  action: (value: boolean) => void;
  initialValue?: boolean;
}

export function SlidingToggle({ leftLabel, rightLabel, action, initialValue }: SlidingToggleProps) {
  const [isLeft, setIsLeft] = useState(initialValue || false);

  const toggleStyle: React.CSSProperties = {
    appearance: "none",
    width: "100%",
    height: "50px",
    background: "transparent",
    color: "white",
    borderRadius: "20px",
    cursor: "pointer",
    textAlign: "center",
    lineHeight: "40px",
    zIndex: 10,
    padding: "0.6em 1.2em"
  };

  const selectedStyle: React.CSSProperties = {
    fontWeight: "bold",
    background: "var(--primary-one)",
    width: "50%",
    height: "50px",
    borderRadius: "20px",
    left: isLeft ? "0%" : "50%",
    animation: "slide 0.3s ease-in-out",
    transition: "left 0.3s ease-in-out",
    position: "absolute",
    zIndex: 0,
    boxShadow: "0 0px 10px rgba(var(--primary-three-rgb), 0.4)",
    padding: "0.6em 1.2em"
  };

  const rightLabelStyle: React.CSSProperties = {
    color: isLeft ? "var(--primary-four)" : "var(--primary-five)",
    fontSize: isLeft ? "var(--fs-body)" : "var(--fs-subheading)"
  };

  const leftLabelStyle: React.CSSProperties = {
    color: isLeft ? "var(--primary-five)" : "var(--primary-four)",
    fontSize: isLeft ? "var(--fs-subheading)" : "var(--fs-body)"
  };

  return (
    <div className="flex relative items-center justify-center">
      <div style={selectedStyle} />
      <label className="absolute w-1/2 - self-center left-0 z-2" style={leftLabelStyle}>{leftLabel}</label>
      <label className="absolute w-1/2 self-center right-0 z-2" style={rightLabelStyle}>{rightLabel}</label>
      <input
        type="checkbox"
        checked={isLeft}
        onChange={() => {
          setIsLeft(!isLeft);
          action(isLeft);
        }}
        style={toggleStyle}
      />
    </div>
  );
}
