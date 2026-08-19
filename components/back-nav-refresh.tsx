'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The Router Cache restores a page from its last-seen snapshot on browser
 * back/forward, regardless of staleTime — by design, so history nav feels
 * instant. That's what let the dashboard show pre-add totals after adding a
 * receipt and pressing Back (MAD-82): the snapshot was taken before the add.
 * A popstate listener forces a fresh fetch right after such a navigation
 * lands, without affecting normal forward navigation.
 *
 * Mounted once in the root layout rather than on the dashboard page itself:
 * a page-scoped listener unmounts/remounts on every navigation, racing
 * Next's own popstate handling — the old listener can be torn down and the
 * new one registered too late to catch the very event that triggered the
 * remount, so it silently never fires. A listener that lives for the whole
 * app session doesn't have that race.
 */
export function BackNavRefresh() {
  const router = useRouter();

  useEffect(() => {
    const onPopState = () => router.refresh();
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [router]);

  return null;
}
