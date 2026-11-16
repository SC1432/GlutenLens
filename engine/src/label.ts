import { fold, mask, originalSpan, type Folded } from './fold.ts';
import { RULES, type TermRule } from './lexicon.ts';
import { checkCoverage } from './language.ts';
import {
  findClaims, findNotSuitable, innerSegment, isNegated, outerSegment, segmentStatements, statementAt,
  type Span, type Statement,
} from './statements.ts';
import {
  DEFAULT_SETTINGS, LABEL_VERDICT_ORDER, POSITIVE_VERDICTS,
  type Claim, type Finding, type LabelInput, type LabelResult, type LabelVerdict, type Region, type Settings,
} from './types.ts';

/** Regions whose law requires every gluten cereal to be declared. */
const ALL_GLUTEN_DECLARED: ReadonlySet<Region> = new Set(['AU', 'NZ', 'CA', 'EU', 'UK']);
/** Regions where wheat at least must be declared. */
const WHEAT_DECLARED: ReadonlySet<Region> = new Set(['AU', 'NZ', 'CA', 'EU', 'UK', 'US']);
/** Regions that codify an exemption for wheat glucose syrup, dextrose, maltodextrin. */
const DERIVATIVE_EXEMPT: ReadonlySet<Region> = new Set(['AU', 'NZ', 'EU', 'UK']);
/** Regions whose gluten-free claim permits only gluten-free oats. */
const CLAIM_ALLOWS_GF_OATS: ReadonlySet<Region> = new Set(['CA', 'US', 'EU', 'UK']);
const REGULATED_CLAIM: ReadonlySet<Region> = new Set(['AU', 'NZ', 'CA', 'EU', 'UK', 'US']);

const STALE_SECONDS = 3 * 365 * 24 * 3600;
const QUALIFIER_GAP = 25;

export const HEADLINES: Record<LabelVerdict, string> = {
  contains_gluten: 'Contains gluten',
  may_contain: 'May contain gluten',
  cannot_verify: "Can't verify",
  no_gluten_ingredients: 'No gluten ingredients found',
  gluten_free_claim: 'Labelled gluten-free',
};

interface RawMatch {
  rule: TermRule;
  start: number;
  end: number;
}

function worst(a: LabelVerdict, b: LabelVerdict): LabelVerdict {
  return LABEL_VERDICT_ORDER.indexOf(a) <= LABEL_VERDICT_ORDER.indexOf(b) ? a : b;
}

/** Run every rule in phase order, masking each match so later rules can't re-match it. */
function matchTerms(text: string): RawMatch[] {
  let working = text;
  const out: RawMatch[] = [];
  for (const rule of RULES) {
    rule.regex.lastIndex = 0;
    for (const m of working.matchAll(rule.regex)) {
      if (m[0].trim() === '') continue;
      const start = m.index;
      const end = start + m[0].length;
      if (rule.unlessSegment) {
        const seg = innerSegment(text, start, end);
        if (rule.unlessSegment.test(text.slice(seg.start, seg.end))) {
          continue; // e.g. "rice flour": leave unmasked, it's not a finding
        }
      }
      out.push({ rule, start, end });
      working = mask(working, start, end);
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Term categories found in free text (used for AI-estimated dish ingredients). */
export function findTerms(textIn: string): { category: Finding['category']; canonical: string; excerpt: string }[] {
  const f = fold(textIn);
  let masked = f.text;
  for (const c of findClaims(f.text)) masked = mask(masked, c.start, c.end);
  return matchTerms(masked)
    .filter((m) => m.rule.category !== 'safe' && !isNegated(f.text, m.start, m.end))
    .map((m) => ({ category: m.rule.category as Finding['category'], canonical: m.rule.canonical, excerpt: originalSpan(f, m.start, m.end).text }));
}

export function assessLabel(input: LabelInput, settings: Settings = DEFAULT_SETTINGS): LabelResult {
  const region = input.region;
  const basis = input.basis ?? 'label';
  const f: Folded = fold(input.text ?? '');
  const text = f.text;
  const statements: Statement[] = segmentStatements(text);
  const reasons: string[] = [];
  const caveats: string[] = [];

  // ---- claims and terms
  const claimSpans = findClaims(text);
  let maskedText = text;
  for (const c of claimSpans) maskedText = mask(maskedText, c.start, c.end);
  const raw = matchTerms(maskedText).filter((m) => m.rule.category !== 'safe');

  // Qualifier: a claim phrase attached to a single ingredient ("gluten-free oats",
  // "wheat starch (gluten free)") qualifies that ingredient rather than the product.
  const usedClaims = new Set<Span>();
  const qualified = new Set<RawMatch>();
  for (const m of raw) {
    if (m.rule.category === 'exempt') continue;
    const seg = innerSegment(text, m.start, m.end);
    for (const c of claimSpans) {
      if (c.start < seg.start || c.end > seg.end) continue;
      const before = c.end <= m.start && m.start - c.end <= QUALIFIER_GAP;
      const after = c.start >= m.end && c.start - m.end <= QUALIFIER_GAP;
      if (!before && !after) continue;
      const lo = before ? c.end : m.end;
      const hi = before ? m.start : c.start;
      const between = raw.some((o) => o !== m && o.start >= lo && o.end <= hi);
      if (between) continue;
      qualified.add(m);
      usedClaims.add(c);
    }
  }
  if (input.basis !== 'database') {
    // "pure oats" / "uncontaminated oats" qualify oats only.
    for (const m of raw) {
      if (m.rule.category !== 'oats') continue;
      const before = text.slice(Math.max(0, m.start - 20), m.start);
      if (/(?:pure|uncontaminated|purity\s+protocol)\s+$/u.test(before)) qualified.add(m);
    }
  }

  // ---- product-level claim
  let claim: Claim | undefined;
  const productClaim = claimSpans.find((c) => !usedClaims.has(c) && statementAt(statements, c.start) !== 'may_contain');
  if (productClaim) claim = { kind: 'text', excerpt: originalSpan(f, productClaim.start, productClaim.end).text };
  if (input.certificationMark) claim = { kind: 'certification_mark' };

  // ---- build findings
  const findings: Finding[] = [];
  const glutenSegments = new Set<string>();
  for (const m of raw) {
    if (m.rule.category === 'gluten' || m.rule.category === 'oats') {
      const seg = outerSegment(text, m.start, m.end);
      glutenSegments.add(`${seg.start}:${seg.end}`);
    }
  }

  for (const m of raw) {
    const statement = statementAt(statements, m.start);
    const negated = statement === 'free_from' || isNegated(text, m.start, m.end);
    const span = originalSpan(f, m.start, m.end);
    const finding: Finding = {
      excerpt: span.text,
      canonical: m.rule.canonical,
      category: m.rule.category as Finding['category'],
      statement,
      qualified: qualified.has(m),
      language: m.rule.lang,
      start: span.start,
      end: span.end,
      effect: 'none',
      note: m.rule.note,
    };
    if (negated) {
      finding.note = 'Stated as absent ("free from", "no …").';
      if (m.rule.canonical === 'gluten' && !claim) claim = { kind: 'free_from', excerpt: span.text };
      findings.push(finding);
      continue;
    }
    // A likely/ambiguous term in an ingredient whose source is already spelled out is redundant.
    if ((m.rule.category === 'likely_gluten' || m.rule.category === 'ambiguous') && statement !== 'may_contain') {
      const seg = outerSegment(text, m.start, m.end);
      if (glutenSegments.has(`${seg.start}:${seg.end}`)) continue;
    }
    findings.push(finding);
  }

  const isAbsent = (x: Finding) => x.note?.startsWith('Stated as absent') ?? false;
  const hasDeclaredGluten = findings.some(
    (x) => x.category === 'gluten' && !x.qualified && !isAbsent(x) && x.statement !== 'may_contain',
  );

  // ---- effects
  for (const x of findings) {
    if (isAbsent(x)) continue;
    if (x.statement === 'may_contain') {
      if (x.category === 'gluten' || x.category === 'likely_gluten' || x.category === 'oats') x.effect = 'may_contain';
      continue;
    }
    switch (x.category) {
      case 'gluten':
        x.effect = x.qualified ? 'cannot_verify' : 'contains_gluten';
        if (x.qualified) x.note = 'Listed as gluten-free (e.g. specially processed wheat starch). Check for a certification mark.';
        break;
      case 'oats':
        if (settings.oats === 'avoid') {
          x.effect = 'contains_gluten';
          x.note = 'Your settings avoid all oats.';
        } else if (x.qualified) {
          x.effect = 'none';
        } else {
          x.effect = 'cannot_verify'; // may be resolved by a claim below
          x.note = 'Oats not stated as gluten-free.';
        }
        break;
      case 'likely_gluten':
        if (x.qualified) break;
        if (WHEAT_DECLARED.has(region)) {
          x.effect = hasDeclaredGluten ? 'none' : 'cannot_verify';
          x.note = `${x.note ?? 'Usually contains gluten.'} The label doesn't declare a gluten source for it.`;
        } else {
          x.effect = 'contains_gluten';
          x.note = `${x.note ?? 'Usually contains gluten.'} Treated as likely gluten.`;
        }
        break;
      case 'ambiguous':
        if (!ALL_GLUTEN_DECLARED.has(region)) {
          x.effect = 'cannot_verify';
          x.note = `${x.note ?? 'Source not stated.'} ${region === 'US' ? 'US law requires wheat, but not barley or rye, to be declared.' : 'Allergen declaration rules here are unknown.'}`.trim();
        }
        break;
      case 'exempt':
        if (DERIVATIVE_EXEMPT.has(region)) x.note = 'Processed so that gluten is removed; exempt from allergen labelling here.';
        else {
          x.effect = 'cannot_verify';
          x.note = 'Derived from a gluten cereal; not covered by a labelling exemption in this region.';
        }
        break;
    }
  }

  // "Not suitable for coeliacs" is as strong as a contains statement.
  for (const s of findNotSuitable(text)) {
    const span = originalSpan(f, s.start, s.end);
    findings.push({
      excerpt: span.text, canonical: 'not suitable for coeliacs', category: 'gluten', statement: 'contains',
      qualified: false, language: 'en', start: span.start, end: span.end, effect: 'contains_gluten',
    });
  }

  // ---- database signals
  const db = input.databaseSignals;
  if (db) {
    if (db.allergenGluten) {
      findings.push({ excerpt: 'Allergens: gluten (database)', canonical: 'gluten', category: 'gluten', statement: 'contains', qualified: false, language: 'en', start: 0, end: 0, effect: 'contains_gluten' });
    }
    if (db.tracesGluten) {
      findings.push({ excerpt: 'Traces: gluten (database)', canonical: 'gluten', category: 'gluten', statement: 'may_contain', qualified: false, language: 'en', start: 0, end: 0, effect: 'may_contain' });
    }
    if (db.labelledGlutenFree && !claim) claim = { kind: 'database' };
  }

  // ---- claim resolves certain uncertainty in regulated regions
  const claimTrusted = claim !== undefined && REGULATED_CLAIM.has(region);
  if (claimTrusted) {
    for (const x of findings) {
      if (x.effect !== 'cannot_verify') continue;
      if (x.category === 'ambiguous' || x.category === 'likely_gluten' || x.category === 'exempt') {
        x.effect = 'none';
        x.note = `${x.note ?? ''} Covered by the product's gluten-free claim.`.trim();
      }
      if (x.category === 'oats' && CLAIM_ALLOWS_GF_OATS.has(region)) {
        x.effect = 'none';
        x.note = 'A gluten-free claim here only permits gluten-free oats.';
      }
    }
  }
  if (claim && (region === 'AU' || region === 'NZ') && findings.some((x) => x.category === 'oats' && x.statement !== 'may_contain' && !isAbsent(x))) {
    caveats.push('Australian and NZ gluten-free claims can’t include oats, so this label may be imported or mislabelled.');
  }

  // ---- combine
  let verdict: LabelVerdict = claim ? 'gluten_free_claim' : 'no_gluten_ingredients';
  for (const x of findings) if (x.effect !== 'none') verdict = worst(verdict, x.effect);

  for (const x of findings) {
    if (x.effect === 'contains_gluten') reasons.push(`Lists “${x.excerpt}” (${x.canonical}).${x.note && x.category === 'oats' ? ' ' + x.note : ''}`);
    else if (x.effect === 'may_contain') reasons.push(`Precautionary statement mentions “${x.excerpt}”.`);
    else if (x.effect === 'cannot_verify') reasons.push(`“${x.excerpt}”: ${x.note ?? 'source not stated.'}`);
  }
  if (claim && (verdict === 'contains_gluten' || verdict === 'may_contain')) {
    reasons.push('The label also makes a gluten-free claim, but the ingredient and allergen statements take priority.');
  }

  // ---- caps on positive verdicts
  const cap = (why: string) => {
    if (POSITIVE_VERDICTS.has(verdict)) {
      verdict = 'cannot_verify';
      reasons.push(why);
    } else if (verdict === 'cannot_verify') reasons.push(why);
  };

  const coverage = checkCoverage(text, input.language, raw.length > 0);
  if (!coverage.covered) cap(coverage.reason!);

  const ex = input.extraction;
  if (ex) {
    if (!ex.userConfirmed) cap('The extracted text hasn’t been confirmed yet.');
    if (ex.confidence === 'low') cap('The label text was hard to read.');
    if (!ex.ingredientsFound) {
      const claimOnlyOk = claimTrusted && ex.userConfirmed && ex.confidence !== 'low' && verdict === 'gluten_free_claim';
      if (!claimOnlyOk) cap('No ingredient list was found.');
    }
  }
  if (!text.trim()) cap('No label text.');

  if (db) {
    if (!db.ingredientsComplete) cap('The database’s ingredient list is incomplete.');
    if (db.lastModified && Date.now() / 1000 - db.lastModified > STALE_SECONDS) cap('The database entry is more than three years old; the recipe may have changed.');
  }
  if (region === 'OTHER' && claim && verdict === 'gluten_free_claim') {
    caveats.push('Gluten-free claim rules in this region are unknown.');
  }
  if (verdict === 'gluten_free_claim') {
    caveats.push(region === 'AU' || region === 'NZ'
      ? 'In Australia and NZ, gluten-free means no detectable gluten.'
      : 'Gluten-free here generally means under 20 ppm gluten.');
  }
  if (verdict === 'no_gluten_ingredients') caveats.push('No gluten-free claim, so cross-contact during manufacturing isn’t ruled out.');
  if (basis === 'database' && POSITIVE_VERDICTS.has(verdict)) caveats.push('From a product database — check the label.');

  if (reasons.length === 0) {
    reasons.push(verdict === 'gluten_free_claim'
      ? `Gluten-free claim${claim?.excerpt ? `: “${claim.excerpt}”` : claim?.kind === 'certification_mark' ? ' (certification mark)' : ''}, and no gluten sources listed.`
      : 'No gluten sources found in the ingredients or allergen statements.');
  }

  return {
    verdict,
    headline: HEADLINES[verdict],
    reasons: [...new Set(reasons)],
    findings,
    claim,
    caveats,
    region,
    basis,
    needsLabelPhoto: basis === 'database' && verdict !== 'contains_gluten',
  };
}
