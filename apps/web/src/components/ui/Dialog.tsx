import { X } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { Button } from "./Button";
import { IconButton } from "./IconButton";

export interface DialogProps {
  children: React.ReactNode;
  closeOnOutsideClick?: boolean;
  description?: string;
  footer?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  closeOnOutsideClick = true,
}: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden"; // Prevent scrolling
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnOutsideClick && e.target === overlayRef.current) {
      onClose();
    }
  };

  return createPortal(
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "dialog-title" : undefined}
      aria-describedby={description ? "dialog-description" : undefined}
    >
      <div
        ref={contentRef}
        className="w-full max-w-md rounded-2xl bg-light-primary dark:bg-dark-primary border border-black/[0.08] dark:border-white/[0.08] shadow-2xl overflow-hidden animate-scaleIn"
      >
        {(title || description) && (
          <div className="px-6 py-4 border-b border-black/[0.05] dark:border-white/[0.05] flex justify-between items-start">
            <div>
              {title && (
                <h2 id="dialog-title" className="text-lg font-bold text-light-text dark:text-dark-text">
                  {title}
                </h2>
              )}
              {description && (
                <p id="dialog-description" className="text-sm text-light-text-muted dark:text-dark-text-muted mt-1">
                  {description}
                </p>
              )}
            </div>
            <IconButton
              onClick={onClose}
              icon={<X className="w-5 h-5" />}
              label="Close dialog"
              variant="ghost"
              className="mt-0.5 -mr-2"
            />
          </div>
        )}
        
        <div className="px-6 py-4">
          {children}
        </div>

        {footer && (
          <div className="px-6 py-4 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/[0.05] dark:border-white/[0.05]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export interface ConfirmDialogProps extends Omit<DialogProps, "children" | "footer"> {
  cancelLabel?: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  isLoading = false,
  ...props
}: ConfirmDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "primary"}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      }
      {...props}
    >
      <></>
    </Dialog>
  );
}
