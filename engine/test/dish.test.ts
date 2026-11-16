import { describe, expect, it } from 'vitest';
import { assessDish, assessEstimatedDish, DISHES, matchDish, type DishVerdict } from '../src/index.ts';

const top = (q: string | string[]) => matchDish(q)[0]?.dish.id;

describe('dish matching', () => {
  it.each([
    ['ramen', 'ramen'],
    ['Ramen', 'ramen'],
    ['ラーメン', 'ramen'],
    ['ramne', 'ramen'], // typo
    ['chicken pad thai', 'pad-thai'],
    ['ผัดไทย', 'pad-thai'],
    ['phở bò', 'pho'],
    ['pho', 'pho'],
    ['비빔밥', 'bibimbap'],
    ['butter chicken', 'butter-chicken'],
    ['fish and chips', 'fish-and-chips'],
    ['poutine', 'poutine'],
    ['caesar salad', 'caesar-salad'],
    ['spaghetti bolognese', 'pasta'],
    ['bánh mì', 'banh-mi'],
    ['egg fried rice', 'fried-rice'],
    ['tonkotsu ramen', 'ramen'],
  ])('%s → %s', (q, id) => {
    expect(top(q)).toBe(id);
  });

  it('accepts several vision-model guesses at once', () => {
    const ids = matchDish(['Pad See Ew', 'Drunken noodles', 'Pad thai']).map((c) => c.dish.id);
    expect(ids.slice(0, 2).sort()).toEqual(['pad-see-ew', 'pad-thai']);
  });

  it('returns nothing for an unknown dish', () => {
    expect(matchDish('zzqx unknown thing')).toEqual([]);
  });
});

describe('dish verdicts', () => {
  const v = (id: string): DishVerdict => assessDish(DISHES.find((d) => d.id === id)!).verdict;

  it.each([
    ['ramen', 'likely_contains'],
    ['udon', 'likely_contains'],
    ['japanese-curry', 'likely_contains'],
    ['pizza', 'likely_contains'],
    ['naan', 'likely_contains'],
    ['banh-mi', 'likely_contains'],
    ['fish-and-chips', 'likely_contains'],
    ['sushi', 'ask_first'],
    ['pad-thai', 'ask_first'],
    ['pho', 'ask_first'],
    ['butter-chicken', 'ask_first'],
    ['poutine', 'ask_first'],
    ['chips', 'ask_first'],
    ['guacamole', 'usually_gluten_free'],
    ['mango-sticky-rice', 'usually_gluten_free'],
    ['edamame', 'usually_gluten_free'],
    ['ratatouille', 'usually_gluten_free'],
  ] as const)('%s → %s', (id, expected) => {
    expect(v(id)).toBe(expected);
  });

  it('gives targeted questions', () => {
    const r = assessDish(DISHES.find((d) => d.id === 'pho')!);
    expect(r.questions.some((q) => /hoisin/i.test(q))).toBe(true);
    expect(r.questions.at(-1)).toMatch(/clean surface/);
  });

  it('even a usually gluten-free dish never says safe', () => {
    const r = assessDish(DISHES.find((d) => d.id === 'guacamole')!);
    expect(r.headline).toMatch(/confirm/);
    expect(r.questions.length).toBeGreaterThan(0);
  });
});

describe('estimated dishes (not in the knowledge base)', () => {
  it('flags a gluten ingredient from the estimate', () => {
    const r = assessEstimatedDish('Pierogi', ['wheat flour dough', 'potato', 'cheese', 'onion']);
    expect(r.verdict).toBe('likely_contains');
    expect(r.estimated).toBe(true);
  });

  it('flags likely-gluten sauces', () => {
    expect(assessEstimatedDish('Adobo', ['chicken', 'vinegar', 'soy sauce', 'garlic']).verdict).toBe('ask_first');
  });

  it('works on non-English estimates', () => {
    expect(assessEstimatedDish('Mì Quảng', ['bột mì', 'tôm', 'thịt heo']).verdict).toBe('likely_contains');
  });

  it('never claims an estimated dish is gluten-free', () => {
    const r = assessEstimatedDish('Ceviche', ['white fish', 'lime juice', 'onion', 'chilli', 'coriander']);
    expect(r.verdict).toBe('unknown');
    expect(r.reasons.some((x) => /estimate/.test(x))).toBe(true);
  });

  it('does not treat buckwheat as wheat', () => {
    expect(assessEstimatedDish('Kasha', ['buckwheat groats', 'butter', 'salt']).verdict).toBe('unknown');
  });
});
