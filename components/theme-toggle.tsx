'use client';

import { useEffect } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  isThemePreference,
  nextPreference,
  THEME_LABEL,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from '@/lib/theme';

function currentPreference(): ThemePreference {
  const value = document.documentElement.getAttribute('data-theme-pref');
  return isThemePreference(value) ? value : 'system';
}

function apply(preference: ThemePreference) {
  const dark =
    preference === 'dark' ||
    (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const root = document.documentElement;
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  root.setAttribute('data-theme-pref', preference);
}

/**
 * Cycles automatic → light → dark. Automatic stays in the cycle because it was
 * the app's only behaviour before this existed; dropping it would take
 * something away from anyone whose phone already switches at dusk.
 *
 * Deliberately holds no React state. The current preference lives on the
 * <html> element, written by the inline script before the first paint, and
 * both the icon and the click handler read it from there — so the button is
 * already correct in the server-rendered HTML and there is nothing to
 * reconcile on hydration.
 */
export function ThemeToggle() {
  useEffect(() => {
    // Following the system means following it while the page is open, not just
    // at load — phones flip at sunset.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (currentPreference() === 'system') apply('system');
    };

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  function handleClick() {
    const next = nextPreference(currentPreference());
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private-mode storage failures should not stop the theme changing for
      // this session; it simply will not be remembered.
    }
    apply(next);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className="text-muted-foreground/70 hover:text-foreground"
    >
      {/* One branch per preference, selected by CSS from the attribute rather
          than by JavaScript. The class strings are spelled out because
          Tailwind scans source text and would never generate an interpolated
          variant. */}
      <span className="hidden [html[data-theme-pref=system]_&]:contents">
        <Monitor />
        <span className="sr-only">{THEME_LABEL.system}. Apasă pentru temă luminoasă.</span>
      </span>
      <span className="hidden [html[data-theme-pref=light]_&]:contents">
        <Sun />
        <span className="sr-only">{THEME_LABEL.light}. Apasă pentru temă întunecată.</span>
      </span>
      <span className="hidden [html[data-theme-pref=dark]_&]:contents">
        <Moon />
        <span className="sr-only">{THEME_LABEL.dark}. Apasă pentru temă automată.</span>
      </span>
    </Button>
  );
}
