'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Camera, House, History, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const APP_TABS = [
  { href: '/dashboard', label: 'Acasă', icon: House },
  { href: '/history', label: 'Istoric', icon: History },
  { href: '/household', label: 'Gospodărie', icon: Users },
];

// The same three screens under /demo. Spelled out rather than prefixed: the
// dashboard is `/demo` itself, so there is no prefix that produces all three.
const DEMO_TABS = [
  { href: '/demo', label: 'Acasă', icon: House },
  { href: '/demo/history', label: 'Istoric', icon: History },
  { href: '/demo/household', label: 'Gospodărie', icon: Users },
];

/**
 * Persistent navigation for the three main screens. Before this every page
 * carried its own ad-hoc "înapoi la dashboard" link, which meant there was no
 * way to reach History or Household except from the dashboard header.
 *
 * The scan action rides above the bar as a floating button: it is the app's
 * core promise, so it stays one tap from anywhere instead of occupying the top
 * of the dashboard ahead of the data.
 */
export function BottomNav({ variant = 'app' }: { variant?: 'app' | 'demo' }) {
  const pathname = usePathname();

  const demo = variant === 'demo';
  const TABS = demo ? DEMO_TABS : APP_TABS;

  // `/demo` is a prefix of every demo tab, so the plain startsWith test would
  // light up "Acasă" on all three. Only the deepest match counts.
  const activeIndex = TABS.reduce(
    (best, { href }, index) =>
      (pathname === href || pathname.startsWith(`${href}/`)) &&
      (best === -1 || href.length > TABS[best].href.length)
        ? index
        : best,
    -1,
  );

  return (
    <>
      <nav
        // Pinned across route transitions: the content crossfades under it, so
        // the reader keeps one part of the screen that does not move.
        style={{ viewTransitionName: 'bottom-nav' }}
        className="bg-background/70 border-border/70 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-xl"
      >
        <div className="relative mx-auto flex w-full max-w-lg items-stretch pb-[env(safe-area-inset-bottom)]">
          {/* One pill that slides between tabs rather than three that fade in
              and out. The movement is what says the tabs are one control. */}
          {activeIndex >= 0 && (
            <span
              aria-hidden
              className="bg-primary/12 pointer-events-none absolute top-2.5 h-7 w-12 rounded-full transition-[left] duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)]"
              style={{
                left: `calc(${(activeIndex + 0.5) * (100 / TABS.length)}% - 1.5rem)`,
              }}
            />
          )}

          {TABS.map(({ href, label, icon: Icon }, index) => {
            const active = index === activeIndex;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group/tab relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors duration-200',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200',
                    !active && 'group-hover/tab:bg-muted',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                      active ? 'scale-110 stroke-[2.3]' : 'group-active/tab:scale-90',
                    )}
                  />
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <Link
        // Scanning a receipt needs an account and an OCR call, so in the demo
        // the button leads to the one place that can give you both.
        href={demo ? '/login' : '/receipts/new'}
        aria-label={demo ? 'Adaugă bon — creează-ți cont' : 'Adaugă bon'}
        style={{ viewTransitionName: 'scan-button' }}
        className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50 shadow-primary/30 group/scan fixed right-[max(1rem,calc(50%-16rem+1rem))] bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl focus-visible:ring-3 focus-visible:outline-none active:translate-y-px active:scale-90"
      >
        {/* A halo that only appears on hover or focus. Deliberately not a
            permanent pulse: this button is on every screen in the app, and
            something that moves forever in the corner of every screen stops
            being an invitation and becomes a distraction. */}
        <span
          aria-hidden
          className="bg-primary/25 absolute inset-0 -z-10 scale-100 rounded-2xl opacity-0 transition-all duration-300 group-hover/scan:scale-125 group-hover/scan:opacity-100 group-focus-visible/scan:scale-125 group-focus-visible/scan:opacity-100"
        />
        <Camera className="h-6 w-6 transition-transform duration-300 group-hover/scan:scale-110" />
      </Link>
    </>
  );
}
