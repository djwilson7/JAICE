// import { localfiles } from "@/directory/path/to/localimport";
import React, { useState } from "react";

export default function Button({
  onClick,
  onMouseEnter,
  onMouseLeave,
  children,
  isSelected = false,
  type = "button",
  style = {},
  className = "",
  disabled = false,
  title = "",
}: {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseEnter?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  isSelected?: boolean;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  const selectedClass = isSelected ? "selected" : "";
  return (
    <button
      type={type}
      onClick={(event) =>  onClick?.(event) }
      onMouseEnter={(event) => onMouseEnter?.(event)}
      onMouseLeave={(event) => onMouseLeave?.(event)}
      className={`${selectedClass} ${className} animate-element`}
      style={style}
      disabled={disabled}
      title={title}
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
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
    hoverClassName?: string;
    title?: string;
}

export function HoverIconButton({
  baseIcon,
  hoverIcon,
  successIcon,
  failureIcon,
  alt,
  onClick,
  disabled,
  className = "",
  style = {},
  hoverClassName = "",
  title = "",
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
    <Button
      onClick={handleClick}
      onMouseEnter={() => state === "default" && setState("hover")}
      onMouseLeave={() => state === "hover" && setState("default")}
      disabled={disabled}
      className={`${className} animate-element`}
      style={style}
      title={title}
    >
      <img
        src={getIcon()}
        alt={alt}
        className={`w-5 h-5 icon animate-element ${state === "hover" ? hoverClassName : ""}`}
      />
    </Button>
  );
}