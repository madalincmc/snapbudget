'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GoogleSignInButton } from '@/components/google-sign-in-button';

/**
 * The sign-in button behind an unticked box. Signing in with Google creates the
 * account on first use, so this is the one moment a new account can agree to
 * the terms — a line of small print under the button would not show that they
 * did.
 */
export function LoginConsent({ next }: { next: string }) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <label className="text-muted-foreground flex cursor-pointer items-start gap-2.5 text-xs leading-snug">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="accent-primary mt-0.5 h-4 w-4 flex-none cursor-pointer"
        />
        <span>
          Am citit și accept{' '}
          <Link href="/termeni" className="text-foreground underline underline-offset-2">
            Termenii de utilizare
          </Link>{' '}
          și{' '}
          <Link href="/confidentialitate" className="text-foreground underline underline-offset-2">
            Politica de confidențialitate
          </Link>
          .
        </span>
      </label>
      <GoogleSignInButton next={next} disabled={!accepted} />
    </div>
  );
}
