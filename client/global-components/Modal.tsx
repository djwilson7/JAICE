import { createPortal } from "react-dom";
import { useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ModalHeader } from "@/global-components/ModalHeader";
import { ModalDivider } from "@/global-components/ModalDivider";

export interface ModalAction {
  label: ReactNode;
  onClick?: () => Promise<void> | void;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  form?: string;
  title?: string;
  ariaLabel?: string;
}

interface ModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  children: ReactNode;
  modalTitle?: string;
  title?: string;
  ariaLabel?: string;
  closeOnBackdrop?: boolean;
  showHeader?: boolean;
  className?: string;
  contentClassName?: string;
  style?: CSSProperties;
  primaryAction?: ModalAction;
  secondaryAction?: ModalAction;
  footer?: ReactNode;
}

export function Modal({
  isOpen,
  open,
  onClose,
  children,
  modalTitle,
  title,
  ariaLabel,
  closeOnBackdrop = true,
  showHeader,
  className = "w-lg",
  contentClassName = "modal-content",
  style,
  primaryAction,
  secondaryAction,
  footer,
}: ModalProps) {
  const isVisible = isOpen ?? open ?? false;
  const resolvedTitle = modalTitle ?? title;
  const shouldShowHeader = showHeader ?? Boolean(resolvedTitle);

  useEffect(() => {
    if (!isVisible) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;
  const hasFooter = Boolean(primaryAction || footer);

  const renderActionButton = (
    action: ModalAction,
    variantClassName: string
  ) => (
    <button
      type={action.type ?? "button"}
      form={action.form}
      className={`modal-action-button ${variantClassName} ${action.className ?? ""}`.trim()}
      onClick={action.onClick ? () => void action.onClick?.() : undefined}
      disabled={action.disabled}
      title={action.title}
      aria-label={action.ariaLabel}
    >
      {action.label}
    </button>
  );

  return createPortal(
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? resolvedTitle ?? "Dialog"}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`modal ${className}`.trim()}
        style={style}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {shouldShowHeader && resolvedTitle && (
          <>
            <ModalHeader title={resolvedTitle} onClose={onClose} />
            <ModalDivider />
          </>
        )}
        <div className={contentClassName}>{children}</div>
        {hasFooter && (
          <>
            <ModalDivider />
            {footer ? (
              <div className="modal-button-row">{footer}</div>
            ) : (
              <div className="modal-button-row">
                {secondaryAction &&
                  renderActionButton(secondaryAction, "modal-action-secondary")}
                {primaryAction &&
                  renderActionButton(primaryAction, "modal-action-primary")}
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
