"use client";

import { useEffect, useRef } from "react";
import { demoAdminUrl } from "@vesper-counsel/catalog";
import { useLocale } from "./demo-provider";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLocale();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    panel?.focus();

    function focusable(): HTMLElement[] {
      if (!panel) {
        return [];
      }
      return Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => !element.hasAttribute("disabled"),
      );
    }

    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        event.preventDefault();
        panel?.focus();
        return;
      }
      if (items.length === 1) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <div
        ref={panelRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-demo-title"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="about-demo-title">{t.about.title}</h2>
        <section>
          <h3>{t.about.storefrontsTitle}</h3>
          <p>{t.about.storefrontsBody}</p>
        </section>
        <section>
          <h3>{t.about.caseTitle}</h3>
          <p>{t.about.caseBody}</p>
        </section>
        <section>
          <h3>{t.about.architectureTitle}</h3>
          <p>{t.about.architectureBody}</p>
        </section>
        <section>
          <h3>{t.about.accessTitle}</h3>
          <p>{t.about.accessIntro}</p>
          <p>{t.about.vesperPath}</p>
          <p>{t.about.counselPath}</p>
          <p>{t.about.adminAccess}</p>
          <p>
            <a href={demoAdminUrl}>{t.admin}</a>
          </p>
        </section>
        <button type="button" onClick={onClose}>
          {t.close}
        </button>
      </div>
    </div>
  );
}
