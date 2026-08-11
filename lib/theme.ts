/**
 * Appearance is two independent choices.
 *
 * The *mode* is light or dark, and "system" is a preference rather than a
 * rendered state — the DOM only ever carries a resolved `light` or `dark`, so
 * CSS never has to express "follow the OS" and the `dark:` variant stays a
 * simple attribute match (see the custom variant in globals.css).
 *
 * The *palette* is the accent hue and the trace of chroma in the neutrals. It
 * is orthogonal to the mode: every palette is defined for both, so switching
 * from light to dark never silently changes which palette you are in.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'snapbudget:theme';
export const PALETTE_STORAGE_KEY = 'snapbudget:palette';

/** Cycling order for the mode control. System first, because it is the default. */
export const THEME_ORDER: ThemePreference[] = ['system', 'light', 'dark'];

export const THEME_LABEL: Record<ThemePreference, string> = {
  system: 'Automat',
  light: 'Luminos',
  dark: 'Întunecat',
};

export const THEME_HINT: Record<ThemePreference, string> = {
  system: 'Urmează setarea telefonului',
  light: 'Mereu luminos',
  dark: 'Mereu întunecat',
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function nextPreference(current: ThemePreference): ThemePreference {
  return THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
}

export type PaletteId = 'smarald' | 'ocean' | 'apus' | 'levantica';

export const DEFAULT_PALETTE: PaletteId = 'smarald';

export interface PaletteInfo {
  id: PaletteId;
  label: string;
  hint: string;
  /**
   * The two swatch colours shown in the picker. Literal OKLCH rather than
   * `var(--primary)`: the swatches have to show what each palette looks like
   * while a *different* palette is the active one, so they cannot read the
   * live tokens. Kept in step with globals.css by hand — there are four.
   */
  swatch: [string, string];
}

export const PALETTES: PaletteInfo[] = [
  {
    id: 'smarald',
    label: 'Smarald',
    hint: 'Crem & verde',
    swatch: ['oklch(0.575 0.116 162)', 'oklch(0.978 0.005 85)'],
  },
  {
    id: 'ocean',
    label: 'Ocean',
    hint: 'Gri & albastru',
    swatch: ['oklch(0.53 0.133 244)', 'oklch(0.978 0.008 250)'],
  },
  {
    id: 'apus',
    label: 'Apus',
    hint: 'Nisip & coral',
    swatch: ['oklch(0.6 0.155 30)', 'oklch(0.978 0.009 60)'],
  },
  {
    id: 'levantica',
    label: 'Levănțică',
    hint: 'Mov & violet',
    swatch: ['oklch(0.58 0.15 302)', 'oklch(0.978 0.007 305)'],
  },
];

export function isPaletteId(value: unknown): value is PaletteId {
  return PALETTES.some((p) => p.id === value);
}

/**
 * Runs as an inline script in <head>, before the browser paints, so the page
 * never appears in the wrong theme and then corrects itself. It writes three
 * attributes the rest of the app reads: the resolved mode that CSS matches on,
 * the raw preference that the mode control's icon is selected by, and the
 * palette. Having the preference in the DOM is what lets the appearance
 * controls render correctly on the server with no hydration mismatch.
 *
 * Kept as a string, and deliberately ES5-ish: it is injected verbatim and is
 * never processed by the bundler.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var k=${JSON.stringify(THEME_STORAGE_KEY)};
var pk=${JSON.stringify(PALETTE_STORAGE_KEY)};
var allowed=${JSON.stringify(PALETTES.map((p) => p.id))};
var p=localStorage.getItem(k);
if(p!=='light'&&p!=='dark'&&p!=='system'){p='system'}
var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
var pal=localStorage.getItem(pk);
if(allowed.indexOf(pal)===-1){pal=${JSON.stringify(DEFAULT_PALETTE)}}
var e=document.documentElement;
e.setAttribute('data-theme',d?'dark':'light');
e.setAttribute('data-theme-pref',p);
e.setAttribute('data-palette',pal);
}catch(err){}})()`;
