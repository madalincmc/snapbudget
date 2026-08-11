import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
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
    // The server cannot know the stored preference, so it renders the light
    // default and the script below corrects it during head parsing — before
    // the first paint, and before React is involved at all. Both attributes
    // are rewritten by that script, hence suppressHydrationWarning.
    <html
      lang="en"
      data-theme="light"
      data-theme-pref="system"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
