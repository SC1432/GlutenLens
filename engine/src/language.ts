/**
 * Coverage cap: the engine may only report "no gluten ingredients" for text it
 * can actually read. A label in Polish or Arabic with no lexicon hits is not
 * evidence of safety.
 */
import { SUPPORTED_LANGUAGES } from './types.ts';

export interface Coverage {
  covered: boolean;
  reason?: string;
}

const SUPPORTED_SCRIPTS = [/\p{Script=Latin}/u, /\p{Script=Han}/u, /\p{Script=Hiragana}/u, /\p{Script=Katakana}/u, /\p{Script=Hangul}/u, /\p{Script=Thai}/u];

/** Common label words in each supported Latin-script language (folded). */
const LATIN_VOCAB = new RegExp(
  '(?<![\\p{L}])(?:' +
    [
      // en
      'ingredients?', 'sugar', 'salt', 'water', 'oil', 'milk', 'flour', 'rice', 'corn', 'maize', 'starch', 'eggs?', 'butter', 'cream', 'cocoa',
      'vinegar', 'yeast', 'emulsifiers?', 'acid', 'vegetables?', 'fat', 'cheese', 'tomato', 'potato', 'onion', 'garlic', 'pepper', 'spices?', 'soy',
      'beef', 'chicken', 'pork', 'fish', 'honey', 'fruit', 'contains', 'colou?rs?', 'preservatives?', 'nuts?', 'peanuts?', 'sesame', 'syrup',
      // fr
      'ingredients', 'sucre', 'sel', 'eau', 'huile', 'lait', 'farine', 'riz', 'amidon', 'oeufs?', 'beurre', 'creme', 'cacao', 'vinaigre', 'levure', 'epices', 'poulet', 'boeuf',
      // es / pt
      'ingredientes', 'azucar', 'agua', 'aceite', 'leche', 'harina', 'arroz', 'almidon', 'huevos?', 'mantequilla', 'sal', 'acucar', 'oleo', 'leite', 'farinha', 'ovos?', 'manteiga', 'pollo', 'frango',
      // it
      'ingredienti', 'zucchero', 'acqua', 'olio', 'latte', 'farina', 'riso', 'amido', 'uova', 'burro', 'pomodoro',
      // de
      'zutaten', 'zucker', 'salz', 'wasser', 'milch', 'mehl', 'reis', 'starke', 'eier?', 'sahne', 'kakao', 'essig', 'hefe', 'gewurze?', 'pflanzliche?s?',
      // nl
      'ingredienten', 'suiker', 'zout', 'olie', 'melk', 'rijst', 'zetmeel', 'boter', 'azijn', 'gist',
      // id / ms
      'komposisi', 'bahan', 'gula', 'garam', 'air', 'minyak', 'susu', 'tepung', 'beras', 'telur', 'mentega', 'bawang', 'kedelai', 'ayam', 'sapi',
      // vi
      'thanh phan', 'duong', 'muoi', 'nuoc', 'dau', 'sua', 'bot', 'gao', 'trung', 'toi', 'hanh', 'thit', 'ga',
    ].join('|') +
    ')(?![\\p{L}])',
  'u',
);

export function checkCoverage(foldedText: string, declaredLanguage?: string, anyLexiconHit = false): Coverage {
  if (declaredLanguage) {
    const lang = declaredLanguage.toLowerCase().slice(0, 2);
    if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(lang)) {
      return { covered: false, reason: `The label is in a language this app can't check yet (${declaredLanguage}).` };
    }
  }

  let letters = 0;
  let unsupported = 0;
  let latin = 0;
  for (const ch of foldedText) {
    if (!/\p{L}/u.test(ch)) continue;
    letters++;
    if (/\p{Script=Latin}/u.test(ch)) latin++;
    else if (!SUPPORTED_SCRIPTS.some((r) => r.test(ch))) unsupported++;
  }
  if (letters === 0) return { covered: false, reason: 'No readable text.' };
  if (unsupported / letters > 0.2) {
    return { covered: false, reason: "Part of the label is in a script this app can't read." };
  }
  if (!declaredLanguage && latin / letters > 0.5 && !anyLexiconHit && !LATIN_VOCAB.test(foldedText)) {
    return { covered: false, reason: "Couldn't confirm the label is in a language this app can read." };
  }
  return { covered: true };
}
