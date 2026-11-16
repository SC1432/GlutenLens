/** Open Food Facts adapter. Product records below are synthetic, in the API's shape. */
import { describe, expect, it } from 'vitest';
import { assessLabel, lookupBarcode, productToLabelInput, type OffProduct } from '../src/index.ts';

const now = Math.floor(Date.now() / 1000);
const base: OffProduct = {
  code: '9300000000001',
  product_name: 'Test crackers',
  lang: 'en',
  ingredients_text_en: 'Rice (93%), sunflower oil, salt.',
  allergens_tags: [],
  traces_tags: [],
  labels_tags: [],
  states_tags: ['en:ingredients-completed'],
  last_modified_t: now - 86400 * 30,
};

const assess = (p: OffProduct, region: 'AU' | 'US' = 'AU') => assessLabel(productToLabelInput(p, region).input);

describe('Open Food Facts', () => {
  it('positive verdicts are marked as database-based and ask for a label photo', () => {
    const r = assess(base);
    expect(r.verdict).toBe('no_gluten_ingredients');
    expect(r.basis).toBe('database');
    expect(r.needsLabelPhoto).toBe(true);
    expect(r.caveats.some((c) => /database/.test(c))).toBe(true);
  });

  it('gluten-free label tag is treated as a claim', () => {
    expect(assess({ ...base, labels_tags: ['en:no-gluten'] }).verdict).toBe('gluten_free_claim');
    expect(assess({ ...base, labels_tags: ['en:certified-gluten-free'] }).verdict).toBe('gluten_free_claim');
  });

  it('allergen tag wins even if ingredient text looks clean', () => {
    expect(assess({ ...base, allergens_tags: ['en:gluten'] }).verdict).toBe('contains_gluten');
  });

  it('traces tag gives may_contain', () => {
    expect(assess({ ...base, traces_tags: ['en:gluten', 'en:nuts'] }).verdict).toBe('may_contain');
  });

  it('incomplete ingredients cannot be verified', () => {
    expect(assess({ ...base, states_tags: ['en:ingredients-to-be-completed'] }).verdict).toBe('cannot_verify');
    expect(assess({ ...base, ingredients_text_en: '', ingredients_text: '' }).verdict).toBe('cannot_verify');
  });

  it('entries older than three years cannot be verified', () => {
    expect(assess({ ...base, last_modified_t: now - 86400 * 365 * 4 }).verdict).toBe('cannot_verify');
  });

  it('uses the product language text first', () => {
    const p: OffProduct = { ...base, lang: 'fr', ingredients_text_fr: 'Farine de blé, sucre.', ingredients_text_en: 'Rice.' };
    expect(assess(p).verdict).toBe('contains_gluten');
  });

  it('lookupBarcode handles found, missing and invalid codes', async () => {
    const fake = async (url: string) => ({
      ok: true, status: 200,
      json: async () => (url.includes('9300000000001') ? { status: 1, product: base } : { status: 0 }),
    });
    expect((await lookupBarcode('9300000000001', 'AU', fake))?.productName).toBe('Test crackers');
    expect(await lookupBarcode('9300000000002', 'AU', fake)).toBeNull();
    await expect(lookupBarcode('abc', 'AU', fake)).rejects.toThrow();
  });
});
