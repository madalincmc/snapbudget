import { categoryFromToken } from '@/lib/categories';

/**
 * Where to land after viewing or saving a receipt — the history view and the
 * per-category screen both carry their state in the query string, so it
 * survives the round-trip.
 *
 * `from` arrives from the URL, so it is untrusted: anything that is not a
 * single-slash-rooted path on one of the known routes falls back to the
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

  // Allowed by its token rather than by shape: "/categories/anything" would
  // otherwise pass the check and land the reader on a 404 after saving.
  const [, section, token, ...rest] = route.split('/');
  if (section === 'categories' && rest.length === 0 && categoryFromToken(token)) return path;

  return '/dashboard';
}
