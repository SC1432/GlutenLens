# GlutenLens — Specification

Version 0.1 · November 2026

## 1. Outcome

A person with coeliac disease points their phone at a food and gets an honest gluten verdict in seconds, with the evidence that produced it.

- **Packaged food:** they photograph the label (any supported language) or scan the barcode. They get one of five label verdicts. Each verdict quotes the label text that caused it.
- **Unpackaged food or a restaurant dish:** they photograph the dish or type its name. They confirm which dish it is and get one of four dish verdicts, based on the dish's typical ingredients. Each risky ingredient comes with a question to ask the kitchen.

The app never presents missing information as safety. A dish verdict never says "safe", because a photo or a name can't show what a particular kitchen did.

**Acceptance bar:** zero false "safe" results (`no_gluten_ingredients` or `gluten_free_claim`) on a test set of at least 50 real products whose status is already known. Every miss becomes a permanent regression test.

## 2. Input modes

| Mode | User action | Data path | Verdict family |
|---|---|---|---|
| Label photo | Photograph ingredients, allergen statement, claims | Vision model transcribes → user confirms text → **label engine** | Label |
| Barcode | Scan barcode | Open Food Facts lookup → **label engine** (basis: database) | Label |
| Dish photo | Photograph a meal or food | Vision model proposes dish names → user picks one → **dish engine** | Dish |
| Dish name | Type a dish name | Fuzzy match against dish knowledge base → user picks one → **dish engine** | Dish |

The user always confirms before a verdict is shown. That means confirming the extracted label text for labels, and the dish identity for dishes. The rules engine decides every verdict; the language model only transcribes, translates and proposes candidates.

## 3. Label verdicts

Listed from most to least severe. The most severe applicable verdict wins.

| Verdict | Shown as | Meaning |
|---|---|---|
| `contains_gluten` | **Contains gluten** | A gluten source (or oats, if the user avoids oats) is listed in the ingredients or a "contains" statement. A term that is usually gluten-based (e.g. soy sauce) in a jurisdiction that doesn't force declaration also lands here, marked as "likely". |
| `may_contain` | **May contain gluten** | A precautionary statement ("may contain", "made on equipment that also processes", "traces of") names a gluten source. These statements are voluntary everywhere, so their absence proves nothing. |
| `cannot_verify` | **Can't verify** | Something prevents a confident answer: unreadable or unconfirmed text, no ingredient list, a language or script the engine doesn't cover, ingredients whose source isn't declared, oats not stated as gluten-free, "gluten-free wheat starch", or stale database data. |
| `no_gluten_ingredients` | **No gluten ingredients found** | The full ingredient list was read and no gluten source was found, but the product makes no gluten-free claim. It may still have cross-contact. |
| `gluten_free_claim` | **Labelled gluten-free** | A gluten-free claim or certification mark, with nothing on the label contradicting it. Its meaning depends on region (see §5). |

Every result carries: `verdict`, `headline`, `reasons[]`, `findings[]` (term, category, statement type, excerpt from the original text), `claim` (if any), `caveats[]`, `region`, and `basis` (`label` or `database`).

## 4. Dish verdicts

| Verdict | Shown as | Rule |
|---|---|---|
| `likely_contains` | **Usually contains gluten** | At least one typical ingredient is *always* gluten-based (wheat noodles, batter, bread, roux). |
| `ask_first` | **Often has hidden gluten — ask first** | Typical ingredients include something *often* or *sometimes* gluten-based (soy sauce, oyster sauce, gravy, shared fryer). |
| `usually_gluten_free` | **Usually made without gluten — confirm with the kitchen** | No typical ingredient is gluten-based. Cross-contact questions are still shown. |
| `unknown` | **Can't assess this dish** | The dish isn't in the knowledge base, and no gluten source appears in an AI-estimated recipe. |

Dish results list the dish's typical ingredients with a gluten likelihood for each (`always`, `often`, `sometimes`, `none`). They also give a deduplicated list of questions to ask, and always include a cross-contact question.

**Dishes outside the knowledge base:** the vision or language model may supply an *estimated* typical ingredient list. The engine runs those names through the same multilingual lexicon. The result is marked as estimated, can be at most `ask_first` or `likely_contains`, and is never `usually_gluten_free`.

## 5. Rules

### 5.1 Term categories

| Category | Examples | Effect |
|---|---|---|
| `gluten` | wheat, barley, rye, spelt, malt, semolina, couscous, bulgur, seitan, rusk, brewer's yeast, panko, atta, Weizen, blé, trigo, 小麦, 밀가루, ข้าวสาลี, terigu | `contains_gluten` |
| `oats` | oats, avoine, Hafer, avena, 燕麦, 귀리, ข้าวโอ๊ต | Depends on the oats setting (§5.3) |
| `likely_gluten` | soy sauce, oyster sauce, hoisin, teriyaki, kecap manis, gochujang, unqualified "flour", "noodles", "pasta", "breadcrumbs", beer | In regions with mandatory gluten declaration and no wheat declared anywhere on the label: `cannot_verify`. Elsewhere: `contains_gluten` ("likely"). |
| `ambiguous` | flavour/flavouring, yeast extract, modified starch, seasoning, stock, maltose syrup, tamari, soba | Only matters where the region doesn't force declaration of every gluten cereal (see §5.4). There it gives `cannot_verify`. |
| `exempt` | glucose syrup (wheat), wheat dextrose, wheat maltodextrin | Gluten is processed out. Note only in AU/NZ/EU/UK, where the exemption is codified; `cannot_verify` elsewhere. |
| safe overrides | buckwheat, blé noir, blé d'Inde (Québec: corn), trigo sarraceno, grano saraceno, Buchweizen, そば粉, maltodextrin/maltose/maltitol (not "malt"), "wheat-free" | Masked before matching, so "buckwheat" never matches "wheat". |

### 5.2 Statement types

The text is split into statements, and each term's effect depends on the statement it appears in:

- **ingredients** (default) and **contains** ("Contains:", "Allergens:", "enthält", "contient", "一部に…を含む", "함유") → a term counts as present.
- **may contain** ("may contain", "traces", "same facility/equipment/line", "peut contenir", "kann Spuren", "puede contener", "può contenere", "pode conter", "工場", "제조시설", "可能含有") → `may_contain`.
- **free-from** ("free from", "does not contain", "frei von", "libre de", "não contém", "不含") → gluten terms are negated. A negated "gluten" counts as a gluten-free claim; a negated "wheat" doesn't (barley and rye remain possible). Short negators ("sin", "sans", "ohne", "no") only negate the word directly after them, so "harina de trigo sin blanquear" (unbleached wheat flour) still contains gluten.

**Qualified terms:** a gluten-free phrase directly attached to an ingredient, such as "gluten-free oats" or "wheat starch (gluten-free)", qualifies only that ingredient. It is not counted as a product claim. Qualified oats are handled by the oats setting. Any other qualified gluten source gives `cannot_verify`.

### 5.3 Oats

User setting `oats`:

- `avoid` (default, matching Australian practice): any oats → `contains_gluten` (oats).
- `gluten_free_oats_ok`: qualified oats are fine. Unqualified oats are fine only when the product carries a gluten-free claim in a region whose claim permits only gluten-free oats (CA, US, EU, UK). Otherwise `cannot_verify`.

In AU/NZ a gluten-free claim cannot legally include oats, so oats plus a claim on an AU/NZ label is flagged as a contradiction.

### 5.4 Regions

`region` is the jurisdiction of the label, normally the country where the product is bought. It defaults to a user setting.

| Region | Gluten-free claim means | Mandatory declaration of gluten sources | `ambiguous` terms |
|---|---|---|---|
| AU, NZ | No detectable gluten; no oats; no malted gluten cereals (FSANZ 1.2.7) | Wheat, rye, barley, oats, spelt (FSANZ 1.2.3, PEAL) | Ignored |
| CA | Under ~20 ppm; specially produced gluten-free oats allowed | Wheat, rye, barley, oats, triticale | Ignored |
| EU, UK | Under 20 ppm; gluten-free oats allowed | Cereals containing gluten | Ignored |
| US | Under 20 ppm; gluten-free oats allowed | Wheat only (FALCPA). Barley and rye can hide in "flavor" or "yeast extract" | `cannot_verify` |
| OTHER | Unknown enforcement — the claim is noted but can't override ambiguity | Unknown | `cannot_verify` |

### 5.5 Language coverage cap

Supported: English, French, Spanish, Italian, German, Dutch, Portuguese, Indonesian/Malay, Vietnamese, Japanese, Chinese, Korean, Thai.

If the label is in an unsupported language or script, or the engine can't confirm that a Latin-script label is in a supported language, the best possible verdict is `cannot_verify`. An absent match in a language the lexicon can't read is not evidence of safety. This is the main protection against false "safe" results when travelling.

### 5.6 Extraction quality cap

If the user hasn't confirmed the extracted text, extraction confidence is low, or no ingredient list was found, then a positive verdict is capped at `cannot_verify`. `contains_gluten` and `may_contain` are still shown, since a false alarm is acceptable.

Exception: a gluten-free claim with no ingredient list (for example a single-ingredient product) in AU/NZ/CA/EU/UK/US can still give `gluten_free_claim`.

### 5.7 Database basis (barcode)

Open Food Facts data is crowd-sourced. For a database-based verdict:

- Incomplete ingredients (`ingredients-to-be-completed`, empty text) → `cannot_verify`.
- Data last edited more than three years ago → `cannot_verify` (recipes change).
- Allergen tag `en:gluten` → `contains_gluten`. Trace tag `en:gluten` → `may_contain`. Label tag `en:gluten-free` / `en:no-gluten` → gluten-free claim.
- Positive verdicts are marked "From a product database — check the label" and ask for a label photo.

## 6. Architecture

```
app (PWA, React + Vite)         ← built in Claude Code
 ├─ camera / barcode (ZXing)
 ├─ extraction (Claude vision API, structured JSON; prompts in engine/src/extraction)
 ├─ confirm screens
 └─ verdict screens
engine (TypeScript, no runtime deps, pure functions)   ← this session
 ├─ fold.ts         text folding with index map back to original
 ├─ lexicon.ts      multilingual term rules
 ├─ statements.ts   statement segmentation, claims, negation, qualifiers
 ├─ language.ts     coverage cap
 ├─ label.ts        assessLabel()
 ├─ barcode.ts      Open Food Facts → LabelInput
 ├─ dish/           knowledge base, matching, assessDish()
 └─ extraction/     vision prompts and JSON schemas for the app to use
```

The engine has no network access and no randomness, so every verdict is reproducible from its input.

## 7. Safety invariants (enforced by tests)

1. Every `gluten` rule's example forms yield `contains_gluten`, in ingredient-list and "contains" positions, in every region.
2. Every such form inside a may-contain statement yields at least `may_contain`.
3. Text in an unsupported script never yields a positive verdict.
4. Unconfirmed or low-confidence extraction never yields a positive verdict.
5. A dish verdict is never "safe", and an estimated dish is never `usually_gluten_free`.
6. A gluten source anywhere on a label beats any gluten-free claim.

## 8. Non-goals (v1)

- Calculating ppm or a risk percentage.
- Judging a particular restaurant's preparation.
- Medical advice. Non-coeliac allergens beyond gluten sources.
- Offline label reading (later; on-device OCR).

## 9. To review with the user

- Default oats setting (`avoid`) and default region.
- Whether `may_contain` should be shown as "avoid" (red) or "caution" (amber).
- The dish knowledge base: dishes she eats often or has been caught out by.
- Additional travel languages.
