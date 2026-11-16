import { DEFAULT_SETTINGS, type Region, type Settings as EngineSettings } from '@glutenlens/engine';

/** Settings stored on the device. `oats` is passed straight to the engine. */
export interface AppSettings extends EngineSettings {
  /** Default label jurisdiction, normally where the user shops. */
  region: Region;
  /** False until the user has chosen a region themselves. */
  regionChosen: boolean;
}

export const STORAGE_KEY = 'glutenlens.settings.v1';

export const REGIONS: { value: Region; label: string; note: string }[] = [
  { value: 'AU', label: 'Australia', note: 'Gluten-free means no detectable gluten and no oats.' },
  { value: 'NZ', label: 'New Zealand', note: 'Gluten-free means no detectable gluten and no oats.' },
  { value: 'CA', label: 'Canada', note: 'Gluten-free means under ~20 ppm; gluten-free oats allowed.' },
  { value: 'US', label: 'United States', note: 'Only wheat must be declared, so barley and rye can hide in “flavor”.' },
  { value: 'EU', label: 'European Union', note: 'Gluten-free means under 20 ppm; gluten-free oats allowed.' },
  { value: 'UK', label: 'United Kingdom', note: 'Gluten-free means under 20 ppm; gluten-free oats allowed.' },
  { value: 'OTHER', label: 'Other / not sure', note: 'Most cautious: rules are unknown, so more labels come back “Can’t verify”.' },
];

export const OATS_OPTIONS: { value: EngineSettings['oats']; label: string; note: string }[] = [
  {
    value: 'avoid',
    label: 'Avoid all oats',
    note: 'Any oats count as gluten. Australian practice, and the safest choice.',
  },
  {
    value: 'gluten_free_oats_ok',
    label: 'Gluten-free oats are OK',
    note: 'Oats labelled gluten-free are allowed. Other oats still come back “Can’t verify” unless the product has a gluten-free claim in CA, US, EU or UK.',
  },
];

/**
 * Default region is OTHER, the most conservative jurisdiction, until the
 * user picks one (SPEC §5.4). Oats default to `avoid` (SPEC §5.3).
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  ...DEFAULT_SETTINGS,
  region: 'OTHER',
  regionChosen: false,
};

const REGION_VALUES = new Set<string>(REGIONS.map((r) => r.value));
const OATS_VALUES = new Set<string>(OATS_OPTIONS.map((o) => o.value));

/**
 * Parse stored settings. Anything missing or unrecognised falls back to the
 * cautious default for that field, never to a more permissive value.
 */
export function parseSettings(raw: string | null): AppSettings {
  if (!raw) return { ...DEFAULT_APP_SETTINGS };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
  if (typeof data !== 'object' || data === null) return { ...DEFAULT_APP_SETTINGS };
  const d = data as Record<string, unknown>;
  const regionValid = typeof d.region === 'string' && REGION_VALUES.has(d.region);
  return {
    region: regionValid ? (d.region as Region) : DEFAULT_APP_SETTINGS.region,
    regionChosen: regionValid && d.regionChosen === true,
    oats:
      typeof d.oats === 'string' && OATS_VALUES.has(d.oats)
        ? (d.oats as EngineSettings['oats'])
        : DEFAULT_APP_SETTINGS.oats,
  };
}

type KV = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): KV | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined; // e.g. storage blocked
  }
}

export function loadSettings(storage: KV | undefined = defaultStorage()): AppSettings {
  try {
    return parseSettings(storage?.getItem(STORAGE_KEY) ?? null);
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

/** Returns false if the settings could not be stored (private mode, quota). */
export function saveSettings(settings: AppSettings, storage: KV | undefined = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

/** The subset the engine takes as its `settings` argument. */
export function engineSettings(s: AppSettings): EngineSettings {
  return { oats: s.oats };
}

export function regionLabel(region: Region): string {
  return REGIONS.find((r) => r.value === region)?.label ?? region;
}
