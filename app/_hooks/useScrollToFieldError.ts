"use client";

import { useEffect, useRef } from "react";

const ERROR_FIELD_SELECTOR = '[data-field-error="true"]';

const isVisible = (element: HTMLElement) =>
  element.getClientRects().length > 0 &&
  window.getComputedStyle(element).visibility !== "hidden";

const getFocusableField = (container: HTMLElement) =>
  container.querySelector<HTMLElement>(
    [
      "input:not([type='hidden']):not([disabled]):not([readonly])",
      "select:not([disabled])",
      "textarea:not([disabled]):not([readonly])",
      "button:not([disabled])",
    ].join(","),
  );

export function scrollToFirstFieldError() {
  if (typeof window === "undefined") return;

  window.setTimeout(() => {
    const firstErroredField = Array.from(
      document.querySelectorAll<HTMLElement>(ERROR_FIELD_SELECTOR),
    ).find(isVisible);

    if (!firstErroredField) return;

    firstErroredField.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
    getFocusableField(firstErroredField)?.focus({ preventScroll: true });
  }, 0);
}

export function useScrollToFieldError<T extends HTMLElement>(error?: unknown) {
  const fieldRef = useRef<T | null>(null);

  useEffect(() => {
    if (!error || typeof window === "undefined") return;

    const timeoutId = window.setTimeout(() => {
      const field = fieldRef.current;
      if (!field || !isVisible(field)) return;

      const firstErroredField = Array.from(
        document.querySelectorAll<HTMLElement>(ERROR_FIELD_SELECTOR),
      ).find(isVisible);

      if (firstErroredField !== field) return;

      field.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
      getFocusableField(field)?.focus({ preventScroll: true });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [error]);

  return fieldRef;
}
