/**
 * Prompts and JSON schemas for the vision model (Claude API). The app sends a
 * photo with these; the model only transcribes or proposes candidates. It never
 * decides whether something is gluten-free: the rules engine does that.
 */

export const LABEL_EXTRACTION_PROMPT = `You are transcribing a food package label for a gluten-checking app.

Transcribe, exactly as printed and in the original language and script:
- the ingredient list (keep brackets, commas and percentages),
- any allergen statement ("Contains…", bold allergen summary, "Allergens:"),
- any precautionary statement ("May contain…", "Made on equipment…", "Traces of…"),
- any gluten-free claim or free-from statement.

Rules:
- Do not translate, summarise, correct spelling or omit anything. Do not add ingredients that are not printed.
- If text is cut off, blurred or partly hidden, transcribe what you can read and lower your confidence.
- Note words printed in bold in the ingredient list in "boldTerms" (these are often declared allergens).
- Report whether a gluten-free certification symbol (crossed grain, GFCO, Coeliac Australia or similar) is visible.
- Do not judge whether the product is safe or gluten-free.

Respond only with JSON matching the schema.`;

export const LABEL_EXTRACTION_SCHEMA = {
  type: 'object',
  required: ['ingredientsText', 'statements', 'language', 'confidence', 'ingredientsFound', 'certificationMark'],
  properties: {
    ingredientsText: { type: 'string', description: 'Ingredient list verbatim, or empty string if none visible.' },
    statements: { type: 'array', items: { type: 'string' }, description: 'Allergen, precautionary and claim statements, verbatim, one per item.' },
    boldTerms: { type: 'array', items: { type: 'string' } },
    language: { type: 'string', description: 'ISO 639-1 code of the main label language.' },
    otherLanguages: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    ingredientsFound: { type: 'boolean' },
    certificationMark: { type: 'boolean' },
    englishTranslation: { type: 'string', description: 'Optional English translation for display only; never used for the verdict.' },
  },
} as const;

export interface LabelExtraction {
  ingredientsText: string;
  statements: string[];
  boldTerms?: string[];
  language: string;
  otherLanguages?: string[];
  confidence: 'high' | 'medium' | 'low';
  ingredientsFound: boolean;
  certificationMark: boolean;
  englishTranslation?: string;
}

/** Text the engine should assess: ingredients plus statements, sentence-separated. */
export function extractionToText(e: LabelExtraction): string {
  const ing = e.ingredientsText.trim();
  return [ing && !/[.。]$/.test(ing) ? `${ing}.` : ing, ...e.statements].filter(Boolean).join('\n');
}

export const DISH_RECOGNITION_PROMPT = `You are identifying a dish or food in a photo for a gluten-checking app used by someone with coeliac disease.

Return up to 5 candidate names for what this is, most likely first. For each, give the common English name and, if it's from a non-English cuisine, its native name in its own script.

Only if asked for typical ingredients, list the ingredients this dish is usually made with, including sauces, marinades, coatings, stock and condiments served with it, since these are where gluten hides. List common versions' ingredients, not a guess at this specific plate.

Do not judge whether it is gluten-free. Respond only with JSON matching the schema.`;

export const DISH_RECOGNITION_SCHEMA = {
  type: 'object',
  required: ['candidates'],
  properties: {
    candidates: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        required: ['name', 'confidence'],
        properties: {
          name: { type: 'string' },
          nativeName: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
    typicalIngredients: { type: 'array', items: { type: 'string' } },
  },
} as const;

export interface DishRecognition {
  candidates: { name: string; nativeName?: string; confidence: 'high' | 'medium' | 'low' }[];
  typicalIngredients?: string[];
}
