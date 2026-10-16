'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, History, Lightbulb, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScanButton } from '@/components/scan-button';

const APP_TABS = [
  { href: '/dashboard', label: 'Acasă', icon: House },
  { href: '/history', label: 'Istoric', icon: History },
  { href: '/household', label: 'Gospodărie', icon: Users },
  { href: '/advice', label: 'Sfaturi', icon: Lightbulb },
];

// The same screens under /demo, minus Sfaturi — it needs no account-specific
// data, so it isn't the kind of thing a demo exists to preview. Spelled out
// rather than prefixed: the dashboard is `/demo` itself, so there is no
// prefix that produces the rest.
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
 * of the dashboard ahead of the data. Its size and position are the user's to
 * choose (see components/scan-button.tsx).
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

      <ScanButton
        // Scanning a receipt needs an account and an OCR call, so in the demo
        // the button leads to the one place that can give you both.
        href={demo ? '/login' : '/receipts/new'}
        label={demo ? 'Adaugă bon — creează-ți cont' : 'Adaugă bon'}
      />
    </>
  );
}
