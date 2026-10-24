import type * as React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { CONTACT_EMAIL, LEGAL_UPDATED_LABEL } from '@/lib/legal';

/**
 * The frame both legal documents share. They are read by people who are not
 * signed in, so there is no bottom nav and the back control goes to `/`, which
 * sends each reader on to wherever their session says they belong.
 */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 justify-center px-4 pt-5 pb-10">
      <div className="flex w-full max-w-lg flex-col gap-5">
        <PageHeader
          title={title}
          description={`Ultima actualizare: ${LEGAL_UPDATED_LABEL}`}
          backHref="/"
        />
        <Card className="sb-rise">
          <CardContent className="text-muted-foreground flex flex-col gap-6 text-sm leading-relaxed">
            {children}
          </CardContent>
        </Card>
        <LegalLinks />
      </div>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-foreground text-base font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1.5 pl-5">{children}</ul>;
}

export function ContactLink() {
  return (
    <a
      href={`mailto:${CONTACT_EMAIL}`}
      className="text-foreground font-medium underline underline-offset-2"
    >
      {CONTACT_EMAIL}
    </a>
  );
}

/** The small pair of links under the login card and at the foot of each document. */
export function LegalLinks() {
  return (
    <nav className="text-muted-foreground flex justify-center gap-4 text-xs">
      <Link href="/termeni" className="hover:text-foreground transition-colors">
        Termeni de utilizare
      </Link>
      <Link href="/confidentialitate" className="hover:text-foreground transition-colors">
        Confidențialitate
      </Link>
    </nav>
  );
}
