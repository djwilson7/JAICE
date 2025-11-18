// import { localfiles } from "@/directory/path/to/localimport";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";

export function FloatingInputField({
  label,
  type,
  value,
  isValid,
  action,
  errorTitle,
  errorMessage,
  style,
}: {
  label: string;
  type: string;
  value: string;
  isValid: boolean | null;
  action: (value: string) => void;
  errorTitle?: string;
  errorMessage?: string;
  style?: React.CSSProperties;
}) {
  // State to track if the input is focused (to show tooltip)
  const [isFocused, setIsFocused] = useState(false);

  // State to track tooltip position
  const [coords, setCoords] = useState({ left: 0, top: 0, right: 0, bottom: 0 });

  // Ref to the input element to get its position
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate a unique ID for the input based on the label
  const inputID = label.toLowerCase().replace(/\s+/g, "-");

  // Check if the screen is small (for responsive design, if needed)
  const isSmall = window.innerWidth < 768;

  const toolTipStyle = isSmall
    ? {
        left: coords.left,
        top: coords.bottom + 8,
        transform: "translateX(-50%)",
      }
      : {
        left: coords.left,
        top: coords.top,
        transform: "translate(-105%, -20%)",
      };

  // Determine if we should show the error modal
  const showModal = errorTitle && errorMessage;

  // Determine border and label colors based on validity
  const borderColorClass =
    isValid || isValid === null
      ? "border-[var(--color-blue-4)] focus:border-[var(--color-blue-5)]"
      : "border-red-500 focus:border-red-600";

  // Determine label color based on validity
  const labelColorClass =
    isValid || isValid === null
      ? "text-[var(--color-blue-4)] peer-focus:text-[var(--color-blue-5)]"
      : "text-red-500 peer-focus:text-red-600";

  // Functions to cycle the focus and blur states, setting coords for tooltip
  const setFocus = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setCoords( isSmall ? {
      left: rect.left + rect.width / 2,
      top: rect.bottom + 8,
      right: rect.right,
      bottom: rect.bottom + 8,
    } : {
      left: rect.left,
      top: rect.top,
      right: rect.left + 8,
      bottom: 0,
    });

    setIsFocused(true);
  };

  const setBlur = () => {
    setIsFocused(false);
  };

  return (
    <div className="relative" style={style}>
      <input
        ref={inputRef}
        onFocus={setFocus}
        onBlur={setBlur}
        type={type}
        id={inputID}
        autoComplete={type === "password" ? "current-password" : "email"}
        className={`
        block 
        px-2.5 
        pb-2.5 
        pt-4 
        w-full 
        text-sm 
        text-[var(--color-blue-5)] 
        bg-transparent 
        rounded-lg 
        border-1 
        ${borderColorClass}
        appearance-none 
        focus:outline-none 
        focus:ring-0 
        focus:border-[var(--color-blue-5)]
        peer
        `}
        placeholder=" "
        value={value}
        onChange={(e) => {
          action(e.target.value);
        }}
      />
      <label
        htmlFor={inputID}
        className={`
        absolute 
        text-sm 
        duration-300 
        transform 
        -translate-y-4 
        scale-75 
        top-2 
        z-10 
        origin-[0] 
        bg-rgba(var(--color-blue-5-rgb), 0.1)
        backdrop-blur-xl
        px-2 
        ${labelColorClass}
        peer-focus:px-2 
        peer-placeholder-shown:scale-100 
        peer-placeholder-shown:-translate-y-1/2 
        peer-placeholder-shown:top-1/2 
        peer-focus:top-2 
        peer-focus:scale-75 
        peer-focus:-translate-y-4 
        rtl:peer-focus:translate-x-1/4 
        rtl:peer-focus:left-auto 
        start-1
        `}
      >
        {label}
      </label>
      {showModal &&
        !isValid &&
        isFocused &&
        createPortal(
          <div
            className="fixed border border-white/20 rounded-xl p-4 backdrop-blur-xl z-50 bg-black/60"
            style={{ ...toolTipStyle }}
            role="tooltip"
          >
            <p className="font-bold w-full text-center">{errorTitle}</p>
            <p>{errorMessage}</p>
          </div>,
          document.body
        )}
    </div>
  );
}
