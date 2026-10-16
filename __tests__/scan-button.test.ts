import { describe, expect, it } from 'vitest';
import {
  clampScanPosition,
  isScanButtonSize,
  parseScanPosition,
  SCAN_BUTTON_INIT_FRAGMENT,
  SCAN_EDGE_MARGIN,
} from '@/lib/scan-button';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

const phone = { width: 390, height: 844 };

describe('parseScanPosition', () => {
  it('reads a stored position', () => {
    expect(parseScanPosition('{"right":20,"bottom":300}')).toEqual({ right: 20, bottom: 300 });
  });

  it('falls back to the default corner for missing or corrupt storage', () => {
    expect(parseScanPosition(null)).toBeNull();
    expect(parseScanPosition('not json')).toBeNull();
    expect(parseScanPosition('{"right":"20","bottom":300}')).toBeNull();
    expect(parseScanPosition('{"right":null,"bottom":300}')).toBeNull();
    expect(parseScanPosition('null')).toBeNull();
  });
});

describe('clampScanPosition', () => {
  it('leaves an on-screen position alone', () => {
    expect(clampScanPosition({ right: 100, bottom: 400 }, phone, 56)).toEqual({
      right: 100,
      bottom: 400,
    });
  });

  it('keeps the whole button inside the viewport', () => {
    expect(clampScanPosition({ right: -50, bottom: -50 }, phone, 56)).toEqual({
      right: SCAN_EDGE_MARGIN,
      bottom: SCAN_EDGE_MARGIN,
    });
    expect(clampScanPosition({ right: 5000, bottom: 5000 }, phone, 56)).toEqual({
      right: phone.width - 56 - SCAN_EDGE_MARGIN,
      bottom: phone.height - 56 - SCAN_EDGE_MARGIN,
    });
  });

  it('rounds to whole pixels', () => {
    expect(clampScanPosition({ right: 10.6, bottom: 20.2 }, phone, 56)).toEqual({
      right: 11,
      bottom: 20,
    });
  });
});

describe('isScanButtonSize', () => {
  it('accepts exactly the three sizes', () => {
    expect(['small', 'medium', 'large'].every(isScanButtonSize)).toBe(true);
    expect(isScanButtonSize('huge')).toBe(false);
    expect(isScanButtonSize(null)).toBe(false);
  });
});

describe('init script', () => {
  it('carries the scan-button fragment and still parses', () => {
    expect(THEME_INIT_SCRIPT).toContain(SCAN_BUTTON_INIT_FRAGMENT);
    expect(() => new Function(THEME_INIT_SCRIPT)).not.toThrow();
  });
});
