/**
 * Where to land after viewing or saving a receipt — the history view carries
 * its filters in the query string so they survive the round-trip.
 *
 * `from` arrives from the URL, so it is untrusted: anything that is not a
 * single-slash-rooted path on one of the two known routes falls back to the
 * dashboard. That rejects absolute URLs and protocol-relative "//evil.com",
 * which would otherwise make this an open redirect.
 *
 * Lives here rather than beside the server action because a 'use server'
 * module may only export async functions.
 */
export function returnPathFor(from: string | undefined): string {
  if (!from) return '/dashboard';

  const path = from.startsWith('/') && !from.startsWith('//') ? from : `/${from}`;
  const route = path.split('?')[0];

  if (route === '/history') return path;
  if (route === '/dashboard') return path;
  return '/dashboard';
}
