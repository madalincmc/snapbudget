'use client';

import { useLayoutEffect, useRef } from 'react';

/**
 * Thousands separated by a thin space — "2 767.77" scans far faster than
 * "2767.77".
 */
function money(value: number, decimals: number): string {
  const [whole, fraction] = value.toFixed(decimals).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return fraction ? `${grouped}.${fraction}` : grouped;
}

/**
 * Counts a figure up to its value on mount.
 *
 * React renders the *final* text, and the count-up is done by writing
 * `textContent` from a layout effect — before the browser paints — rather than
 * by holding the running value in state. Two reasons: the server-rendered HTML
 * carries the real number, so there is no hydration mismatch and no flash of a
 * zero for anyone without JavaScript; and a figure that re-renders on every
 * animation frame would re-render whatever it is nested inside with it.
 *
 * Formatting is a `decimals` count rather than a formatter function on
 * purpose. Every caller is a server component, and a function prop cannot
 * cross that boundary — it fails at render, not at type-check.
 */
export function AnimatedNumber({
  value,
  decimals = 2,
  duration = 850,
  className,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!Number.isFinite(value) || value === 0) return;

    let frame = 0;
    const started = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - started) / duration, 1);
      // Ease-out cubic: most of the distance is covered early, so the number
      // settles rather than crawling the last few units.
      const eased = 1 - (1 - t) ** 3;
      node.textContent = money(value * eased, decimals);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    node.textContent = money(0, decimals);
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [value, decimals, duration]);

  return (
    <span ref={ref} className={className}>
      {money(value, decimals)}
    </span>
  );
}
