// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCountUp } from "@/hooks/use-count-up";

describe("useCountUp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock matchMedia for reduced motion
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial target as a string", () => {
    const { result } = renderHook(() => useCountUp(42));
    expect(result.current).toBe("42");
  });

  it("respects decimal places", () => {
    const { result } = renderHook(() => useCountUp(3.14159, { decimals: 2 }));
    expect(result.current).toBe("3.14");
  });

  it("does not animate when disabled", () => {
    const { result, rerender } = renderHook(
      ({ target, enabled }) => useCountUp(target, { enabled }),
      { initialProps: { target: 0, enabled: false } },
    );
    expect(result.current).toBe("0");

    rerender({ target: 100, enabled: false });
    expect(result.current).toBe("0");
  });

  it("animates to new target value", async () => {
    const { result, rerender } = renderHook(
      ({ target }) => useCountUp(target, { duration: 100 }),
      { initialProps: { target: 0 } },
    );

    rerender({ target: 100 });

    // After full duration + buffer, value should reach target
    await act(async () => {
      vi.advanceTimersByTime(200);
      // Flush all rAF callbacks
      await vi.runAllTimersAsync();
    });

    expect(Number(result.current)).toBe(100);
  });

  it("skips animation with prefers-reduced-motion", async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result, rerender } = renderHook(
      ({ target }) => useCountUp(target),
      { initialProps: { target: 0 } },
    );

    rerender({ target: 50 });

    await act(async () => {
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
    });

    // Should jump to target without animation
    expect(Number(result.current)).toBe(50);
  });
});
