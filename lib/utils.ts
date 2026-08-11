import type * as React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Offsets one of the `sb-*` entrance animations (see globals.css).
 *
 * Written as an inline custom property rather than as a Tailwind class:
 * `delay-[220ms]` would have to exist as a literal string for every value the
 * app uses, and the whole point of a stagger is that the value is derived from
 * position.
 */
export function delay(ms: number): React.CSSProperties {
  return { '--sb-delay': `${ms}ms` } as React.CSSProperties;
}
