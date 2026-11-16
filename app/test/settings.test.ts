import { describe, expect, it } from 'vitest';
import { assessLabel } from '@glutenlens/engine';
import {
  DEFAULT_APP_SETTINGS,
  STORAGE_KEY,
  engineSettings,
  loadSettings,
  parseSettings,
  saveSettings,
  type AppSettings,
} from '../src/settings.ts';

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

describe('settings', () => {
  it('defaults to the most cautious values', () => {
    expect(DEFAULT_APP_SETTINGS).toEqual({ region: 'OTHER', regionChosen: false, oats: 'avoid' });
    expect(loadSettings(memoryStorage())).toEqual(DEFAULT_APP_SETTINGS);
    expect(loadSettings(undefined)).toEqual(DEFAULT_APP_SETTINGS);
  });

  it('round-trips through storage', () => {
    const storage = memoryStorage();
    const s: AppSettings = { region: 'AU', regionChosen: true, oats: 'gluten_free_oats_ok' };
    expect(saveSettings(s, storage)).toBe(true);
    expect(loadSettings(storage)).toEqual(s);
  });

  it('falls back field by field to cautious defaults on bad data', () => {
    expect(parseSettings('not json')).toEqual(DEFAULT_APP_SETTINGS);
    expect(parseSettings('null')).toEqual(DEFAULT_APP_SETTINGS);
    expect(parseSettings('[]')).toEqual(DEFAULT_APP_SETTINGS);
    expect(parseSettings(JSON.stringify({ region: 'JP', regionChosen: true, oats: 'yes' }))).toEqual(
      DEFAULT_APP_SETTINGS,
    );
    expect(parseSettings(JSON.stringify({ region: 'UK', regionChosen: true, oats: 'nope' }))).toEqual({
      region: 'UK',
      regionChosen: true,
      oats: 'avoid',
    });
  });

  it('reports a failed save instead of throwing', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(saveSettings(DEFAULT_APP_SETTINGS, broken)).toBe(false);
    expect(loadSettings(broken)).toEqual(DEFAULT_APP_SETTINGS);
    expect(STORAGE_KEY).toMatch(/glutenlens/);
  });

  it('passes the oats setting through to the engine', () => {
    const text = 'Ingredients: rolled oats, sugar.';
    const avoid = assessLabel(
      { text, region: 'AU', language: 'en', extraction: { confidence: 'high', userConfirmed: true, ingredientsFound: true } },
      engineSettings({ ...DEFAULT_APP_SETTINGS, region: 'AU' }),
    );
    expect(avoid.verdict).toBe('contains_gluten');
  });
});
