import type { Metadata } from 'next';
import Link from 'next/link';
import { FlaskConical } from 'lucide-react';
import { BottomNav } from '@/components/bottom-nav';

export const metadata: Metadata = {
  title: 'Demo — SnapBudget',
  description: 'O gospodărie cu doi membri și un an de cheltuieli, fără cont.',
};

/**
 * Everything under /demo is the signed-in app rendered from fixtures: the same
 * three tabs, the same components, the same aggregation. What changes is the
 * bar above and the nav below — one says the data is invented, the other keeps
 * every tap inside the demo instead of bouncing off the login redirect.
 */
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Slim on purpose. A demo has to admit what it is, but a banner deep
          enough to reshape the screen would stop it being a fair look at the
          app it is standing in for. */}
      <div className="bg-accent text-accent-foreground flex items-center justify-center gap-1.5 px-4 py-1.5 text-center text-[11px] font-medium">
        <FlaskConical className="h-3 w-3 flex-none" />
        <span>Demo cu date inventate —</span>
        <Link href="/login" className="underline underline-offset-2">
          intră cu contul tău
        </Link>
      </div>

      {children}
      <BottomNav variant="demo" />
    </>
  );
}
