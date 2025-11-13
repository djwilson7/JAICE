// import { localfiles } from "@/directory/path/to/localimport";
import React, { useState } from "react";

export default function Button({
  onClick,
  children,
  isSelected = false,
  type = "button",
  style = {}, 
}: {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  isSelected?: boolean;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
}) {
  const selectedClass = isSelected ? "selected" : "";
  return (
    <button
      type={type}
      onClick={(event) =>  onClick?.(event) }
      className={`${selectedClass}`}
      style={style}
    >
      {children}
    </button>
  );
}


type ButtonVisualState = "default" | "hover" | "success" | "failure";

interface HoverIconButtonProps {
    baseIcon: string;
    hoverIcon: string;
    successIcon: string;
    failureIcon: string;
    alt: string;
    onClick: () => Promise<boolean> | void;
}

export function HoverIconButton({
  baseIcon,
  hoverIcon,
  successIcon,
  failureIcon,
  alt,
  onClick,
}: HoverIconButtonProps) {
  const [state, setState] = useState<ButtonVisualState>("default");

  const getIcon = () => {
    switch (state) {
      case "hover":
        return hoverIcon;
      case "success":
        return successIcon;
      case "failure":
        return failureIcon;
      default:
        return baseIcon;
    }
  };

  const handleClick = async () => {
    try {
      const result = await onClick();
      setState(result === false ? "failure" : "success");
      setTimeout(() => setState("default"), 2000);
    } catch {
      setState("failure");
      setTimeout(() => setState("default"), 2000);
    }
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => state === "default" && setState("hover")}
      onMouseLeave={() => state === "hover" && setState("default")}
    >
      <img
        src={getIcon()}
        alt={alt}
        className="w-5 h-5 transition-all duration-150"
      />
    </button>
  );
}