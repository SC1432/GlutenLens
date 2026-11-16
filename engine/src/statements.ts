/**
 * Splits folded label text into statements (ingredients / contains /
 * may-contain / free-from), and finds gluten-free claims and negations.
 * All patterns are written for folded text (lowercase, no Latin accents).
 */
import type { StatementType } from './types.ts';

export interface Statement {
  start: number;
  end: number;
  type: StatementType;
}

export interface Span {
  start: number;
  end: number;
}

interface Keyword {
  type: Exclude<StatementType, 'ingredients'>;
  regex: RegExp;
  /** 'sentence': the keyword governs the whole sentence it sits in (allergen named before
   * the keyword, as in Japanese/Korean/Thai). 'forward': from the keyword to sentence end. */
  scope: 'forward' | 'sentence';
}

const K = (type: Keyword['type'], src: string, scope: Keyword['scope'] = 'forward'): Keyword => ({
  type, regex: new RegExp(src, 'gu'), scope,
});
const LB = '(?<![\\p{L}])';

const KEYWORDS: Keyword[] = [
  // ---- free-from (list negation). Checked first at any position.
  K('free_from', `${LB}(?:free\\s+(?:from|of)|does\\s+not\\s+contain|contains\\s+no|made\\s+without|ne\\s+contient\\s+pas|exempte?\\s+de|libre\\s+de|no\\s+contiene|privo\\s+di|non\\s+contiene|frei\\s+von|enthalt\\s+kein\\p{L}*|vrij\\s+van|bevat\\s+geen|isento\\s+de|livre\\s+de|nao\\s+contem|tidak\\s+mengandung|bebas|khong\\s+chua)`),
  K('free_from', '不含|무첨가|함유하지\\s*않'),
  // ---- may contain
  K('may_contain', `${LB}(?:may\\s+(?:also\\s+)?(?:contain|be\\s+present|have)|traces?\\s+of|cross[\\s-]+conta(?:ct|mination)|shared\\s+(?:equipment|facility|line)|(?:made|produced|manufactured|processed|packed|packaged|prepared|baked)\\s+(?:in|on|at|using)\\s+(?:a\\s+|the\\s+)?(?:same\\s+|shared\\s+)?(?:facility|factory|premises|equipment|line|site|plant|bakery|kitchen))`),
  K('may_contain', `${LB}(?:peut\\s+contenir|susceptible\\s+de\\s+contenir|traces?\\s+(?:eventuelles?\\s+|possibles?\\s+)?d[e']|fabrique\\s+dans\\s+(?:un|une)\\s+(?:atelier|site|usine))`),
  K('may_contain', `${LB}(?:puede\\s+contener|trazas\\s+de|elaborado\\s+en\\s+(?:una\\s+)?(?:planta|fabrica|instalacion)|pode\\s+conter|tracos\\s+de|fabricado\\s+em)`),
  K('may_contain', `${LB}(?:puo\\s+contenere|tracce\\s+di|prodotto\\s+in\\s+uno\\s+stabilimento)`),
  K('may_contain', `${LB}(?:kann\\s+(?:auch\\s+)?spuren|spuren\\s+von|hergestellt\\s+in\\s+einem\\s+betrieb|kan\\s+sporen|sporen\\s+van)`),
  K('may_contain', `${LB}(?:mungkin\\s+mengandung|diproduksi\\s+di\\s+fasilitas|fasilitas\\s+yang\\s+sama|co\\s+the\\s+chua|dau\\s+vet)`),
  K('may_contain', '工場|製造ライン|同じ設備|同一ライン|混入|可能含有|生产线|生產線|同一工厂|同一工廠|제조\\s*시설|혼입|อาจมี|ผลิตในโรงงาน|เครื่องจักร', 'sentence'),
  // ---- contains / allergen declarations
  K('contains', `${LB}(?:contains|allergens?|allergy\\s+(?:advice|information)|contient|allergenes|contiene|alergenos|allergeni|enthalt|allergene|bevat|allergenen|contem|alergicos|mengandung|alergen)(?![\\p{L}])`),
  K('contains', '含む|含有|过敏原|過敏原|함유|알레르기'),
];

/** Gluten-free claims. Matched spans are masked before term matching. */
const CLAIMS = new RegExp(
  [
    `(?:certified\\s+)?gluten[\\s-]*free`,
    `${LB}no\\s+gluten${'(?![\\p{L}])'}`,
    `sans\\s+gluten`, `sin\\s+gluten`, `libre\\s+de\\s+gluten`, `senza\\s+glutine`, `glutenfrei`, `glutenvrij`,
    `sem\\s+gluten`, `nao\\s+contem\\s+gluten`, `isento\\s+de\\s+gluten`, `bebas\\s+gluten`, `khong\\s+(?:chua\\s+)?gluten`,
    `グルテンフリー`, `グルテン不使用`, `无麸质`, `無麩質`, `不含麸质`, `不含麩質`, `글루텐\\s*프리`, `무\\s*글루텐`, `ไม่มีกลูเตน`, `ปราศจากกลูเตน`,
  ].join('|'),
  'gu',
);

const NOT_SUITABLE = /not\s+suitable\s+for\s+(?:people\s+with\s+|those\s+with\s+)?(?:coeliacs?|celiacs?)|ne\s+convient\s+pas\s+aux\s+(?:coeliaques|celiaques)/gu;

const SENTENCE_END = /(?<!\d)[.!?](?!\d)|[。！？\n]/gu;
const SENTENCE_SCOPE_MAX_BACK = 80;
/** "This product …" openers that begin a precautionary statement. */
const STATEMENT_ANCHOR = /이\s*제품|본\s*제품|本品|本製品|この製品|本产品|本產品|该产品|該產品|ผลิตภัณฑ์นี้/gu;

/**
 * Where a sentence-scoped statement begins. If a "this product" anchor precedes the
 * keyword in the sentence, start there; otherwise cover only the current clause, so an
 * ingredient list run together with the statement isn't downgraded to "may contain".
 * Erring toward the clause means an allergen named before the clause reads as an
 * ingredient: a false alarm, never a false "safe".
 */
function sentenceScopeStart(text: string, sentStart: number, kwStart: number): number {
  const lo = Math.max(sentStart, kwStart - SENTENCE_SCOPE_MAX_BACK);
  let anchor = -1;
  for (const m of text.slice(lo, kwStart).matchAll(STATEMENT_ANCHOR)) anchor = lo + m.index;
  if (anchor >= 0) return anchor;
  let p = kwStart;
  while (p > lo && !/[,;、，；]/u.test(text[p - 1]!)) p--;
  return p;
}

export function sentenceSpans(text: string): Span[] {
  const spans: Span[] = [];
  let start = 0;
  for (const m of text.matchAll(SENTENCE_END)) {
    const end = m.index + m[0].length;
    spans.push({ start, end });
    start = end;
  }
  if (start < text.length) spans.push({ start, end: text.length });
  return spans;
}

export function segmentStatements(text: string): Statement[] {
  const sentences = sentenceSpans(text);
  // Collect keyword hits, earliest first; free_from > may_contain > contains at ties
  // (KEYWORDS is ordered by that priority); drop hits inside an accepted hit.
  const hits: { start: number; end: number; kw: Keyword }[] = [];
  for (const kw of KEYWORDS) {
    for (const m of text.matchAll(kw.regex)) hits.push({ start: m.index, end: m.index + m[0].length, kw });
  }
  hits.sort((a, b) => a.start - b.start || KEYWORDS.indexOf(a.kw) - KEYWORDS.indexOf(b.kw));
  const accepted: typeof hits = [];
  for (const h of hits) {
    const last = accepted[accepted.length - 1];
    if (last && h.start < last.end) continue;
    accepted.push(h);
  }

  // Default: everything is ingredients. Paint keyword statements over it.
  const types: StatementType[] = new Array(text.length).fill('ingredients');
  const sentenceOf = (pos: number) => sentences.find((s) => pos >= s.start && pos < s.end) ?? { start: 0, end: text.length };
  for (let i = 0; i < accepted.length; i++) {
    const h = accepted[i]!;
    const sent = sentenceOf(h.start);
    const next = accepted[i + 1];
    const forwardEnd = Math.min(sent.end, next && next.start >= h.start ? next.start : sent.end);
    const start = h.kw.scope === 'sentence' ? sentenceScopeStart(text, sent.start, h.start) : h.start;
    const end = h.kw.scope === 'sentence' ? sent.end : forwardEnd;
    for (let p = start; p < end; p++) {
      // A sentence-scoped statement never overrides an explicit forward one.
      if (h.kw.scope === 'sentence' && types[p] !== 'ingredients') continue;
      types[p] = h.kw.type;
    }
  }

  const out: Statement[] = [];
  for (let p = 0; p < text.length; p++) {
    const t = types[p]!;
    const last = out[out.length - 1];
    if (last && last.type === t && last.end === p) last.end = p + 1;
    else out.push({ start: p, end: p + 1, type: t });
  }
  return out;
}

export function statementAt(statements: Statement[], pos: number): StatementType {
  return statements.find((s) => pos >= s.start && pos < s.end)?.type ?? 'ingredients';
}

export function findClaims(text: string): Span[] {
  return [...text.matchAll(CLAIMS)].map((m) => ({ start: m.index, end: m.index + m[0].length }));
}

export function findNotSuitable(text: string): Span[] {
  return [...text.matchAll(NOT_SUITABLE)].map((m) => ({ start: m.index, end: m.index + m[0].length }));
}

const INNER_DELIM = /[,;、，；・\n]/u;
const SENTENCE_DELIM = /(?<!\d)[.!?](?!\d)|[。！？]/u;

/** Innermost ingredient segment around [start,end): bounded by any comma at any depth. */
export function innerSegment(text: string, start: number, end: number): Span {
  let s = start;
  while (s > 0 && !INNER_DELIM.test(text[s - 1]!) && !SENTENCE_DELIM.test(text[s - 1]!)) s--;
  let e = end;
  while (e < text.length && !INNER_DELIM.test(text[e]!) && !SENTENCE_DELIM.test(text[e]!)) e++;
  return { start: s, end: e };
}

/** Top-level ingredient segment: commas inside parentheses don't split it. */
export function outerSegment(text: string, start: number, end: number): Span {
  // Absolute bracket depth at every position, so a term inside "(…)" still
  // resolves to the whole ingredient that encloses it.
  const depth: number[] = new Array(text.length).fill(0);
  let d = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (/[)）\]]/u.test(c)) d = Math.max(0, d - 1);
    depth[i] = d;
    if (/[(（[]/u.test(c)) d++;
  }
  const isBoundary = (i: number) => depth[i] === 0 && (INNER_DELIM.test(text[i]!) || SENTENCE_DELIM.test(text[i]!));
  let s = start;
  while (s > 0 && !isBoundary(s - 1)) s--;
  let e = end;
  while (e < text.length && !isBoundary(e)) e++;
  return { start: s, end: e };
}

const PREFIX_NEGATION = /(?:^|[^\p{L}])(?:no|without|sans|sin|senza|ohne|zonder|sem|tanpa|khong)\s+(?:added\s+)?$|(?:不含|无|無|ไม่มี)\s*$/u;
const POSTFIX_NEGATION = /^[\s-]*(?:free|frei|vrij)(?![\p{L}])|^[^、，,。;；\n]{0,12}?(?:不使用|未使用|フリー|무첨가|프리)/u;

/** "no wheat", "wheat-free", "小麦不使用": the term is negated. */
export function isNegated(text: string, start: number, end: number): boolean {
  const before = text.slice(Math.max(0, start - 20), start);
  const after = text.slice(end, end + 20);
  return PREFIX_NEGATION.test(before) || POSTFIX_NEGATION.test(after);
}
