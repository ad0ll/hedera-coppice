import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Animates a number from its previous value to `target` using easeOutQuart.
 * Returns the current display value as a formatted string.
 * Respects prefers-reduced-motion.
 */
export function useCountUp(
  target: number,
  opts: { duration?: number; decimals?: number; enabled?: boolean } = {},
): string {
  const { duration = 600, decimals = 0, enabled = true } = opts;
  const [display, setDisplay] = useState(target);
  const prevTarget = useRef(target);
  const rafRef = useRef<number | null>(null);

  const animate = useCallback((from: number, to: number) => {
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuart
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = from + (to - from) * eased;
      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [duration]);

  useEffect(() => {
    if (!enabled || prevTarget.current === target) {
      prevTarget.current = target;
      return;
    }

    // Respect reduced motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      prevTarget.current = target;
      // Use rAF callback to avoid synchronous setState in effect
      rafRef.current = requestAnimationFrame(() => setDisplay(target));
      return;
    }

    const from = prevTarget.current;
    prevTarget.current = target;
    animate(from, target);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, enabled, animate]);

  return display.toFixed(decimals);
}
