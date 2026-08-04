'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Camera, House, History, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/dashboard', label: 'Acasă', icon: House },
  { href: '/history', label: 'Istoric', icon: History },
  { href: '/household', label: 'Gospodărie', icon: Users },
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
export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="bg-background/85 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-lg items-stretch pb-[env(safe-area-inset-bottom)]">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'stroke-[2.4]')} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <Link
        href="/receipts/new"
        aria-label="Adaugă bon"
        className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50 fixed right-[max(1rem,calc(50%-16rem+1rem))] bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors focus-visible:ring-3 focus-visible:outline-none active:translate-y-px"
      >
        <Camera className="h-6 w-6" />
      </Link>
    </>
  );
}

/** Bottom padding so page content is never hidden behind the fixed nav. */
export const BOTTOM_NAV_SPACER = 'pb-[calc(5.5rem+env(safe-area-inset-bottom))]';
