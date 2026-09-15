import { X } from "lucide-react";
import React, { useEffect, useId, useRef } from "react";
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

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  "details > summary",
].join(", ");

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
  // Keep a ref to the element that had focus before the dialog opened
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Focus trap & Escape key
  useEffect(() => {
    if (!isOpen) {
      // Restore focus to the element that was focused before the dialog opened
      previousFocusRef.current?.focus();
      return;
    }

    // Save current focus so we can restore it on close
    previousFocusRef.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      const el = contentRef.current;
      if (!el) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const focusable = Array.from(
          el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
        ).filter((node) => {
          // offsetParent is null for position:fixed elements (e.g. the close button
          // inside a dialog that is itself fixed). Use computed style instead.
          const style = getComputedStyle(node);
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0" &&
            !(node as HTMLInputElement).disabled
          );
        });

        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    // Move initial focus into the dialog after it renders
    const id = window.setTimeout(() => {
      const el = contentRef.current;
      if (!el) return;
      const firstFocusable = el.querySelector<HTMLElement>(FOCUSABLE_SELECTORS);
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        // Fallback: make the panel itself focusable
        el.setAttribute("tabindex", "-1");
        el.focus();
      }
    }, 16);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      window.clearTimeout(id);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnOutsideClick && e.target === overlayRef.current) {
      onClose();
    }
  };

  return createPortal(
    // The overlay is presentational only - role/aria live on the content div
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn"
    >
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        className="w-full max-w-md rounded-2xl bg-light-primary dark:bg-dark-primary border border-light-border dark:border-dark-border shadow-2xl overflow-hidden animate-scaleIn"
      >
        {(title || description) && (
          <div className="px-6 py-4 border-b border-light-border dark:border-dark-border flex justify-between items-start">
            <div>
              {title && (
                <h2 id={titleId} className="text-lg font-bold text-light-text dark:text-dark-text">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="text-sm text-light-text-muted dark:text-dark-text-muted mt-1">
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
          <div className="px-6 py-4 bg-light-surface/50 dark:bg-dark-surface/50 border-t border-light-border dark:border-dark-border">
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
