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
  const [showToolTip, setShowToolTip] = useState(false);

  // State to track tooltip position
  const [coords, setCoords] = useState({
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  });

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
      ? "border-[var(--primary-four)] focus:border-[var(--primary-five)]"
      : "border-red-500 focus:border-red-600";

  // Determine label color based on validity
  const labelColorClass =
    isValid || isValid === null
      ? "text-[var(--primary-four)] peer-focus:text-[var(--primary-five)]"
      : "text-red-500 peer-focus:text-red-600";


  return (
    <div className="relative" style={style}>
      <input
        ref={inputRef}
        onFocus={() => {
          const rect = inputRef.current?.getBoundingClientRect();
          if (rect) {
            setCoords({
              left: rect.left,
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
            });
          }
          setShowToolTip(true);
        }}
        onBlur={() => setShowToolTip(false)}
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
        text-[var(--primary-five)] 
        bg-transparent 
        rounded-lg 
        border-1 
        ${borderColorClass}
        appearance-none 
        focus:outline-none 
        focus:ring-0 
        focus:border-[var(--primary-five)]
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
        scale-90 
        top-2 
        z-10 
        origin-[0] 
        bg-transparent
        backdrop-blur-xl
        px-2 
        ${labelColorClass} 
        peer-placeholder-shown:scale-100 
        peer-placeholder-shown:-translate-y-1/2 
        peer-placeholder-shown:top-1/2 
        peer-focus:top-2 
        peer-focus:scale-90 
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
        showToolTip &&
        createPortal(
          <div
            className="fixed border border-white/20 rounded-xl p-4 backdrop-blur-xl z-50 bg-black/60"
            style={{ ...toolTipStyle }}
            role="tooltip"
          >
            <p className="font-bold w-full text-center">{errorTitle}</p>
            <p className="red-text">{errorMessage}</p>
          </div>,
          document.body
        )}
    </div>
  );
}
