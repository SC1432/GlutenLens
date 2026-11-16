/**
 * Case- and accent-folding that keeps a map back to the original string,
 * so findings can quote the label exactly as printed.
 *
 * Accents are stripped only from Latin letters. Stripping combining marks from
 * Japanese would destroy dakuten (グ → ク) and change meaning.
 */
export interface Folded {
  text: string;
  /** map[i] = index in the original string of folded char i. */
  map: number[];
  original: string;
}

const LATIN = /\p{Script=Latin}/u;
const MARK = /\p{M}/gu;

export function fold(original: string): Folded {
  let text = '';
  const map: number[] = [];
  let i = 0;
  for (const ch of original) {
    let f = ch.normalize('NFD');
    const base = f[0] ?? '';
    if (LATIN.test(base)) f = f.replace(MARK, '');
    else f = ch;
    // Normalise typographic variants that matter for matching.
    f = f
      .replace(/[‐-―−]/g, '-') // dashes
      .replace(/[‘’ʼ]/g, "'") // apostrophes
      .replace(/ /g, ' ')
      .toLowerCase();
    for (let k = 0; k < f.length; k++) {
      text += f[k];
      map.push(i);
    }
    i += ch.length;
  }
  return { text, map, original };
}

/** Original-string slice for a folded [start, end) range. */
export function originalSpan(f: Folded, start: number, end: number): { start: number; end: number; text: string } {
  const s = f.map[start] ?? f.original.length;
  const lastIdx = f.map[Math.max(start, end - 1)] ?? s;
  // Extend to the end of the last original code point.
  const cp = f.original.codePointAt(lastIdx);
  const e = end > start ? lastIdx + (cp !== undefined && cp > 0xffff ? 2 : 1) : s;
  return { start: s, end: e, text: f.original.slice(s, e) };
}

/** Replace [start,end) with spaces, preserving length so offsets stay valid. */
export function mask(text: string, start: number, end: number): string {
  return text.slice(0, start) + ' '.repeat(end - start) + text.slice(end);
}
