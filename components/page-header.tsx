import type * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * The header every screen except the dashboard wears.
 *
 * Each page used to spell out its own: a left-aligned <h1> and, on some of
 * them, a text link back to the dashboard on the right. That put the escape
 * hatch in the far corner, at a different distance from the thumb on every
 * screen, and let the title sizes drift apart. Here the back control is always
 * the first thing in the row, at a fixed size, and `actions` is the one slot a
 * page can add to.
 */
export function PageHeader({
  title,
  description,
  backHref = '/dashboard',
  backLabel = 'Înapoi',
  actions,
}: {
  title: string;
  description?: string;
  /** Null hides the control entirely — for a screen reached only from the nav. */
  backHref?: string | null;
  backLabel?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="sb-fade flex items-start gap-2">
      {backHref && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground mt-0.5 -ml-1 flex-none"
          nativeButton={false}
          render={<Link href={backHref} />}
        >
          <ArrowLeft />
          <span className="sr-only">{backLabel}</span>
        </Button>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="text-foreground truncate text-lg leading-tight font-semibold tracking-tight">
          {title}
        </h1>
        {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
      </div>

      {actions && <div className="flex flex-none items-center gap-1">{actions}</div>}
    </header>
  );
}
