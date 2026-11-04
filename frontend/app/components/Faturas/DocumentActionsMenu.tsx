"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

interface ActionMenuItem {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  pending?: boolean;
  pendingLabel?: string;
  tone?: string;
}

interface DocumentActionsMenuProps {
  label: string;
  items: ActionMenuItem[];
  colors: {
    border: string;
    primary: string;
    hover: string;
    text: string;
    textSecondary: string;
    card: string;
  };
}

interface MenuPosition {
  top: number;
  left: number;
}

export default function DocumentActionsMenu({ label, items, colors }: DocumentActionsMenuProps) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const positionMenu = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setPosition({ top: rect.bottom + 6, left: rect.right });
  };

  useLayoutEffect(() => {
    if (!open) return;
    positionMenu();

    const closeOnViewportChange = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !position || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(position.left - rect.width, window.innerWidth - rect.width - 8));
    const top = rect.bottom > window.innerHeight - 8
      ? Math.max(8, window.innerHeight - rect.height - 8)
      : position.top;
    if (left !== position.left - rect.width || top !== position.top) {
      setPosition({ left: left + rect.width, top });
    }
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
        style={{ borderColor: colors.border, color: colors.text, backgroundColor: colors.card }}
      >
        Ações <ChevronDown size={14} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>
      {open && position && typeof document !== "undefined" && createPortal(
        <>
          <button
            type="button"
            aria-label="Fechar menu de ações"
            tabIndex={-1}
            className="fixed inset-0 z-[100] border-0 bg-transparent p-0"
            onClick={() => setOpen(false)}
          />
          <div
            id={menuId}
            ref={menuRef}
            role="menu"
            aria-label={label}
            className="fixed z-[101] max-h-[min(70vh,28rem)] w-60 overflow-y-auto rounded-md border py-1 shadow-xl"
            style={{
              top: position.top,
              left: position.left,
              transform: "translateX(-100%)",
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            {items.map((item, index) => (
              <button
                key={`${item.label}-${index}`}
                type="button"
                role="menuitem"
                disabled={item.disabled || item.pending}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ color: item.tone ?? colors.text }}
              >
                <span className="shrink-0">{item.icon}</span>
                <span>{item.pending ? item.pendingLabel ?? item.label : item.label}</span>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
