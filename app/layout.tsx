import type { Metadata } from 'next';
import { ViewTransition } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { DEFAULT_PALETTE, THEME_INIT_SCRIPT } from '@/lib/theme';
import { BackNavRefresh } from '@/components/back-nav-refresh';
import './globals.css';

export const metadata: Metadata = {
  title: 'SnapBudget',
  description: 'Fotografiază bonul, restul îl facem noi.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The server cannot know the stored preferences, so it renders the light
    // default in the default palette and the script below corrects both during
    // head parsing — before the first paint, and before React is involved at
    // all. All three attributes are rewritten by that script, hence
    // suppressHydrationWarning.
    <html
      lang="en"
      data-theme="light"
      data-theme-pref="system"
      data-palette={DEFAULT_PALETTE}
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      {/* sb-ambient paints the palette's two soft radial pools behind
          everything, fixed to the viewport (see globals.css). */}
      <body className="sb-ambient flex min-h-full flex-col">
        {/* Route changes crossfade and lift rather than cutting. Wrapping here
            rather than per page means every navigation in the app gets it,
            including the ones between the bottom-nav tabs. */}
        <ViewTransition>{children}</ViewTransition>
        <BackNavRefresh />
      </body>
    </html>
  );
}
