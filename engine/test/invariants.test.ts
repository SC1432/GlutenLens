/**
 * Safety invariants (SPEC §7). Most cases are generated from the lexicon's own
 * examples, so adding an example to a rule automatically adds tests for it.
 */
import { describe, expect, it } from 'vitest';
import {
  assessDish, assessEstimatedDish, assessLabel, DISHES, POSITIVE_VERDICTS, RISK_SOURCES, RULES,
  type LabelVerdict, type Region,
} from '../src/index.ts';

const ALL_REGIONS: Region[] = ['AU', 'NZ', 'CA', 'US', 'EU', 'UK', 'OTHER'];
const byCategory = (c: string) => RULES.filter((r) => r.category === c).flatMap((r) => r.examples.map((ex) => ({ ex, rule: r })));

const verdict = (text: string, region: Region, oats: 'avoid' | 'gluten_free_oats_ok' = 'avoid'): LabelVerdict =>
  assessLabel({ text, region }, { oats }).verdict;

describe('invariant 1: every gluten term is detected in ingredient and contains positions', () => {
  for (const { ex, rule } of byCategory('gluten')) {
    it(`${rule.lang}: "${ex}"`, () => {
      for (const region of ALL_REGIONS) {
        expect(verdict(`Ingredients: sugar, ${ex}, salt.`, region), region).toBe('contains_gluten');
        expect(verdict(`Ingredients: sugar, salt. Contains: ${ex}.`, region), region).toBe('contains_gluten');
      }
    });
  }
});

describe('invariant 2: gluten terms in precautionary statements give at least may_contain', () => {
  for (const { ex, rule } of [...byCategory('gluten'), ...byCategory('likely_gluten')]) {
    it(`${rule.lang}: "${ex}"`, () => {
      for (const region of ALL_REGIONS) {
        const v = verdict(`Ingredients: sugar, rice, salt. May contain traces of ${ex}.`, region);
        expect(['may_contain', 'contains_gluten'], `${region}: ${v}`).toContain(v);
      }
    });
  }
});

describe('oats', () => {
  for (const { ex, rule } of byCategory('oats')) {
    it(`${rule.lang}: "${ex}" is avoided by default in every region`, () => {
      for (const region of ALL_REGIONS) expect(verdict(`Ingredients: sugar, ${ex}, salt.`, region)).toBe('contains_gluten');
    });
    it(`${rule.lang}: unqualified "${ex}" is never positive when gluten-free oats are allowed`, () => {
      for (const region of ALL_REGIONS) expect(POSITIVE_VERDICTS.has(verdict(`Ingredients: sugar, ${ex}, salt.`, region, 'gluten_free_oats_ok'))).toBe(false);
    });
  }
});

describe('likely-gluten terms are never positive', () => {
  for (const { ex, rule } of byCategory('likely_gluten')) {
    it(`${rule.lang}: "${ex}"`, () => {
      expect(verdict(`Ingredients: sugar, ${ex}, salt.`, 'OTHER')).toBe('contains_gluten');
      for (const region of ALL_REGIONS) expect(POSITIVE_VERDICTS.has(verdict(`Ingredients: sugar, ${ex}, salt.`, region))).toBe(false);
    });
  }
});

describe('exempt derivatives', () => {
  for (const { ex, rule } of byCategory('exempt')) {
    it(`${rule.lang}: "${ex}" is fine where exempt and unverified elsewhere`, () => {
      expect(verdict(`Ingredients: sugar, ${ex}, cocoa butter, salt.`, 'AU')).toBe('no_gluten_ingredients');
      expect(verdict(`Ingredients: sugar, ${ex}, cocoa butter, salt.`, 'EU')).toBe('no_gluten_ingredients');
      expect(verdict(`Ingredients: sugar, ${ex}, cocoa butter, salt.`, 'US')).toBe('cannot_verify');
      expect(verdict(`Ingredients: sugar, ${ex}, cocoa butter, salt.`, 'OTHER')).toBe('cannot_verify');
    });
  }
});

describe('safe overrides do not trigger gluten', () => {
  for (const { ex, rule } of byCategory('safe')) {
    it(`${rule.lang}: "${ex}"`, () => {
      expect(verdict(`Ingredients: ${ex}, water, salt.`, 'AU')).not.toBe('contains_gluten');
    });
  }
});

describe('invariant 3: unsupported scripts and languages are never positive', () => {
  const labels: [string, string | undefined][] = [
    ['Состав: сахар, рис, соль, вода', undefined], // Russian
    ['المكونات: سكر، أرز، ملح، ماء', undefined], // Arabic
    ['सामग्री: चीनी, चावल, नमक', undefined], // Hindi
    ['Συστατικά: ζάχαρη, ρύζι, αλάτι', undefined], // Greek
    ['Składniki: cukier, ryż, sól', undefined], // Polish (Latin script, uncovered)
    ['Içindekiler: şeker, pirinç, tuz', undefined], // Turkish
    ['rice, sugar, salt', 'pl'], // declared unsupported language
  ];
  for (const [text, language] of labels) {
    it(text, () => {
      for (const region of ALL_REGIONS) {
        const v = assessLabel({ text, region, language }).verdict;
        expect(POSITIVE_VERDICTS.has(v), v).toBe(false);
      }
    });
  }
});

describe('invariant 4: unconfirmed or low-confidence extraction is never positive', () => {
  const text = 'Gluten free. Ingredients: rice, water, salt.';
  it('unconfirmed', () => {
    expect(assessLabel({ text, region: 'AU', extraction: { confidence: 'high', userConfirmed: false, ingredientsFound: true } }).verdict).toBe('cannot_verify');
  });
  it('low confidence', () => {
    expect(assessLabel({ text, region: 'AU', extraction: { confidence: 'low', userConfirmed: true, ingredientsFound: true } }).verdict).toBe('cannot_verify');
  });
  it('but contains is still reported when unconfirmed', () => {
    expect(assessLabel({ text: 'Ingredients: wheat flour', region: 'AU', extraction: { confidence: 'low', userConfirmed: false, ingredientsFound: true } }).verdict).toBe('contains_gluten');
  });
});

describe('invariant 5: dish verdicts', () => {
  it('every dish has a cross-contact question and valid risk sources', () => {
    for (const d of DISHES) {
      const r = assessDish(d);
      expect(r.questions).toContain(RISK_SOURCES.cross_contact!.question);
      for (const i of d.ingredients) if (i.source) expect(RISK_SOURCES[i.source], `${d.id}: ${i.source}`).toBeDefined();
      for (const i of d.ingredients) if (i.gluten !== 'none') expect(i.source, `${d.id}: ${i.name} needs a source`).toBeDefined();
    }
  });
  it('dish ids are unique', () => {
    expect(new Set(DISHES.map((d) => d.id)).size).toBe(DISHES.length);
  });
  it('an estimated dish is never usually_gluten_free', () => {
    expect(assessEstimatedDish('Mystery stew', ['potato', 'carrot', 'water', 'salt']).verdict).toBe('unknown');
  });
});

describe('invariant 6: a gluten source beats any gluten-free claim', () => {
  for (const claim of ['Gluten free', 'Certified gluten-free', 'Sans gluten', 'Glutenfrei', 'グルテンフリー']) {
    it(claim, () => {
      for (const region of ALL_REGIONS) {
        expect(verdict(`${claim}. Ingredients: rice flour, barley malt extract, sugar.`, region)).toBe('contains_gluten');
      }
    });
  }
});
