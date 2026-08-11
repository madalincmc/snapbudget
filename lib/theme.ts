/**
 * What the user picked. "system" is a preference, never a rendered state — the
 * DOM only ever carries a resolved `light` or `dark`, so CSS never has to
 * express "follow the OS" and the `dark:` variant stays a simple attribute
 * match (see the custom variant in globals.css).
 */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'snapbudget:theme';

/** Cycling order for the toggle. System first, because it is the default. */
export const THEME_ORDER: ThemePreference[] = ['system', 'light', 'dark'];

export const THEME_LABEL: Record<ThemePreference, string> = {
  system: 'Temă: automat (după sistem)',
  light: 'Temă: luminoasă',
  dark: 'Temă: întunecată',
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function nextPreference(current: ThemePreference): ThemePreference {
  return THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
}

/**
 * Runs as an inline script in <head>, before the browser paints, so the page
 * never appears in the wrong theme and then corrects itself. It writes both
 * attributes the rest of the app reads: the resolved theme that CSS matches on,
 * and the raw preference that the toggle's icon is selected by — which lets the
 * button render correctly on the server with no hydration mismatch.
 *
 * Kept as a string, and deliberately ES5-ish: it is injected verbatim and is
 * never processed by the bundler.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var k=${JSON.stringify(THEME_STORAGE_KEY)};
var p=localStorage.getItem(k);
if(p!=='light'&&p!=='dark'&&p!=='system'){p='system'}
var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
var e=document.documentElement;
e.setAttribute('data-theme',d?'dark':'light');
e.setAttribute('data-theme-pref',p);
}catch(err){}})()`;
