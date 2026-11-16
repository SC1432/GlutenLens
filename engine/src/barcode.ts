/**
 * Open Food Facts adapter. Pure transform plus a thin fetch helper; the engine
 * itself never touches the network.
 * API: https://world.openfoodfacts.org/api/v2/product/{barcode}.json
 */
import type { LabelInput, Region } from './types.ts';

export interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  lang?: string;
  ingredients_text?: string;
  [key: `ingredients_text_${string}`]: string | undefined;
  allergens_tags?: string[];
  traces_tags?: string[];
  labels_tags?: string[];
  states_tags?: string[];
  last_modified_t?: number;
}

export const OFF_FIELDS = [
  'code', 'product_name', 'brands', 'lang', 'ingredients_text', 'ingredients_text_en', 'ingredients_text_fr',
  'allergens_tags', 'traces_tags', 'labels_tags', 'states_tags', 'last_modified_t',
].join(',');

const GLUTEN_TAG = /^[a-z]{2}:gluten$/;

export interface BarcodeLookup {
  input: LabelInput;
  productName?: string;
  brand?: string;
}

/** Convert an Open Food Facts product into engine input. */
export function productToLabelInput(p: OffProduct, region: Region): BarcodeLookup {
  const lang = p.lang;
  const text =
    (lang && p[`ingredients_text_${lang}`]) || p.ingredients_text || p.ingredients_text_en || '';
  const states = p.states_tags ?? [];
  const ingredientsComplete = text.trim().length > 0 && !states.includes('en:ingredients-to-be-completed');
  const labels = p.labels_tags ?? [];
  return {
    productName: p.product_name,
    brand: p.brands,
    input: {
      text,
      region,
      language: lang,
      basis: 'database',
      databaseSignals: {
        allergenGluten: (p.allergens_tags ?? []).some((t) => GLUTEN_TAG.test(t)),
        tracesGluten: (p.traces_tags ?? []).some((t) => GLUTEN_TAG.test(t)),
        labelledGlutenFree: labels.some((t) => t === 'en:no-gluten' || t.includes('gluten-free')),
        ingredientsComplete,
        lastModified: p.last_modified_t,
      },
    },
  };
}

export type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Returns null when the product isn't in the database. */
export async function lookupBarcode(barcode: string, region: Region, fetchImpl: FetchLike = fetch as FetchLike): Promise<BarcodeLookup | null> {
  if (!/^\d{8,14}$/.test(barcode)) throw new Error(`Not a valid barcode: ${barcode}`);
  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${OFF_FIELDS}`;
  const res = await fetchImpl(url, { headers: { 'User-Agent': 'GlutenLens/0.1 (personal project)' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Food Facts error ${res.status}`);
  const body = (await res.json()) as { status?: number; product?: OffProduct };
  if (body.status !== 1 || !body.product) return null;
  return productToLabelInput(body.product, region);
}
