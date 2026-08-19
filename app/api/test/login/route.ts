import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * E2E-only session seeding. Real sign-in goes through Google, which a test
 * runner can't click through without a real account and 2FA — so tests
 * instead get a magic-link token from Supabase's admin API (see
 * e2e/test-user.ts) and redeem it here via `verifyOtp`, the same primitive a
 * clicked email link would hit. That sets cookies through the app's own
 * `@/lib/supabase/server` client, so the resulting session is
 * indistinguishable from a real one to the rest of the app.
 *
 * 404s outside `next dev` so it never exists in a deployed build.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse(null, { status: 404 });
  }

  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  if (!tokenHash) {
    return new NextResponse('Missing token_hash', { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  if (error) {
    return new NextResponse(error.message, { status: 401 });
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
