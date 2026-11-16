import { findTerms } from '../label.ts';
import type { DishEntry, DishIngredient, DishResult, DishVerdict, GlutenLikelihood } from '../types.ts';
import { RISK_SOURCES } from './riskSources.ts';

export const DISH_HEADLINES: Record<DishVerdict, string> = {
  likely_contains: 'Usually contains gluten',
  ask_first: 'Often has hidden gluten — ask first',
  usually_gluten_free: 'Usually made without gluten — confirm with the kitchen',
  unknown: "Can't assess this dish",
};

const CROSS_CONTACT_Q = RISK_SOURCES.cross_contact!.question;

function questionsFor(ings: DishIngredient[]): string[] {
  const qs = ings
    .filter((i) => i.gluten !== 'none' && i.source && RISK_SOURCES[i.source])
    .map((i) => RISK_SOURCES[i.source!]!.question);
  return [...new Set([...qs, CROSS_CONTACT_Q])];
}

function reasonFor(i: DishIngredient): string | null {
  switch (i.gluten) {
    case 'always': return `Typically made with ${i.name}.`;
    case 'often': return `Often includes ${i.name}.`;
    case 'sometimes': return `Sometimes includes ${i.name}.`;
    default: return null;
  }
}

function verdictFor(ings: DishIngredient[]): DishVerdict {
  if (ings.some((i) => i.gluten === 'always')) return 'likely_contains';
  if (ings.some((i) => i.gluten === 'often' || i.gluten === 'sometimes')) return 'ask_first';
  return 'usually_gluten_free';
}

/** Verdict for a dish confirmed from the knowledge base. */
export function assessDish(dish: DishEntry): DishResult {
  const verdict = verdictFor(dish.ingredients);
  const reasons = dish.ingredients.map(reasonFor).filter((r): r is string => r !== null);
  if (verdict === 'usually_gluten_free') reasons.push('None of the usual ingredients contain gluten, but kitchens vary and cross-contact is common.');
  return {
    verdict,
    headline: DISH_HEADLINES[verdict],
    dishName: dish.name,
    estimated: false,
    ingredients: dish.ingredients,
    questions: questionsFor(dish.ingredients),
    reasons: dish.note ? [...reasons, dish.note] : reasons,
  };
}

const CATEGORY_TO_LIKELIHOOD: Record<string, GlutenLikelihood> = {
  gluten: 'always',
  oats: 'often',
  likely_gluten: 'often',
  ambiguous: 'sometimes',
  exempt: 'none',
};

/**
 * Verdict for a dish outside the knowledge base, from a model-estimated list of
 * typical ingredients. Each name runs through the same multilingual lexicon as
 * labels. Never returns "usually gluten-free": an estimate can't vouch for safety.
 */
export function assessEstimatedDish(dishName: string, typicalIngredients: string[]): DishResult {
  const ingredients: DishIngredient[] = typicalIngredients.map((name) => {
    const terms = findTerms(name);
    let gluten: GlutenLikelihood = 'none';
    for (const t of terms) {
      const g = CATEGORY_TO_LIKELIHOOD[t.category] ?? 'none';
      if (['always', 'often', 'sometimes', 'none'].indexOf(g) < ['always', 'often', 'sometimes', 'none'].indexOf(gluten)) gluten = g;
    }
    return { name, gluten, source: gluten === 'none' ? undefined : 'cross_contact', note: terms.map((t) => t.canonical).join(', ') || undefined };
  });
  let verdict = verdictFor(ingredients);
  if (verdict === 'usually_gluten_free') verdict = 'unknown';
  const reasons = [
    'This dish isn’t in the app’s dish list, so its usual recipe was estimated.',
    ...ingredients.map(reasonFor).filter((r): r is string => r !== null),
  ];
  if (verdict === 'unknown') reasons.push('No gluten sources appear in the estimated recipe, but an estimate can’t confirm a dish is gluten-free.');
  return {
    verdict,
    headline: DISH_HEADLINES[verdict],
    dishName,
    estimated: true,
    ingredients,
    questions: [
      ...new Set([
        ...ingredients.filter((i) => i.gluten !== 'none').map((i) => `Does the ${i.name} contain wheat, barley or rye?`),
        'What goes into this dish, including sauces, stock and seasonings?',
        CROSS_CONTACT_Q,
      ]),
    ],
    reasons,
  };
}
