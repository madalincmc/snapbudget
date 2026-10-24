import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LEGAL_VERSION } from '@/lib/legal';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Proof of which terms this account agreed to, and when. Only the
      // current version is recorded: a stale link carrying an older one says
      // nothing about what the reader saw. Best effort — a failed write must
      // not turn a good sign-in into an error page.
      if (searchParams.get('terms') === LEGAL_VERSION) {
        await supabase.auth
          .updateUser({
            data: { terms_version: LEGAL_VERSION, terms_accepted_at: new Date().toISOString() },
          })
          .catch(() => undefined);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Sign-ups are switched off in Supabase Auth while the app is closed to new
  // accounts. A Google account with no user behind it comes back here with
  // this code instead of `code`, and deserves a different answer from "try
  // again": trying again will never work.
  // Older Auth servers send only the description, so both are checked.
  if (
    searchParams.get('error_code') === 'signup_disabled' ||
    /signups not allowed/i.test(searchParams.get('error_description') ?? '')
  ) {
    return NextResponse.redirect(`${origin}/login?error=signup_closed`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
