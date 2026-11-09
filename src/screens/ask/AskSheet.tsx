import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { ReactNode, RefObject } from "react";
import { Button } from "../../ui/Button";

export interface AskSheetProps {
  open: boolean;
  title: string;
  /** Called for the explicit Close control and programmatic close. */
  onClose: () => void;
  /** When true, Escape and backdrop click do not call onClose. */
  dismissBlocked?: boolean;
  /** Optional stable id for aria-controls on the opener. */
  dialogId?: string;
  /** When set, focus returns here on close if the element is still connected. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function AskSheet({
  open,
  title,
  onClose,
  dismissBlocked = false,
  dialogId,
  returnFocusRef,
  children,
}: AskSheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const dismissBlockedRef = useRef(dismissBlocked);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    dismissBlockedRef.current = dismissBlocked;
  });

  useEffect(() => {
    if (!open) return;
    const previously = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = document.getElementById("root");
    const previousOverflow = document.body.style.overflow;
    if (root) root.inert = true;
    document.body.style.overflow = "hidden";
    const closeButton = panelRef.current?.querySelector<HTMLElement>("[data-ask-close]");
    (closeButton ?? panelRef.current)?.focus();

    function isTabStop(element: HTMLElement): boolean {
      if (element.hasAttribute("disabled") || element.tabIndex < 0) return false;
      if (element instanceof HTMLInputElement && element.type === "radio" && element.name) {
        const scope = element.closest("[role='dialog']") ?? element.ownerDocument;
        const group = [
          ...scope.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(element.name)}"]`),
        ];
        const chosen = group.find((radio) => radio.checked) ?? group[0];
        return element === chosen;
      }
      return true;
    }

    function focusable(): HTMLElement[] {
      const panel = panelRef.current;
      if (!panel) return [];
      return [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(isTabStop);
    }

    function requestDismiss() {
      if (dismissBlockedRef.current) return;
      onCloseRef.current();
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        requestDismiss();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      const items = focusable();
      if (!panel || items.length === 0) {
        event.preventDefault();
        panel?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || !panel.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (root) root.inert = false;
      document.body.style.overflow = previousOverflow;
      const opener = returnFocusRef?.current;
      if (opener?.isConnected) {
        opener.focus();
        return;
      }
      if (previously?.isConnected) previously.focus();
      else document.getElementById("content")?.focus();
    };
  }, [open, returnFocusRef]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-scrim"
      onClick={() => {
        if (dismissBlockedRef.current) return;
        onCloseRef.current();
      }}
    >
      <div
        ref={panelRef}
        id={dialogId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[85dvh] w-full max-w-[420px] overflow-y-auto rounded-t-2xl border-2 border-b-0 border-line bg-surface px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-display text-xl font-semibold leading-tight text-ink">
            {title}
          </h2>
          <Button type="button" variant="quiet" data-ask-close onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
