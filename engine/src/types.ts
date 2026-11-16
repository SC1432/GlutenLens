/** Jurisdiction whose labelling rules apply to a label. */
export type Region = 'AU' | 'NZ' | 'CA' | 'US' | 'EU' | 'UK' | 'OTHER';

export const SUPPORTED_LANGUAGES = [
  'en', 'fr', 'es', 'it', 'de', 'nl', 'pt', 'id', 'vi', 'ja', 'zh', 'ko', 'th',
] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export interface Settings {
  /** 'avoid' treats every oat ingredient as gluten. */
  oats: 'avoid' | 'gluten_free_oats_ok';
}

export const DEFAULT_SETTINGS: Settings = { oats: 'avoid' };

// ---------------------------------------------------------------- label

export type LabelVerdict =
  | 'contains_gluten'
  | 'may_contain'
  | 'cannot_verify'
  | 'no_gluten_ingredients'
  | 'gluten_free_claim';

/** Severity order, most severe first. */
export const LABEL_VERDICT_ORDER: LabelVerdict[] = [
  'contains_gluten',
  'may_contain',
  'cannot_verify',
  'no_gluten_ingredients',
  'gluten_free_claim',
];

export const POSITIVE_VERDICTS: ReadonlySet<LabelVerdict> = new Set([
  'no_gluten_ingredients',
  'gluten_free_claim',
]);

export interface ExtractionMeta {
  /** Vision model's self-reported transcription confidence. */
  confidence: 'high' | 'medium' | 'low';
  /** The user reviewed and confirmed the extracted text. */
  userConfirmed: boolean;
  /** An ingredient list was present in the photo / record. */
  ingredientsFound: boolean;
}

export interface LabelInput {
  /** Ingredients, allergen statements and claims as transcribed from the label. */
  text: string;
  region: Region;
  /** ISO 639-1 language the extractor believes the label is in. */
  language?: string;
  /** Vision model saw a gluten-free certification mark (crossed grain, GFCO, etc.). */
  certificationMark?: boolean;
  extraction?: ExtractionMeta;
  basis?: 'label' | 'database';
  /** Structured signals from a database (Open Food Facts tags). */
  databaseSignals?: DatabaseSignals;
}

export interface DatabaseSignals {
  allergenGluten: boolean;
  tracesGluten: boolean;
  labelledGlutenFree: boolean;
  /** Ingredients marked complete by the database. */
  ingredientsComplete: boolean;
  /** Epoch seconds of last edit. */
  lastModified?: number;
}

export type TermCategory = 'gluten' | 'oats' | 'likely_gluten' | 'ambiguous' | 'exempt';
export type StatementType = 'ingredients' | 'contains' | 'may_contain' | 'free_from';

export interface Finding {
  /** Text as it appears on the label. */
  excerpt: string;
  /** Canonical English name, e.g. "wheat". */
  canonical: string;
  category: TermCategory;
  statement: StatementType;
  /** Gluten-free phrase attached to this ingredient, e.g. "gluten-free oats". */
  qualified: boolean;
  language: string;
  /** Offsets into the original input text. */
  start: number;
  end: number;
  /** What this finding contributed to the verdict. */
  effect: LabelVerdict | 'none';
  note?: string;
}

export interface Claim {
  kind: 'text' | 'certification_mark' | 'free_from' | 'database';
  excerpt?: string;
}

export interface LabelResult {
  verdict: LabelVerdict;
  headline: string;
  reasons: string[];
  findings: Finding[];
  claim?: Claim;
  caveats: string[];
  region: Region;
  basis: 'label' | 'database';
  /** The app should ask for a label photo to confirm. */
  needsLabelPhoto: boolean;
}

// ---------------------------------------------------------------- dish

export type GlutenLikelihood = 'always' | 'often' | 'sometimes' | 'none';

export type DishVerdict = 'likely_contains' | 'ask_first' | 'usually_gluten_free' | 'unknown';

export interface DishIngredient {
  name: string;
  gluten: GlutenLikelihood;
  /** Key into RISK_SOURCES, used to generate a question. */
  source?: string;
  note?: string;
}

export interface DishEntry {
  id: string;
  name: string;
  aliases: string[];
  cuisine: string;
  ingredients: DishIngredient[];
  note?: string;
}

export interface DishCandidate {
  dish: DishEntry;
  score: number;
  matchedOn: string;
}

export interface DishResult {
  verdict: DishVerdict;
  headline: string;
  dishName: string;
  estimated: boolean;
  ingredients: DishIngredient[];
  questions: string[];
  reasons: string[];
}
