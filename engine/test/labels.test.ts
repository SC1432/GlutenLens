/**
 * Realistic label scenarios. These labels are written for testing in the style of
 * real packaging; they are not copied from specific products. When a real label is
 * misjudged, add it here (anonymised) with the correct expected verdict.
 */
import { describe, expect, it } from 'vitest';
import { assessLabel, type LabelVerdict, type Region, type Settings } from '../src/index.ts';

interface Case {
  name: string;
  text: string;
  region: Region;
  expect: LabelVerdict;
  oats?: Settings['oats'];
  /** Canonical names that must appear among findings with an effect. */
  flags?: string[];
}

const cases: Case[] = [
  // ---- Australia / NZ
  { name: 'AU biscuit with PEAL summary', region: 'AU', expect: 'contains_gluten', flags: ['wheat'],
    text: 'Ingredients: Sugar, Wheat Flour, Vegetable Oil, Cocoa, Milk Solids, Emulsifier (Soy Lecithin). Contains: Wheat, Gluten, Milk, Soy.' },
  { name: 'AU rice crackers labelled gluten free', region: 'AU', expect: 'gluten_free_claim',
    text: 'GLUTEN FREE. Ingredients: Rice (93%), Sunflower Oil, Salt.' },
  { name: 'AU sausage with rusk', region: 'AU', expect: 'contains_gluten', flags: ['wheat-family grain'],
    text: 'Ingredients: Pork (80%), Water, Rice Flour, Salt, Rusk, Spices, Preservative (223).' },
  { name: 'AU chocolate with precautionary statement', region: 'AU', expect: 'may_contain',
    text: 'Ingredients: Sugar, Cocoa Butter, Milk Solids, Cocoa Mass, Emulsifier. May contain traces of gluten and peanuts.' },
  { name: 'AU wheaten cornflour', region: 'AU', expect: 'contains_gluten', text: 'Ingredients: Wheaten Cornflour.' },
  { name: 'AU maize cornflour', region: 'AU', expect: 'no_gluten_ingredients', text: 'Ingredients: Cornflour (Maize).' },
  { name: 'AU wheat glucose syrup is exempt', region: 'AU', expect: 'no_gluten_ingredients',
    text: 'Ingredients: Sugar, Glucose Syrup (Wheat), Gelatine, Colours, Flavours.' },
  { name: 'AU malt vinegar chips', region: 'AU', expect: 'contains_gluten', flags: ['malt'],
    text: 'Ingredients: Potatoes, Vegetable Oil, Salt & Vinegar Seasoning (Salt, Malt Vinegar Powder, Acidity Regulator).' },
  { name: 'AU soy sauce with declared wheat (no duplicate soy finding)', region: 'AU', expect: 'contains_gluten', flags: ['wheat'],
    text: 'Ingredients: Chicken, Soy Sauce (Water, Soybeans, Wheat, Salt), Garlic.' },
  { name: 'AU gluten-free oats, oats avoided', region: 'AU', expect: 'contains_gluten', flags: ['oats'],
    text: 'Ingredients: Gluten free oats (90%), honey.' },
  { name: 'AU unqualified oats + claim, GF oats allowed: still unverified', region: 'AU', expect: 'cannot_verify', oats: 'gluten_free_oats_ok',
    text: 'Gluten free. Ingredients: Oats, sugar.' },
  { name: 'AU free-from statement counts as a claim', region: 'AU', expect: 'gluten_free_claim',
    text: 'Free from wheat, gluten and dairy. Ingredients: Rice flour, sugar, tapioca starch.' },
  { name: 'AU wheat-free is not gluten-free', region: 'AU', expect: 'contains_gluten', flags: ['barley'],
    text: 'Wheat free. Ingredients: Rice flour, barley malt extract, salt.' },
  { name: 'AU glutinous rice is not gluten', region: 'AU', expect: 'no_gluten_ingredients',
    text: 'Ingredients: Glutinous rice flour, water, sugar.' },
  { name: 'AU buckwheat noodles that contain wheat', region: 'AU', expect: 'contains_gluten', flags: ['wheat'],
    text: 'Ingredients: Buckwheat noodles (buckwheat flour, wheat flour, salt).' },
  { name: 'AU rice noodles', region: 'AU', expect: 'no_gluten_ingredients', text: 'Ingredients: Rice noodles (rice, water).' },
  { name: 'AU egg noodles with no source declared', region: 'AU', expect: 'cannot_verify', text: 'Ingredients: Egg noodles, water, salt.' },
  { name: 'AU not suitable for coeliacs', region: 'AU', expect: 'contains_gluten',
    text: 'Ingredients: Corn, sugar, salt. Not suitable for people with coeliac disease.' },
  { name: '"no added sugar" does not negate the next ingredient', region: 'AU', expect: 'contains_gluten',
    text: 'No added sugar, wheat flour, salt.' },
  { name: 'equipment statement', region: 'NZ', expect: 'may_contain',
    text: 'Ingredients: Rice, salt. Made on equipment that also processes wheat.' },

  // ---- Canada
  { name: 'CA bilingual label without gluten', region: 'CA', expect: 'no_gluten_ingredients',
    text: 'Ingredients: rice, sugar, salt. Ingrédients : riz, sucre, sel.' },
  { name: 'CA bilingual label with wheat in French only', region: 'CA', expect: 'contains_gluten', flags: ['wheat'],
    text: 'Ingrédients : farine de blé, sucre, sel.' },
  { name: 'CA Québec corn flour (blé d\'Inde)', region: 'CA', expect: 'no_gluten_ingredients',
    text: "Ingrédients : farine de blé d'Inde, eau, sel." },
  { name: 'CA gluten-free oats allowed by setting', region: 'CA', expect: 'gluten_free_claim', oats: 'gluten_free_oats_ok',
    text: 'Gluten-free. Ingredients: gluten-free oats, maple syrup.' },
  { name: 'CA unqualified oats covered by claim', region: 'CA', expect: 'gluten_free_claim', oats: 'gluten_free_oats_ok',
    text: 'Gluten free. Ingredients: oats, sugar.' },
  { name: 'CA facility statement', region: 'CA', expect: 'may_contain',
    text: 'Ingredients: corn, oil, salt. Manufactured in a facility that also processes wheat.' },

  // ---- United States
  { name: 'US natural flavors are unverified (barley not declared)', region: 'US', expect: 'cannot_verify',
    text: 'Ingredients: Corn, Vegetable Oil, Salt, Natural Flavors.' },
  { name: 'US claim resolves natural flavors', region: 'US', expect: 'gluten_free_claim',
    text: 'Certified Gluten-Free. Ingredients: Corn, Vegetable Oil, Salt, Natural Flavors.' },
  { name: 'US yeast extract', region: 'US', expect: 'cannot_verify', text: 'Ingredients: Potatoes, oil, yeast extract, salt.' },
  { name: 'US maltodextrin is not malt', region: 'US', expect: 'no_gluten_ingredients', text: 'Ingredients: Potatoes, oil, maltodextrin, salt.' },
  { name: 'US brown rice malt', region: 'US', expect: 'cannot_verify', text: 'Ingredients: Puffed rice, brown rice malt syrup.' },
  { name: 'AU brown rice malt (all gluten cereals declared)', region: 'AU', expect: 'no_gluten_ingredients', text: 'Ingredients: Puffed rice, brown rice malt syrup.' },
  { name: 'claim contradicted by a precautionary statement', region: 'US', expect: 'may_contain',
    text: 'Gluten free! Ingredients: rice, sugar. May contain wheat.' },

  // ---- Europe / UK
  { name: 'EU Codex wheat starch needs checking', region: 'EU', expect: 'cannot_verify',
    text: 'Gluten-free. Ingredients: wheat starch (gluten-free), sugar, yeast.' },
  { name: 'DE rice flour with may-contain', region: 'EU', expect: 'may_contain',
    text: 'Zutaten: Reismehl, Zucker, Salz. Kann Spuren von Gluten enthalten.' },
  { name: 'DE spelt', region: 'EU', expect: 'contains_gluten', text: 'Zutaten: Dinkelvollkornmehl, Wasser, Salz, Hefe.' },
  { name: 'FR rice flour with traces of wheat', region: 'EU', expect: 'may_contain',
    text: 'Ingrédients : farine de riz, sucre. Peut contenir des traces de blé.' },
  { name: 'IT senza glutine', region: 'EU', expect: 'gluten_free_claim', text: 'Ingredienti: farina di riso, zucchero, sale. Senza glutine.' },
  { name: 'IT durum wheat pasta', region: 'EU', expect: 'contains_gluten', text: 'Ingredienti: semola di grano duro, acqua.' },
  { name: 'ES unbleached wheat flour ("sin" is not a negation here)', region: 'EU', expect: 'contains_gluten',
    text: 'Ingredientes: harina de trigo sin blanquear, azúcar, sal.' },
  { name: 'ES sin gluten', region: 'EU', expect: 'gluten_free_claim', text: 'Ingredientes: arroz, sal. Sin gluten.' },
  { name: 'NL may contain gluten', region: 'EU', expect: 'may_contain', text: 'Ingrediënten: rijstmeel, suiker. Kan sporen van gluten bevatten.' },
  { name: 'UK barley malt extract in cereal', region: 'UK', expect: 'contains_gluten', text: 'Ingredients: Rice, Sugar, Salt, Barley Malt Extract.' },

  // ---- Brazil (Portuguese mandatory statement)
  { name: 'BR contém glúten', region: 'OTHER', expect: 'contains_gluten', text: 'Ingredientes: farinha de trigo, açúcar. CONTÉM GLÚTEN.' },
  { name: 'BR não contém glúten', region: 'OTHER', expect: 'gluten_free_claim', text: 'Ingredientes: arroz, sal. NÃO CONTÉM GLÚTEN.' },

  // ---- Asia (travel)
  { name: 'JA biscuit with allergen summary', region: 'OTHER', expect: 'contains_gluten', flags: ['wheat'],
    text: '原材料名：小麦粉（国内製造）、砂糖、ショートニング、食塩／膨張剤、（一部に小麦・乳成分・大豆を含む）' },
  { name: 'JA soy sauce', region: 'OTHER', expect: 'contains_gluten', text: '原材料名：脱脂加工大豆、小麦、食塩' },
  { name: 'JA rice cracker seasoned with soy sauce (wheat not named)', region: 'OTHER', expect: 'contains_gluten',
    text: '原材料名：うるち米、しょうゆ、砂糖' },
  { name: 'JA rice flour, gluten-free claim', region: 'OTHER', expect: 'gluten_free_claim', text: '原材料名：米粉、砂糖、食塩。グルテンフリー' },
  { name: 'JA factory statement after the list', region: 'OTHER', expect: 'may_contain',
    text: '原材料名：米、砂糖、食塩。本品製造工場では小麦を含む製品を生産しています。' },
  { name: 'ZH noodles', region: 'OTHER', expect: 'contains_gluten', text: '配料：小麦粉，水，食用盐' },
  { name: 'ZH oyster sauce', region: 'OTHER', expect: 'contains_gluten', text: '配料：水，蚝汁，白砂糖，蚝油，食用盐' },
  { name: 'KO ramyeon', region: 'OTHER', expect: 'contains_gluten', text: '원재료명: 소맥분(밀:미국산), 팜유, 감자전분, 정제염' },
  { name: 'KO list run together with a facility statement', region: 'OTHER', expect: 'contains_gluten',
    text: '밀가루, 설탕, 이 제품은 메밀, 땅콩을 사용한 제품과 같은 제조시설에서 제조하고 있습니다' },
  { name: 'KO facility statement naming wheat', region: 'OTHER', expect: 'may_contain',
    text: '원재료명: 쌀, 설탕, 정제염. 이 제품은 밀, 대두를 사용한 제품과 같은 제조시설에서 제조하고 있습니다.' },
  { name: 'TH soy sauce', region: 'OTHER', expect: 'contains_gluten', text: 'ส่วนประกอบ: ข้าว, น้ำตาล, ซีอิ๊ว' },
  { name: 'VI rice flour', region: 'OTHER', expect: 'no_gluten_ingredients', text: 'Thành phần: bột gạo, nước, muối.' },
  { name: 'VI wheat flour', region: 'OTHER', expect: 'contains_gluten', text: 'Thành phần: bột mì, đường, muối.' },
  { name: 'ID wheat flour and kecap', region: 'OTHER', expect: 'contains_gluten', text: 'Komposisi: tepung terigu, gula, kecap manis, garam.' },
  { name: 'ID rice flour', region: 'OTHER', expect: 'no_gluten_ingredients', text: 'Komposisi: tepung beras, gula, garam.' },
  { name: 'OTHER region: flavouring is unverified', region: 'OTHER', expect: 'cannot_verify', text: 'Ingredients: rice, sugar, flavouring.' },

  // ---- edge cases
  { name: 'empty text', region: 'AU', expect: 'cannot_verify', text: '' },
  { name: 'precautionary sentence before the ingredients', region: 'AU', expect: 'contains_gluten',
    text: 'May contain traces of peanuts. Ingredients: wheat flour, sugar.' },
];

describe('label scenarios', () => {
  for (const c of cases) {
    it(c.name, () => {
      const r = assessLabel({ text: c.text, region: c.region }, { oats: c.oats ?? 'avoid' });
      expect(r.verdict, `${r.reasons.join(' | ')}`).toBe(c.expect);
      expect(r.headline.length).toBeGreaterThan(0);
      expect(r.reasons.length).toBeGreaterThan(0);
      for (const flag of c.flags ?? []) {
        expect(r.findings.some((f) => f.canonical === flag && f.effect !== 'none'), `missing ${flag}`).toBe(true);
      }
    });
  }

  it('quotes findings from the original text, accents and case intact', () => {
    const text = 'Ingrédients : farine de BLÉ, sucre.';
    const r = assessLabel({ text, region: 'EU' });
    const f = r.findings.find((x) => x.canonical === 'wheat')!;
    expect(f.excerpt).toBe('BLÉ');
    expect(text.slice(f.start, f.end)).toBe('BLÉ');
  });

  it('soy sauce with declared wheat produces no redundant soy sauce finding', () => {
    const r = assessLabel({ text: 'Ingredients: Soy Sauce (Water, Soybeans, Wheat, Salt).', region: 'AU' });
    expect(r.findings.map((f) => f.canonical)).toEqual(['wheat']);
  });

  it('reports the contradiction when a gluten-free claim conflicts with ingredients', () => {
    const r = assessLabel({ text: 'Gluten free. Ingredients: rice, barley malt.', region: 'AU' });
    expect(r.reasons.some((x) => /take priority/.test(x))).toBe(true);
  });

  it('AU claim with oats adds a caveat', () => {
    const r = assessLabel({ text: 'Gluten free. Ingredients: oats.', region: 'AU' }, { oats: 'gluten_free_oats_ok' });
    expect(r.caveats.some((x) => /can’t include oats/.test(x))).toBe(true);
  });

  it('claim with no ingredient list is accepted in regulated regions when confirmed', () => {
    const r = assessLabel({ text: 'Gluten free', region: 'AU', extraction: { confidence: 'high', userConfirmed: true, ingredientsFound: false } });
    expect(r.verdict).toBe('gluten_free_claim');
    const r2 = assessLabel({ text: 'Gluten free', region: 'OTHER', extraction: { confidence: 'high', userConfirmed: true, ingredientsFound: false } });
    expect(r2.verdict).toBe('cannot_verify');
  });

  it('certification mark seen by the vision model counts as a claim', () => {
    const r = assessLabel({ text: 'Ingredients: rice, salt.', region: 'AU', certificationMark: true });
    expect(r.verdict).toBe('gluten_free_claim');
    expect(r.claim?.kind).toBe('certification_mark');
  });
});
