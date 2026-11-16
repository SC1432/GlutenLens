/**
 * Multilingual gluten term rules.
 *
 * Patterns run against folded text (lowercase, accents stripped from Latin
 * letters — see fold.ts), so write them without accents: "blé" → "ble".
 *
 * Processing order matters and is fixed by RULE_PHASES: exempt derivatives are
 * matched first (so "wheat glucose syrup" doesn't hit "wheat"), then safe
 * overrides (so "buckwheat" doesn't hit "wheat"), then everything else in
 * declaration order, specific before general. Each match masks its span.
 *
 * Every rule lists `examples`: real label forms that MUST match. The test
 * suite turns each example into safety tests, so add an example whenever a
 * real label is missed.
 */
import type { TermCategory } from './types.ts';

export type RuleCategory = TermCategory | 'safe';

export interface TermRule {
  id: string;
  lang: string;
  category: RuleCategory;
  canonical: string;
  regex: RegExp;
  examples: string[];
  /** Skip the match if its comma-segment contains this (e.g. "rice flour"). */
  unlessSegment?: RegExp;
  note?: string;
}

const L = '(?<![\\p{L}\\p{N}])'; // left word boundary (Unicode-aware)
const R = '(?![\\p{L}])'; // right word boundary
const HL = '(?<!\\p{Script=Hangul})';
const HR = '(?!\\p{Script=Hangul})';

function words(list: string[]): RegExp {
  return new RegExp(`${L}(?:${list.join('|')})${R}`, 'u');
}

// Qualifiers that make an unqualified "flour", "noodles", "pasta" etc. not wheat.
const NON_GLUTEN_QUALIFIERS = words([
  'rice', 'brown rice', 'corn', 'maize', 'potato', 'sweet potato', 'tapioca', 'cassava', 'chick ?peas?',
  'gram', 'besan', 'almonds?', 'coconut', 'buckwheat', 'sorghum', 'millet', 'soy', 'soya', 'quinoa',
  'arrowroot', 'banana', 'lentils?', 'peas?', 'teff', 'amaranth', 'lupin', 'chestnut', 'hemp', 'flax',
  'fava', 'beans?', 'mung', 'glass', 'konjac', 'shirataki', 'kelp', 'yam', 'taro', 'gluten[\\s-]*free',
  // fr
  'riz', 'mais', 'sarrasin', 'pois chiches?', 'pomme de terre', 'manioc', 'amandes?', 'coco', 'soja',
  'chataignes?', 'lin', 'sans gluten', "ble\\s+d'?\\s*inde", 'ble\\s+noir', 'lentilles?',
  // es / pt / it
  'arroz', 'maiz', 'papa', 'patata', 'garbanzos?', 'mandioca', 'yuca', 'almendras?', 'sin gluten',
  'milho', 'grao[\\s-]de[\\s-]bico', 'batata', 'sem gluten', 'riso', 'patate', 'ceci', 'castagne',
  'mandorle', 'cocco', 'soia', 'senza glutine', 'grano saraceno', 'trigo sarraceno',
  // id
  'beras', 'tapioka', 'jagung', 'maizena', 'sagu', 'kentang', 'singkong', 'ketan', 'bihun', 'soun',
  // de / nl
  'glutenfrei', 'glutenvrij',
]);

type RuleSpec = Omit<TermRule, 'regex' | 'id'> & { pattern: string; id?: string };

const specs: RuleSpec[] = [];
function add(lang: string, category: RuleCategory, canonical: string, pattern: string, examples: string[], extra: Partial<RuleSpec> = {}) {
  specs.push({ lang, category, canonical, pattern, examples, ...extra });
}

// ================================================================ EXEMPT
// Ingredients derived from gluten cereals but processed so gluten is removed;
// exempt from allergen declaration in AU/NZ (FSANZ 1.2.3) and EU/UK (Annex II).
const SRC = '\\(\\s*(?:from\\s+|derived from\\s+|de\\s+|da\\s+|di\\s+|aus\\s+|uit\\s+)?(?:wheat|barley|ble|froment|trigo|frumento|weizen|tarwe|orge|cebada|gerste|cevada)\\s*\\)';
add('en', 'exempt', 'wheat-derived glucose syrup / dextrose / maltodextrin',
  `(?:wheat|barley)[\\s-]*(?:derived\\s+)?(?:glucose(?:[\\s-]*fructose)?(?:\\s+syrup)?|dextrose|maltodextrin)|(?:glucose(?:[\\s-]*fructose)?(?:\\s+syrup)?|dextrose|maltodextrin)\\s*${SRC}`,
  ['wheat glucose syrup', 'glucose syrup (wheat)', 'dextrose (from wheat)', 'maltodextrin (wheat)', 'wheat maltodextrin', 'glucose syrup (barley)']);
add('fr', 'exempt', 'wheat-derived glucose syrup / dextrose / maltodextrin',
  `(?:sirop de glucose(?:[\\s-]*fructose)?|dextrose|maltodextrine)\\s*(?:de\\s+(?:ble|froment)|${SRC})`,
  ['sirop de glucose de blé', 'maltodextrine (blé)', 'dextrose de blé']);
add('es', 'exempt', 'wheat-derived glucose syrup / dextrose / maltodextrin',
  `(?:jarabe de glucosa|dextrosa|maltodextrina|xarope de glicose)\\s*(?:de\\s+trigo|${SRC})`,
  ['jarabe de glucosa de trigo', 'maltodextrina (trigo)', 'xarope de glicose de trigo']);
add('it', 'exempt', 'wheat-derived glucose syrup / dextrose / maltodextrin',
  `(?:sciroppo di glucosio|destrosio|maltodestrin[ae])\\s*(?:di\\s+frumento|da\\s+frumento|${SRC})`,
  ['sciroppo di glucosio (da frumento)', 'maltodestrine di frumento']);
add('de', 'exempt', 'wheat-derived glucose syrup / dextrose / maltodextrin',
  `(?:gl[uy][ck]ose?sirup|dextrose|maltodextrin)\\s*(?:aus\\s+weizen|${SRC})|weizen(?:gl[uy][ck]ose?sirup|dextrose|maltodextrin)`,
  ['Glukosesirup (Weizen)', 'Glucosesirup aus Weizen', 'Weizenglukosesirup', 'Maltodextrin (Weizen)']);
add('nl', 'exempt', 'wheat-derived glucose syrup / dextrose / maltodextrin',
  `(?:glucosestroop|dextrose|maltodextrine)\\s*(?:uit\\s+tarwe|${SRC}|\\(\\s*tarwe\\s*\\))`,
  ['glucosestroop (tarwe)', 'maltodextrine (tarwe)']);

// ================================================================ SAFE OVERRIDES
add('en', 'safe', 'buckwheat', 'buck[\\s-]?wheat', ['buckwheat', 'buckwheat flour']);
add('en', 'safe', 'maltodextrin / maltose / maltitol', `${L}(?:malto(?:dextrin|destrin)\\p{L}*|maltos[ea]\\p{L}*|maltit\\p{L}*|maltol|isomalt\\p{L}*)`,
  ['maltodextrin', 'maltose', 'maltitol', 'maltodextrine', 'maltodestrine', 'maltodextrina', 'isomalt']);
add('fr', 'safe', 'buckwheat / corn (Québec)', `ble[\\s-]+noir|ble[\\s-]+d'?\\s*inde`, ['blé noir', "blé d'Inde", 'farine de blé noir']);
add('es', 'safe', 'buckwheat', `trigo[\\s-]+sarraceno|trigo[\\s-]+mourisco`, ['trigo sarraceno', 'trigo-sarraceno', 'trigo mourisco']);
add('it', 'safe', 'buckwheat', 'grano[\\s-]+saraceno', ['grano saraceno']);
add('de', 'safe', 'buckwheat', 'buchweizen', ['Buchweizen', 'Buchweizenmehl']);
add('ja', 'safe', 'buckwheat flour', 'そば粉|蕎麦粉', ['そば粉', '蕎麦粉']);
add('ko', 'safe', 'buckwheat', '메밀', ['메밀', '메밀가루']);
add('zh', 'safe', 'buckwheat', '荞麦|蕎麥|蕎麦', ['荞麦', '蕎麥']);

// ================================================================ ENGLISH
add('en', 'ambiguous', 'rice malt', `(?:brown\\s+)?rice\\s+malt`, ['rice malt syrup', 'brown rice malt'],
  { note: 'Rice malt is usually gluten-free, but some are made with barley enzymes.' });
add('en', 'ambiguous', 'tamari', `${L}tamari${R}`, ['tamari'], { note: 'Tamari is often, but not always, wheat-free.' });
add('en', 'gluten', 'brewer\'s yeast', `brewer'?s?\\s+yeast`, ["brewer's yeast", 'brewers yeast'], { note: 'Usually a by-product of barley beer brewing.' });
add('en', 'gluten', 'wheat', 'wheat', ['wheat', 'wheat flour', 'wholewheat', 'whole wheat', 'Wheaten cornflour', 'hydrolysed wheat protein', 'WHEAT']);
add('en', 'gluten', 'barley', `${L}barley`, ['barley', 'pearl barley', 'barley malt extract', 'BARLEY']);
add('en', 'gluten', 'rye', `${L}ryes?${R}`, ['rye', 'rye flour', 'RYE']);
add('en', 'gluten', 'spelt', `${L}spelt${R}`, ['spelt', 'spelt flour']);
add('en', 'gluten', 'malt', `${L}malt(?:ed|s)?${R}`, ['malt', 'malt extract', 'malt vinegar', 'malted barley', 'malt flavouring']);
add('en', 'gluten', 'wheat-family grain', words(['triticale', 'kamut', 'khorasan', 'einkorn', 'emmer', 'farro', 'freekeh', 'frikeh', 'durum', 'semolina', 'cous ?cous', 'bulgh?ur', 'burghul', 'seitan', 'graham', 'panko', 'matzo', 'matzah', 'matza', 'rusks?', 'atta', 'maida', 'suji', 'sooji', 'rava', 'rawa']).source,
  ['triticale', 'kamut', 'durum wheat semolina', 'semolina', 'couscous', 'bulgur', 'seitan', 'panko', 'rusk', 'atta', 'maida', 'sooji']);
add('en', 'gluten', 'gluten', `${L}gluten${R}`, ['gluten', 'wheat gluten', 'cereals containing gluten', 'GLUTEN']);
add('en', 'oats', 'oats', `${L}oat\\p{L}*`, ['oats', 'rolled oats', 'oatmeal', 'oat bran', 'oat flour', 'OATS']);
add('en', 'likely_gluten', 'soy sauce', `soy(?:a|bean)?\\s+sauce|${L}shoyu${R}`, ['soy sauce', 'soya sauce', 'shoyu'],
  { note: 'Most soy sauce is brewed with wheat.' });
add('en', 'likely_gluten', 'oyster / hoisin / teriyaki / Worcestershire sauce', `oyster\\s+sauce|${L}hoisin|${L}teriyaki|worcestershire`,
  ['oyster sauce', 'hoisin sauce', 'teriyaki marinade', 'Worcestershire sauce'], { note: 'Usually contains wheat or malt vinegar.' });
add('en', 'likely_gluten', 'flour', `${L}flours?${R}`, ['flour', 'plain flour', 'self-raising flour'],
  { unlessSegment: NON_GLUTEN_QUALIFIERS, note: 'Flour without a named source is usually wheat.' });
add('en', 'likely_gluten', 'bread / crumbs / batter / pastry', words(['bread\\p{L}*', 'crumbs?', 'crumbed', 'croutons?', 'batter(?:ed)?', 'biscuits?', 'crackers?', 'wafers?', 'pastry', 'pastries', 'stuffing', 'bran']).source,
  ['breadcrumbs', 'bread', 'crumbed', 'batter', 'biscuit', 'wafer', 'pastry', 'bran'], { unlessSegment: NON_GLUTEN_QUALIFIERS });
add('en', 'likely_gluten', 'pasta / noodles', words(['pasta', 'noodles?', 'dumplings?', 'wontons?', 'vermicelli', 'spaghetti', 'macaroni']).source,
  ['pasta', 'noodles', 'egg noodles', 'dumpling', 'spaghetti'], { unlessSegment: NON_GLUTEN_QUALIFIERS });
add('en', 'likely_gluten', 'beer', words(['beer', 'ale', 'lager', 'stout']).source, ['beer', 'lager'], { unlessSegment: NON_GLUTEN_QUALIFIERS });
add('en', 'ambiguous', 'flavouring', words(['(?:natural\\s+|artificial\\s+|smoke\\s+)?flavou?r(?:ing)?s?']).source, ['flavour', 'natural flavor', 'flavouring', 'flavorings']);
add('en', 'ambiguous', 'yeast extract / hydrolysed protein', `yeast\\s+extract|hydroly[sz]ed\\s+(?:vegetable|plant)\\s+protein|${L}hvp${R}`,
  ['yeast extract', 'hydrolyzed vegetable protein', 'HVP']);
add('en', 'ambiguous', 'starch', words(['(?:modified\\s+)?(?:food\\s+)?starch(?:es)?', 'dextrin', 'thickener']).source, ['starch', 'modified starch', 'food starch', 'dextrin']);
add('en', 'ambiguous', 'seasoning / stock', words(['seasonings?', 'stock', 'broth', 'bouillon', 'gravy']).source, ['seasoning', 'stock', 'bouillon']);
add('en', 'ambiguous', 'glucose syrup', `glucose\\s+syrup|caramel\\s+colou?r`, ['glucose syrup', 'caramel colour']);

// ================================================================ FRENCH
add('fr', 'gluten', "brewer's yeast", `levure\\s+de\\s+biere`, ['levure de bière']);
add('fr', 'gluten', 'wheat', `${L}(?:ble|bles|froment)${R}`, ['blé', 'farine de blé', 'froment', 'BLÉ']);
add('fr', 'gluten', 'barley', `${L}orge${R}`, ["orge", "malt d'orge"]);
add('fr', 'gluten', 'rye', `${L}seigle${R}`, ['seigle']);
add('fr', 'gluten', 'spelt', `${L}epeautre${R}`, ['épeautre', 'petit épeautre']);
add('fr', 'oats', 'oats', `${L}avoine${R}`, ['avoine', "flocons d'avoine"]);
add('fr', 'likely_gluten', 'breadcrumbs / bread / pasta / beer', words(['chapelure', 'pain', 'pates', 'biere', 'semoule']).source,
  ['chapelure', 'pain', 'pâtes', 'bière', 'semoule'], { unlessSegment: NON_GLUTEN_QUALIFIERS });
add('fr', 'likely_gluten', 'flour', `${L}farines?${R}`, ['farine'], { unlessSegment: NON_GLUTEN_QUALIFIERS });
add('fr', 'likely_gluten', 'soy sauce', `sauce\\s+soja`, ['sauce soja']);
add('fr', 'ambiguous', 'flavouring / starch / stock', words(['aromes?(?:\\s+naturels?)?', 'amidon(?:\\s+modifie)?', 'extrait\\s+de\\s+levure', 'bouillon']).source,
  ['arôme', 'arômes naturels', 'amidon modifié', 'extrait de levure']);

// ================================================================ SPANISH / PORTUGUESE
add('es', 'gluten', "brewer's yeast", `levadura\\s+de\\s+cerveza|levedura\\s+de\\s+cerveja`, ['levadura de cerveza', 'levedura de cerveja']);
add('es', 'gluten', 'wheat', `${L}trigo${R}`, ['trigo', 'harina de trigo', 'farinha de trigo', 'TRIGO']);
add('es', 'gluten', 'barley', `${L}(?:cebada|cevada)${R}`, ['cebada', 'cevada', 'malta de cebada']);
add('es', 'gluten', 'rye', `${L}(?:centeno|centeio)${R}`, ['centeno', 'centeio']);
add('es', 'gluten', 'spelt', `${L}espelta${R}`, ['espelta']);
add('es', 'gluten', 'malt', `${L}(?:malta|malte)${R}`, ['malta', 'extracto de malta', 'malte']);
add('es', 'oats', 'oats', `${L}(?:avena|aveia)${R}`, ['avena', 'copos de avena', 'aveia']);
add('es', 'likely_gluten', 'breadcrumbs / bread / beer', words(['pan rallado', 'pan', 'pao', 'cerveza', 'cerveja', 'semola', 'farinha de rosca', 'pan de molde']).source,
  ['pan rallado', 'pan', 'pão', 'cerveza', 'sémola', 'farinha de rosca'], { unlessSegment: NON_GLUTEN_QUALIFIERS });
add('es', 'likely_gluten', 'flour', `${L}(?:harinas?|farinhas?)${R}`, ['harina', 'farinha'], { unlessSegment: NON_GLUTEN_QUALIFIERS });
add('es', 'likely_gluten', 'soy sauce', `salsa\\s+de\\s+so(?:ja|ya)|molho\\s+de\\s+soja`, ['salsa de soja', 'salsa de soya', 'molho de soja']);
add('es', 'ambiguous', 'flavouring / starch / stock', words(['aromas?', 'almidon(?:\\s+modificado)?', 'amido(?:\\s+modificado)?', 'extracto\\s+de\\s+levadura', 'extrato\\s+de\\s+levedura', 'caldo']).source,
  ['aroma', 'almidón modificado', 'extracto de levadura', 'extrato de levedura', 'caldo']);

// ================================================================ ITALIAN
// Note: "lievito di birra" is ordinary baker's yeast in Italy, not brewer's yeast.
add('it', 'gluten', 'wheat', `${L}(?:frumento|grano)${R}`, ['frumento', 'farina di grano tenero', 'semola di grano duro']);
add('it', 'gluten', 'barley', `${L}orzo${R}`, ['orzo', "malto d'orzo"]);
add('it', 'gluten', 'rye', `${L}segale${R}`, ['segale']);
add('it', 'gluten', 'farro', `${L}farro${R}`, ['farro']);
add('it', 'gluten', 'malt', `${L}malto${R}`, ['malto', "estratto di malto"]);
add('it', 'likely_gluten', 'breadcrumbs / bread / beer', words(['pangrattato', 'pane', 'birra']).source, ['pangrattato', 'pane', 'birra'], { unlessSegment: NON_GLUTEN_QUALIFIERS });
add('it', 'likely_gluten', 'flour', `${L}farin[ae]${R}`, ['farina'], { unlessSegment: NON_GLUTEN_QUALIFIERS });
add('it', 'likely_gluten', 'soy sauce', `salsa\\s+di\\s+soia`, ['salsa di soia']);
add('it', 'ambiguous', 'flavouring / starch / stock', words(['aromi', 'amido(?:\\s+modificato)?', 'estratto\\s+di\\s+lievito', 'brodo']).source,
  ['aromi', 'amido modificato', 'estratto di lievito']);

// ================================================================ GERMAN (compounds: no right boundary)
add('de', 'gluten', "brewer's yeast", 'bierhefe', ['Bierhefe']);
add('de', 'gluten', 'wheat', 'weizen', ['Weizen', 'Weizenmehl', 'Hartweizengrieß', 'Weichweizen']);
add('de', 'gluten', 'barley', 'gersten?', ['Gerste', 'Gerstenmalzextrakt']);
add('de', 'gluten', 'rye', 'roggen', ['Roggen', 'Roggenmehl']);
add('de', 'gluten', 'spelt', 'dinkel|grunkern', ['Dinkel', 'Dinkelmehl', 'Grünkern']);
add('de', 'gluten', 'malt', 'malz', ['Malz', 'Malzextrakt', 'Gerstenmalz']);
add('de', 'gluten', 'breadcrumbs', 'paniermehl|semmelbrosel', ['Paniermehl', 'Semmelbrösel']);
add('de', 'oats', 'oats', 'hafer', ['Hafer', 'Haferflocken']);
add('de', 'likely_gluten', 'flour / semolina / bread / beer', words(['mehl', 'grie(?:ß|ss)', 'brot\\p{L}*', 'bier']).source, ['Mehl', 'Grieß', 'Brot', 'Bier'],
  { unlessSegment: NON_GLUTEN_QUALIFIERS });
add('de', 'likely_gluten', 'soy sauce', 'sojaso(?:ß|ss)e|sojasauce', ['Sojasoße', 'Sojasauce']);
add('de', 'ambiguous', 'flavouring / starch / stock', words(['aroma', 'aromen', 'modifizierte\\s+starke', 'hefeextrakt', 'bruhe']).source, ['Aroma', 'Hefeextrakt', 'modifizierte Stärke']);

// ================================================================ DUTCH
add('nl', 'gluten', "brewer's yeast", 'biergist', ['biergist']);
add('nl', 'gluten', 'wheat', 'tarwe', ['tarwe', 'tarwebloem', 'volkoren tarwemeel']);
add('nl', 'gluten', 'barley', 'gerst', ['gerst', 'gerstemout']);
add('nl', 'gluten', 'rye', 'rogge', ['rogge', 'roggemeel']);
add('nl', 'gluten', 'malt', `${L}mout`, ['mout', 'moutextract']);
add('nl', 'gluten', 'breadcrumbs', 'paneermeel', ['paneermeel']);
add('nl', 'oats', 'oats', `${L}haver`, ['haver', 'havermout']);
add('nl', 'likely_gluten', 'flour / bread', words(['meel', 'brood']).source, ['meel', 'brood'], { unlessSegment: NON_GLUTEN_QUALIFIERS });
add('nl', 'likely_gluten', 'soy sauce', 'sojasaus', ['sojasaus']);
add('nl', 'ambiguous', 'flavouring / yeast extract', words(['aroma\\p{L}*', 'gistextract']).source, ['aroma', 'gistextract']);

// ================================================================ INDONESIAN / MALAY
add('id', 'gluten', 'wheat', `${L}(?:gandum|terigu)${R}`, ['gandum', 'tepung terigu', 'terigu', 'gandum hitam']);
add('id', 'gluten', 'barley', `${L}jelai${R}`, ['jelai']);
add('id', 'gluten', 'breadcrumbs', 'tepung\\s+roti|tepung\\s+panir', ['tepung roti', 'tepung panir']);
add('id', 'oats', 'oats', `${L}havermut${R}`, ['havermut']);
add('id', 'likely_gluten', 'soy sauce (kecap)', `${L}kecap${R}`, ['kecap manis', 'kecap asin'], { note: 'Kecap is usually brewed with wheat.' });
add('id', 'likely_gluten', 'flour / noodles / beer', words(['tepung', 'mie', 'bir', 'roti']).source, ['tepung', 'mie', 'roti'],
  { unlessSegment: NON_GLUTEN_QUALIFIERS });
add('id', 'ambiguous', 'flavouring / seasoning', words(['perisa', 'penyedap(?:\\s+rasa)?', 'ekstrak\\s+ragi']).source, ['perisa', 'penyedap rasa', 'ekstrak ragi']);

// ================================================================ VIETNAMESE (folded: lúa mì → lua mi)
add('vi', 'gluten', 'wheat', `lua\\s+mi${R}|bot\\s+mi${R}`, ['lúa mì', 'bột mì']);
add('vi', 'gluten', 'barley / rye', `lua\\s+mach`, ['lúa mạch', 'lúa mạch đen']);
add('vi', 'oats', 'oats', `yen\\s+mach`, ['yến mạch']);
add('vi', 'ambiguous', 'malt syrup', `mach\\s+nha`, ['mạch nha'], { note: 'Mạch nha can be barley malt or rice-based maltose.' });
add('vi', 'likely_gluten', 'soy sauce', `xi\\s+dau|nuoc\\s+tuong`, ['xì dầu', 'nước tương']);
add('vi', 'likely_gluten', 'beer', `${L}bia${R}`, ['bia']);

// ================================================================ JAPANESE
add('ja', 'ambiguous', 'maltose / miso / soba', '麦芽糖|味噌|みそ|そば|蕎麦', ['麦芽糖', '味噌', 'みそ', 'そば'],
  { note: 'Miso can be barley-based; soba noodles usually contain wheat.' });
add('ja', 'gluten', 'wheat', '小麦|小麥', ['小麦', '小麦粉', '一部に小麦・大豆を含む']);
add('ja', 'gluten', 'barley', '大麦|大麥|押麦|もち麦|ライ麦|麦みそ|麦味噌', ['大麦', '押麦', 'ライ麦']);
add('ja', 'gluten', 'malt', '麦芽|麥芽', ['麦芽', '麦芽エキス']);
add('ja', 'gluten', 'gluten / panko / wheat noodles', 'グルテン|パン粉|麩|うどん|ラーメン|そうめん|素麺|中華麺', ['グルテン', 'パン粉', 'うどん', '中華麺']);
add('ja', 'oats', 'oats', 'オーツ|オートミール|えん麦|燕麦|燕麥', ['オーツ麦', 'オートミール', '燕麦']);
add('ja', 'likely_gluten', 'soy sauce / oyster sauce / beer', '醤油|しょうゆ|しょう油|オイスターソース|ビール', ['醤油', 'しょうゆ', 'オイスターソース']);
add('ja', 'ambiguous', 'flavouring / yeast extract / seasoning', '香料|酵母エキス|調味料', ['香料', '酵母エキス', '調味料（アミノ酸等）']);

// ================================================================ CHINESE (simplified + traditional; 麦芽/小麦 handled above)
add('zh', 'ambiguous', 'maltodextrin / maltose', '麦芽糊精|麥芽糊精|麦芽糖浆|麥芽糖漿', ['麦芽糊精', '麦芽糖浆']);
add('zh', 'gluten', 'rye', '黑麦|黑麥', ['黑麦']);
add('zh', 'gluten', 'gluten / wheat gluten', '麸质|麩質|面筋|麵筋|谷朊|麸皮', ['麸质', '面筋', '麩質']);
add('zh', 'gluten', 'breadcrumbs', '面包糠|麵包糠|面包屑|麵包屑', ['面包糠']);
add('zh', 'likely_gluten', 'flour / noodles / bread', '面粉|麵粉|面条|麵條|面包|麵包', ['面粉', '麵粉', '面条']);
add('zh', 'likely_gluten', 'soy / oyster sauce / beer', '酱油|醬油|蚝油|蠔油|啤酒', ['酱油', '醬油', '蚝油']);
add('zh', 'ambiguous', 'flavouring / yeast extract / seasoning', '香精|酵母提取物|酵母抽提物|调味料|調味料', ['香精', '酵母提取物']);

// ================================================================ KOREAN
add('ko', 'ambiguous', 'maltose', '맥아당|물엿', ['맥아당', '물엿']);
add('ko', 'gluten', 'wheat', `밀가루|소맥분|${HL}소맥${HR}|${HL}밀${HR}`, ['밀가루', '소맥분', '밀, 대두 함유', '밀']);
add('ko', 'gluten', 'barley', `보리|호밀`, ['보리', '호밀', '보리차']);
add('ko', 'gluten', 'malt', '맥아', ['맥아', '맥아추출물']);
add('ko', 'gluten', 'gluten / breadcrumbs / wheat noodles', '글루텐|빵가루|라면|우동', ['글루텐', '빵가루', '라면']);
add('ko', 'oats', 'oats', '귀리|오트밀|오트', ['귀리', '오트밀']);
add('ko', 'likely_gluten', 'soy sauce / gochujang / doenjang / beer', '간장|고추장|된장|굴소스|맥주|국수', ['간장', '고추장', '된장', '굴소스'],
  { note: 'Korean soy sauce and pastes are usually made with wheat or barley.' });
add('ko', 'ambiguous', 'flavouring / yeast extract / seasoning', '향료|효모추출물|조미료', ['향료', '효모추출물']);

// ================================================================ THAI
add('th', 'gluten', 'wheat', 'สาลี', ['ข้าวสาลี', 'แป้งสาลี']);
add('th', 'gluten', 'barley / rye / malt', 'บาร์เลย์|ไรย์|มอลต์', ['ข้าวบาร์เลย์', 'ข้าวไรย์', 'มอลต์']);
add('th', 'gluten', 'gluten', 'กลูเตน', ['กลูเตน']);
add('th', 'oats', 'oats', 'โอ๊ต', ['ข้าวโอ๊ต']);
add('th', 'likely_gluten', 'soy sauce / oyster sauce / beer / bread', 'ซีอิ๊ว|ซอสถั่วเหลือง|ซอสหอยนางรม|เบียร์|ขนมปัง', ['ซีอิ๊ว', 'ซอสถั่วเหลือง', 'ซอสหอยนางรม']);
add('th', 'ambiguous', 'flavouring / seasoning', 'แต่งกลิ่น|ผงปรุงรส|วัตถุปรุงแต่งรส', ['แต่งกลิ่น', 'ผงปรุงรส']);

// ---------------------------------------------------------------- compile
const PHASE: Record<RuleCategory, number> = { exempt: 0, safe: 1, ambiguous: 2, gluten: 2, oats: 2, likely_gluten: 2 };

export const RULES: TermRule[] = specs
  .map((s, i) => ({
    id: s.id ?? `${s.lang}-${s.category}-${i}`,
    lang: s.lang,
    category: s.category,
    canonical: s.canonical,
    regex: new RegExp(s.pattern, 'gu'),
    examples: s.examples,
    unlessSegment: s.unlessSegment,
    note: s.note,
  }))
  // Stable sort by phase keeps declaration order within a phase.
  .map((r, i) => ({ r, i }))
  .sort((a, b) => PHASE[a.r.category] - PHASE[b.r.category] || a.i - b.i)
  .map(({ r }) => r);
