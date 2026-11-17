import type { DishRecognition, LabelExtraction } from '@glutenlens/engine';

/**
 * Model output is untrusted input. These checks reject anything malformed
 * rather than filling gaps with defaults, so a missing confidence can never
 * become "high" by accident. They never decide a verdict.
 */
export class InvalidModelOutput extends Error {}

const CONF = ['high', 'medium', 'low'] as const;
type Conf = (typeof CONF)[number];

function fail(what: string): never {
  throw new InvalidModelOutput(`The reply from Claude was incomplete (${what}).`);
}
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
const isConf = (v: unknown): v is Conf => typeof v === 'string' && (CONF as readonly string[]).includes(v);

export function validateLabelExtraction(v: unknown): LabelExtraction {
  if (!isObj(v)) fail('not an object');
  if (typeof v.ingredientsText !== 'string') fail('ingredientsText');
  if (!isStrArr(v.statements)) fail('statements');
  if (typeof v.language !== 'string') fail('language');
  if (!isConf(v.confidence)) fail('confidence');
  if (typeof v.ingredientsFound !== 'boolean') fail('ingredientsFound');
  if (typeof v.certificationMark !== 'boolean') fail('certificationMark');
  const out: LabelExtraction = {
    ingredientsText: v.ingredientsText,
    statements: v.statements,
    language: v.language.trim().toLowerCase(),
    confidence: v.confidence,
    ingredientsFound: v.ingredientsFound,
    certificationMark: v.certificationMark,
  };
  if (v.boldTerms !== undefined) {
    if (!isStrArr(v.boldTerms)) fail('boldTerms');
    out.boldTerms = v.boldTerms;
  }
  if (v.otherLanguages !== undefined) {
    if (!isStrArr(v.otherLanguages)) fail('otherLanguages');
    out.otherLanguages = v.otherLanguages;
  }
  if (v.englishTranslation !== undefined) {
    if (typeof v.englishTranslation !== 'string') fail('englishTranslation');
    out.englishTranslation = v.englishTranslation;
  }
  return out;
}

export function validateDishRecognition(v: unknown): DishRecognition {
  if (!isObj(v) || !Array.isArray(v.candidates)) fail('candidates');
  const candidates = v.candidates.slice(0, 5).map((c, i) => {
    if (!isObj(c) || typeof c.name !== 'string' || !c.name.trim()) fail(`candidate ${i + 1} name`);
    if (!isConf(c.confidence)) fail(`candidate ${i + 1} confidence`);
    const out: DishRecognition['candidates'][number] = { name: c.name.trim(), confidence: c.confidence };
    if (c.nativeName !== undefined) {
      if (typeof c.nativeName !== 'string') fail(`candidate ${i + 1} nativeName`);
      if (c.nativeName.trim()) out.nativeName = c.nativeName.trim();
    }
    return out;
  });
  const out: DishRecognition = { candidates };
  if (v.typicalIngredients !== undefined) {
    if (!isStrArr(v.typicalIngredients)) fail('typicalIngredients');
    out.typicalIngredients = v.typicalIngredients.map((s) => s.trim()).filter(Boolean);
  }
  return out;
}
