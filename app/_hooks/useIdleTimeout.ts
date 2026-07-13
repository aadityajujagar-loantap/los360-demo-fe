/**
 * useIdleTimeout
 * TC_022 — Verify session timeout handling
 *
 * Fires `onIdle` when the user has been inactive for `timeoutMs` milliseconds.
 * Activity events (mouse, keyboard, touch, scroll) reset the countdown.
 *
 * Usage:
 *   useIdleTimeout({ timeoutMs: 10 * 60 * 1000, onIdle: () => router.replace("/") });
 */
import { useEffect, useRef, useCallback } from "react";

interface UseIdleTimeoutOptions {
  /** Idle duration in milliseconds before `onIdle` fires. Default: 10 minutes */
  timeoutMs?: number;
  /** Callback to run when the session goes idle */
  onIdle: () => void;
  /** Set to false to disable the hook entirely (e.g. when not on the journey page) */
  enabled?: boolean;
}

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "visibilitychange",
];

export function useIdleTimeout({
  timeoutMs = 10 * 60 * 1000, // 10 minutes default
  onIdle,
  enabled = true,
}: UseIdleTimeoutOptions): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);

  // Keep the callback ref up-to-date without re-registering listeners
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const resetTimer = useCallback(() => {
    if (document.visibilityState === "hidden") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onIdleRef.current();
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    if (!enabled) return;

    // Start the timer immediately
    resetTimer();

    // Register all activity listeners
    ACTIVITY_EVENTS.forEach((event) => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [enabled, resetTimer]);
}
