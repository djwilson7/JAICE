import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function DesktopViewportOverlay({ isOpen }: { isOpen: boolean }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const preventInput = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };
    const keepFocusOnOverlay = (event: FocusEvent) => {
      if (!overlayRef.current?.contains(event.target as Node)) {
        overlayRef.current?.focus();
      }
    };
    const blockedEvents = [
      "click",
      "pointerdown",
      "wheel",
      "touchmove",
      "keydown",
      "input",
      "change",
      "submit",
    ];

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    blockedEvents.forEach((eventName) =>
      document.addEventListener(eventName, preventInput, {
        capture: true,
        passive: false,
      })
    );
    document.addEventListener("focusin", keepFocusOnOverlay, true);
    overlayRef.current?.focus();

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      blockedEvents.forEach((eventName) =>
        document.removeEventListener(eventName, preventInput, true)
      );
      document.removeEventListener("focusin", keepFocusOnOverlay, true);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="guided-tour-viewport-overlay">
      <div
        ref={overlayRef}
        className="guided-tour-viewport-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-tour-viewport-title"
        aria-describedby="guided-tour-viewport-description"
        tabIndex={-1}
      >
        <div className="guided-tour-viewport-visual" aria-hidden="true">
          <span className="guided-tour-viewport-screen" />
          <span className="guided-tour-viewport-stand" />
        </div>
        <p className="guided-tour-viewport-eyebrow">Desktop experience</p>
        <h1 id="guided-tour-viewport-title">Give JAICE a little more room</h1>
        <p id="guided-tour-viewport-description">
          Enlarge this browser or switch from mobile to desktop to continue.
          This will disappear when the view reaches the minimum size.
        </p>
        <p className="guided-tour-viewport-note">
          Your current page and progress will stay right where they are.
        </p>
      </div>
    </div>,
    document.body
  );
}
