import { fold } from '../fold.ts';
import type { DishCandidate, DishEntry } from '../types.ts';
import { DISHES } from './dishes.ts';

export function normaliseName(s: string): string {
  return fold(s).text.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function levenshtein(a: string, b: string): number {
  const A = [...a];
  const B = [...b];
  let prev = Array.from({ length: B.length + 1 }, (_, j) => j);
  for (let i = 1; i <= A.length; i++) {
    const cur = [i];
    for (let j = 1; j <= B.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (A[i - 1] === B[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[B.length]!;
}

const hasSpaces = (s: string) => /\s/.test(s) || /\p{Script=Latin}/u.test(s);

function containsPhrase(hay: string, needle: string): boolean {
  if (!hasSpaces(needle)) return hay.includes(needle); // CJK/Thai: no word spacing
  return ` ${hay} `.includes(` ${needle} `);
}

function scoreName(query: string, name: string): number {
  if (!query || !name) return 0;
  if (query === name) return 1;
  if ([...name].length >= 3 && containsPhrase(query, name)) return 0.85; // "chicken pad thai" ⊃ "pad thai"
  if ([...query].length >= 4 && containsPhrase(name, query)) return 0.8; // "teriyaki" ⊂ "chicken teriyaki"
  const len = Math.max([...query].length, [...name].length);
  const sim = 1 - levenshtein(query, name) / len;
  if (sim >= 0.75) return 0.6 + (sim - 0.75) * 1.2; // typos: "ramne" → "ramen"
  const qt = new Set(query.split(' '));
  const nt = new Set(name.split(' '));
  const inter = [...qt].filter((t) => nt.has(t) && t.length > 2).length;
  const jac = inter / new Set([...qt, ...nt]).size;
  return jac >= 0.5 ? 0.55 + 0.3 * jac : 0;
}

/**
 * Rank dishes for a typed name or a vision model's guesses. The user picks one,
 * so returning several plausible candidates is better than guessing.
 */
export function matchDish(queries: string | string[], limit = 5, kb: DishEntry[] = DISHES): DishCandidate[] {
  const qs = (Array.isArray(queries) ? queries : [queries]).map(normaliseName).filter(Boolean);
  const best = new Map<string, DishCandidate>();
  for (const q of qs) {
    for (const dish of kb) {
      for (const n of [dish.name, ...dish.aliases]) {
        const score = scoreName(q, normaliseName(n));
        const prev = best.get(dish.id);
        if (score >= 0.6 && (!prev || score > prev.score)) best.set(dish.id, { dish, score, matchedOn: n });
      }
    }
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}
