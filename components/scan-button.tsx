'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  applyScanPosition,
  clampScanPosition,
  SCAN_BOTTOM_VAR,
  SCAN_POSITION_STORAGE_KEY,
  SCAN_RIGHT_VAR,
  type ScanButtonPosition,
} from '@/lib/scan-button';

/** How long a press has to be held before the button comes loose. */
const LONG_PRESS_MS = 400;
/** Movement that cancels a pending long press — the finger meant something else. */
const PRESS_SLOP_PX = 10;

/*
 * Position and size are CSS, not React: both come from variables on <html>
 * that the init script writes before first paint. The clamp keeps the button on
 * screen whatever was stored — a position saved in landscape stays reachable
 * in portrait. The fallback inside each var() is the original corner.
 */
const POSITION_STYLE: React.CSSProperties = {
  width: 'var(--scan-fab-size)',
  height: 'var(--scan-fab-size)',
  right: `clamp(0.5rem, var(${SCAN_RIGHT_VAR}, max(1rem, calc(50% - 15rem))), calc(100% - var(--scan-fab-size) - 0.5rem))`,
  bottom: `clamp(0.5rem, var(${SCAN_BOTTOM_VAR}, calc(4.5rem + env(safe-area-inset-bottom))), calc(100% - var(--scan-fab-size) - 0.5rem))`,
  viewTransitionName: 'scan-button',
  // A long press on a link otherwise opens the iOS callout (preview, copy
  // link) underneath the finger that is trying to pick the button up.
  WebkitTouchCallout: 'none',
};

interface Gesture {
  pointerId: number;
  startX: number;
  startY: number;
  /** The button's offsets at pickup; the drag moves relative to these. */
  origin: ScanButtonPosition | null;
  size: number;
  timer: number | undefined;
  last: ScanButtonPosition | null;
}

/**
 * The floating "Adaugă bon" button. A tap opens the scan screen; holding it for
 * {@link LONG_PRESS_MS} picks it up, and it then follows the finger (or mouse)
 * anywhere on screen until released. Where it lands is remembered per device.
 *
 * The press has to be a long one, rather than any drag, because the button is
 * small and on every screen: a thumb brushing it on the way to a scroll should
 * neither move it nor open the camera.
 */
export function ScanButton({ href, label }: { href: string; label: string }) {
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<Gesture | null>(null);
  // Set when a press ended as a pickup, so the click that follows the
  // pointerup does not also navigate.
  const swallowClick = useRef(false);

  useEffect(() => () => window.clearTimeout(gesture.current?.timer), []);

  function pickUp(element: HTMLElement) {
    const g = gesture.current;
    if (!g) return;
    const rect = element.getBoundingClientRect();
    const root = document.documentElement;
    g.size = rect.width;
    g.origin = {
      right: root.clientWidth - rect.right,
      bottom: root.clientHeight - rect.bottom,
    };
    navigator.vibrate?.(12);
    swallowClick.current = true;
    setDragging(true);
  }

  function end() {
    const g = gesture.current;
    if (!g) return;
    window.clearTimeout(g.timer);
    gesture.current = null;
    if (g.last) {
      try {
        localStorage.setItem(SCAN_POSITION_STORAGE_KEY, JSON.stringify(g.last));
      } catch {
        // Not remembered, but it still moved for this visit.
      }
    }
    setDragging(false);
  }

  return (
    <Link
      href={href}
      aria-label={label}
      draggable={false}
      data-dragging={dragging || undefined}
      style={POSITION_STYLE}
      onPointerDown={(event) => {
        if (event.button !== 0 || gesture.current) return;
        swallowClick.current = false;
        const element = event.currentTarget;
        // Captured from the start, not at pickup: a mouse that leaves the
        // button before the long press fires must still report its release
        // here, or the gesture would be left dangling.
        element.setPointerCapture(event.pointerId);
        gesture.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          origin: null,
          size: 0,
          last: null,
          timer: window.setTimeout(() => pickUp(element), LONG_PRESS_MS),
        };
      }}
      onPointerMove={(event) => {
        const g = gesture.current;
        if (!g || event.pointerId !== g.pointerId) return;
        const dx = event.clientX - g.startX;
        const dy = event.clientY - g.startY;

        if (!g.origin) {
          if (Math.hypot(dx, dy) > PRESS_SLOP_PX) {
            window.clearTimeout(g.timer);
            gesture.current = null;
            // The pointer is captured, so releasing it anywhere would still
            // click the button. A finger that slid off meant something else.
            swallowClick.current = true;
          }
          return;
        }

        const root = document.documentElement;
        g.last = clampScanPosition(
          { right: g.origin.right - dx, bottom: g.origin.bottom - dy },
          { width: root.clientWidth, height: root.clientHeight },
          g.size,
        );
        // Straight onto the root variables, not through React state: this
        // runs on every pointer frame, and nothing else needs to re-render.
        applyScanPosition(g.last);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onClick={(event) => {
        if (swallowClick.current) {
          event.preventDefault();
          swallowClick.current = false;
        }
      }}
      // Android's long-press link menu, and the right-click menu on desktop.
      onContextMenu={(event) => event.preventDefault()}
      className={cn(
        'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50 shadow-primary/30 group/scan fixed z-50 flex touch-none items-center justify-center rounded-2xl shadow-lg select-none focus-visible:ring-3 focus-visible:outline-none',
        // Listed properties rather than `all`: `right` and `bottom` must not
        // ease, or the button trails behind the finger during a drag.
        'transition-[transform,box-shadow,background-color,width,height] duration-200',
        dragging
          ? 'scale-110 cursor-grabbing shadow-2xl'
          : 'hover:shadow-xl active:translate-y-px active:scale-90',
      )}
    >
      {/* A halo that only appears on hover or focus. Deliberately not a
          permanent pulse: this button is on every screen in the app, and
          something that moves forever in the corner of every screen stops
          being an invitation and becomes a distraction. */}
      <span
        aria-hidden
        className={cn(
          'bg-primary/25 absolute inset-0 -z-10 scale-100 rounded-2xl opacity-0 transition-all duration-300 group-hover/scan:scale-125 group-hover/scan:opacity-100 group-focus-visible/scan:scale-125 group-focus-visible/scan:opacity-100',
          dragging && 'scale-125 opacity-100',
        )}
      />
      <Camera
        className="transition-transform duration-300 group-hover/scan:scale-110"
        style={{ width: 'var(--scan-fab-icon)', height: 'var(--scan-fab-icon)' }}
      />
    </Link>
  );
}
