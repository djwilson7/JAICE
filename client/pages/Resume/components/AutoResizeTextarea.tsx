import React, { useEffect, useRef } from "react";

export const AutoResizeTextarea = React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }
>(({ value, className, onChange, ...props }, ref) => {
    const localRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        const textarea = localRef.current;
        if (!textarea) return;
        textarea.style.height = "auto";
        // Calculate the exact border height to prevent scrollHeight border-box clipping.
        // Falls back to 2px if the element is not currently visible in the layout.
        const borderHeight = (textarea.offsetHeight - textarea.clientHeight) || 2;
        textarea.style.height = `${textarea.scrollHeight + borderHeight}px`;
    };

    // Use useLayoutEffect to run adjustHeight synchronously after every render
    // to ensure React's virtual DOM reconciliation doesn't wipe out the height style.
    React.useLayoutEffect(() => {
        adjustHeight();
    });

    // Add window resize listener
    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return (
        <textarea
            {...props}
            ref={(el) => {
                localRef.current = el;
                if (typeof ref === "function") {
                    ref(el);
                } else if (ref) {
                    (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
                }
            }}
            rows={1}
            value={value}
            onChange={onChange}
            onInput={(e) => {
                props.onInput?.(e);
                adjustHeight();
            }}
            onFocus={(e) => {
                props.onFocus?.(e);
                adjustHeight();
            }}
            onMouseEnter={(e) => {
                props.onMouseEnter?.(e);
                adjustHeight();
            }}
            className={className}
        />
    );
});
AutoResizeTextarea.displayName = "AutoResizeTextarea";

