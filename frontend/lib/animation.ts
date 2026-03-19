import type { CSSProperties } from "react";

/**
 * Returns className and style props for the staggered entrance animation.
 * Eliminates verbose `as React.CSSProperties` casts at every call site.
 *
 * Usage:
 *   <div {...entranceProps(2)}>
 *   <h1 {...entranceProps(0, "page-title")}>
 */
/** Max stagger index — items beyond this appear without extra delay */
const MAX_STAGGER = 8;

export function entranceProps(index: number, className?: string): {
  className: string;
  style: CSSProperties;
} {
  return {
    className: className ? `${className} animate-entrance` : "animate-entrance",
    style: { "--index": Math.min(index, MAX_STAGGER) } as CSSProperties,
  };
}
