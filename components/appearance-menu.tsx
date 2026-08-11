'use client';

import { useEffect, useState } from 'react';
import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  DEFAULT_PALETTE,
  isPaletteId,
  isThemePreference,
  PALETTE_STORAGE_KEY,
  PALETTES,
  THEME_HINT,
  THEME_LABEL,
  THEME_ORDER,
  THEME_STORAGE_KEY,
  type PaletteId,
  type ThemePreference,
} from '@/lib/theme';

const MODE_ICON = { system: Monitor, light: Sun, dark: Moon } as const;

function currentPreference(): ThemePreference {
  const value = document.documentElement.getAttribute('data-theme-pref');
  return isThemePreference(value) ? value : 'system';
}

function currentPalette(): PaletteId {
  const value = document.documentElement.getAttribute('data-palette');
  return isPaletteId(value) ? value : DEFAULT_PALETTE;
}

function resolve(preference: ThemePreference): 'light' | 'dark' {
  const dark =
    preference === 'dark' ||
    (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return dark ? 'dark' : 'light';
}

/**
 * Arms the colour transition in globals.css for the length of the wash, then
 * disarms it. Leaving it armed would put a 350ms colour transition on every
 * element in the app, which turns every hover and focus state sluggish.
 */
function withWash(apply: () => void) {
  const root = document.documentElement;
  root.setAttribute('data-theme-shift', '');
  apply();
  window.setTimeout(() => root.removeAttribute('data-theme-shift'), 400);
}

/**
 * Mode and palette in one popover.
 *
 * Both live on the <html> element, written by the inline script before the
 * first paint; this component reads them from there rather than holding React
 * state for them, so the trigger is already correct in the server-rendered
 * HTML and there is nothing to reconcile on hydration. The one piece of real
 * state is a version counter, bumped after a write purely to re-render the
 * ticks inside the open popover.
 *
 * Reading the DOM during render is safe here only because the popup is
 * portalled and unmounted while closed: the server and the client both render
 * nothing for it, so the values below never reach the hydrated markup.
 */
export function AppearanceMenu() {
  const [, bump] = useState(0);

  useEffect(() => {
    // Following the system means following it while the page is open, not just
    // at load — phones flip at sunset.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (currentPreference() === 'system') {
        withWash(() => document.documentElement.setAttribute('data-theme', resolve('system')));
      }
    };

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  function setMode(preference: ThemePreference) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Private-mode storage failures should not stop the theme changing for
      // this session; it simply will not be remembered.
    }
    withWash(() => {
      const root = document.documentElement;
      root.setAttribute('data-theme', resolve(preference));
      root.setAttribute('data-theme-pref', preference);
    });
    bump((n) => n + 1);
  }

  function setPalette(palette: PaletteId) {
    try {
      localStorage.setItem(PALETTE_STORAGE_KEY, palette);
    } catch {
      // As above — the palette still changes, it just is not remembered.
    }
    withWash(() => document.documentElement.setAttribute('data-palette', palette));
    bump((n) => n + 1);
  }

  const activePreference = typeof document === 'undefined' ? 'system' : currentPreference();
  const activePalette = typeof document === 'undefined' ? DEFAULT_PALETTE : currentPalette();

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground/70 hover:text-foreground"
          >
            <Palette />
            <span className="sr-only">Aspect: temă și paletă de culori</span>
          </Button>
        }
      />

      <PopoverContent align="end" className="w-76 gap-3">
        <section className="flex flex-col gap-1.5">
          <h3 className="text-muted-foreground px-0.5 text-[11px] font-medium tracking-wide uppercase">
            Temă
          </h3>
          {/* A segmented control rather than a cycling button: three states behind
              one icon meant the second option always cost two taps and the label
              was the only thing that said where you were. */}
          <div className="bg-muted flex gap-1 rounded-full p-1">
            {THEME_ORDER.map((preference) => {
              const Icon = MODE_ICON[preference];
              const active = preference === activePreference;
              return (
                <button
                  key={preference}
                  type="button"
                  onClick={() => setMode(preference)}
                  aria-pressed={active}
                  title={THEME_HINT[preference]}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-medium transition-all duration-200',
                    active
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {THEME_LABEL[preference]}
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-1.5">
          <h3 className="text-muted-foreground px-0.5 text-[11px] font-medium tracking-wide uppercase">
            Paletă
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {PALETTES.map((palette, index) => {
              const active = palette.id === activePalette;
              return (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => setPalette(palette.id)}
                  aria-pressed={active}
                  style={{ '--sb-delay': `${index * 35}ms` } as React.CSSProperties}
                  className={cn(
                    'sb-pop sb-press hover:bg-muted/70 flex items-center gap-2 rounded-lg border p-2 text-left',
                    active ? 'border-ring bg-muted/50' : 'border-transparent',
                  )}
                >
                  {/* Half page-colour, half accent — the two things a palette
                      actually changes, shown rather than described. */}
                  <span
                    className="ring-foreground/15 relative flex h-7 w-7 flex-none items-center justify-center overflow-hidden rounded-full ring-1"
                    style={{ background: palette.swatch[1] }}
                    aria-hidden
                  >
                    <span
                      className="absolute inset-y-0 right-0 w-1/2"
                      style={{ background: palette.swatch[0] }}
                    />
                    {active && (
                      <Check className="relative h-4 w-4 stroke-[3] text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.55)]" />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-foreground truncate text-xs font-medium">
                      {palette.label}
                    </span>
                    <span className="text-muted-foreground truncate text-[10px]">
                      {palette.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </PopoverContent>
    </Popover>
  );
}
