/**
 * The floating scan button's two per-device preferences: how big it is, and
 * where on the screen it sits.
 *
 * Both are applied the same way the theme is — written onto <html> by the
 * inline init script before the first paint (see THEME_INIT_SCRIPT), then read
 * by CSS. The button itself renders identical markup on the server and the
 * client; the size arrives as a `data-scan-size` attribute that swaps a CSS
 * variable, and the position as two CSS variables on the root element. So
 * there is nothing for hydration to disagree about and nothing that jumps after
 * load.
 */
export type ScanButtonSize = 'small' | 'medium' | 'large';

export const SCAN_SIZE_STORAGE_KEY = 'snapbudget:scan-size';
export const SCAN_POSITION_STORAGE_KEY = 'snapbudget:scan-position';

export const DEFAULT_SCAN_SIZE: ScanButtonSize = 'medium';

export const SCAN_SIZE_ORDER: ScanButtonSize[] = ['small', 'medium', 'large'];

export const SCAN_SIZE_LABEL: Record<ScanButtonSize, string> = {
  small: 'Mic',
  medium: 'Mediu',
  large: 'Mare',
};

/** The CSS variables the button's `right` / `bottom` read. Unset = default corner. */
export const SCAN_RIGHT_VAR = '--scan-fab-right';
export const SCAN_BOTTOM_VAR = '--scan-fab-bottom';

/** Closest the button may sit to any viewport edge, in px. Mirrors the 0.5rem in the CSS clamp. */
export const SCAN_EDGE_MARGIN = 8;

export function isScanButtonSize(value: unknown): value is ScanButtonSize {
  return value === 'small' || value === 'medium' || value === 'large';
}

/**
 * Distance of the button from the viewport's right and bottom edges, in px.
 * Anchored to the bottom-right rather than the top-left because that is where
 * the default sits: on a narrower screen than the one it was placed on, a
 * button parked near the corner stays near the corner.
 */
export interface ScanButtonPosition {
  right: number;
  bottom: number;
}

export function parseScanPosition(raw: string | null): ScanButtonPosition | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === 'object' &&
      value !== null &&
      Number.isFinite((value as ScanButtonPosition).right) &&
      Number.isFinite((value as ScanButtonPosition).bottom)
    ) {
      return {
        right: (value as ScanButtonPosition).right,
        bottom: (value as ScanButtonPosition).bottom,
      };
    }
  } catch {
    // Corrupt storage falls back to the default corner.
  }
  return null;
}

/**
 * Keeps the button wholly on screen. The CSS clamps as well — that is what
 * catches a rotation or a resize after the fact — but the drag clamps too, so
 * the stored value never drifts past what can actually be displayed and a
 * later drag does not start with a dead zone.
 */
export function clampScanPosition(
  position: ScanButtonPosition,
  viewport: { width: number; height: number },
  size: number,
): ScanButtonPosition {
  const clamp = (value: number, max: number) =>
    Math.round(Math.min(Math.max(value, SCAN_EDGE_MARGIN), Math.max(SCAN_EDGE_MARGIN, max)));
  return {
    right: clamp(position.right, viewport.width - size - SCAN_EDGE_MARGIN),
    bottom: clamp(position.bottom, viewport.height - size - SCAN_EDGE_MARGIN),
  };
}

/** Root-level writes, shared by the drag (live) and the appearance menu (reset). */
export function applyScanPosition(position: ScanButtonPosition | null) {
  const style = document.documentElement.style;
  if (position) {
    style.setProperty(SCAN_RIGHT_VAR, `${position.right}px`);
    style.setProperty(SCAN_BOTTOM_VAR, `${position.bottom}px`);
  } else {
    style.removeProperty(SCAN_RIGHT_VAR);
    style.removeProperty(SCAN_BOTTOM_VAR);
  }
}

export function hasCustomScanPosition(): boolean {
  return document.documentElement.style.getPropertyValue(SCAN_RIGHT_VAR) !== '';
}

/**
 * The scan-button half of the pre-paint init script. A fragment, not a whole
 * script: it is spliced into THEME_INIT_SCRIPT's try block so the page carries
 * one inline script, not two. ES5-ish for the same reason as that script.
 */
export const SCAN_BUTTON_INIT_FRAGMENT = `
var sk=${JSON.stringify(SCAN_SIZE_STORAGE_KEY)};
var ss=localStorage.getItem(sk);
if(ss!=='small'&&ss!=='medium'&&ss!=='large'){ss=${JSON.stringify(DEFAULT_SCAN_SIZE)}}
document.documentElement.setAttribute('data-scan-size',ss);
try{var sp=JSON.parse(localStorage.getItem(${JSON.stringify(SCAN_POSITION_STORAGE_KEY)}));
if(sp&&typeof sp.right==='number'&&typeof sp.bottom==='number'&&isFinite(sp.right)&&isFinite(sp.bottom)){
document.documentElement.style.setProperty(${JSON.stringify(SCAN_RIGHT_VAR)},sp.right+'px');
document.documentElement.style.setProperty(${JSON.stringify(SCAN_BOTTOM_VAR)},sp.bottom+'px');
}}catch(err){}`;
