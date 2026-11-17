# GlutenLens

A phone app (PWA) that gives people with coeliac disease an honest gluten verdict from a food label photo, a barcode, a dish photo or a dish name. Read `SPEC.md` first; it is the source of truth for verdicts and rules.

## Repository layout

```
SPEC.md                 product spec: verdicts, rules, regions, safety invariants
engine/                 verdict engine — TypeScript, pure functions, no runtime deps (done)
  src/lexicon.ts        multilingual term rules (13 languages)
  src/statements.ts     statement segmentation, claims, negation
  src/label.ts          assessLabel()
  src/language.ts       language/script coverage cap
  src/barcode.ts        Open Food Facts adapter
  src/dish/             dish knowledge base, matchDish(), assessDish(), assessEstimatedDish()
  src/extraction/       vision prompts + JSON schemas for the app to send to the Claude API
  test/                 684 tests; invariants.test.ts generates cases from lexicon examples
app/                    PWA — React + Vite (steps 1–2 done: shell, settings, Claude API access)
  src/settings.ts       region/oats settings, localStorage, cautious fallbacks
  src/claude/           Claude API: connection (key or proxy), client, vision calls,
                        structured-output schema adapter, model-output validation, photo resizing
  src/screens/          Home, Settings (incl. Claude connection)
  src/pwa.ts            service worker registration + "new version" prompt
  scripts/icons.mjs     renders public/favicon.svg to the PNG icons (npm run icons -w app)
  test/                 app unit tests (vitest)
proxy/                  optional Cloudflare Worker that holds the API key (see proxy/README.md)
```

## Commands

```
npm install
npm test            # engine + app + proxy tests (vitest)
npm run typecheck   # tsc --noEmit, both workspaces
npm run dev         # app dev server, reachable from a phone on the same network
npm run build       # production PWA build → app/dist
npm run preview     # serve the build (service worker active)
```

Installing to the home screen and (later) camera access need HTTPS on a real phone; `localhost` is the only exemption. Use a tunnel or a static host for phone testing.

Claude API (step 2): `app/src/claude/vision.ts` has `extractLabel()`, `recognizeDish()` and `estimateDishIngredients()`. They send the engine's prompts with structured outputs (`claude-opus-5-5`, effort `medium`, server-side refusal fallback), then validate the JSON strictly; malformed output throws, it is never patched with defaults. The SDK is loaded lazily (`await import('../claude/client.ts')`) to keep the first screen small. SDK 1.x sends the key as `Authorization: Bearer`, which the proxy accepts. The key is never in the code: either the user pastes their own (localStorage) or uses the proxy with an access code.

Settings: default region starts as `OTHER` (most cautious) with `regionChosen: false` until the user picks one; the home screen nags until they do. Unknown or corrupt stored values fall back to the cautious default per field.

## Non-negotiable rules for changing the engine

1. **The rules engine decides every verdict.** The language model only transcribes labels, proposes dish names and estimates recipes for dishes outside the knowledge base. Never let model output set a verdict directly.
2. **Never weaken a safety invariant** (SPEC §7) to make a test pass. If a test fails, the engine is wrong until proven otherwise.
3. **Every real-world miss becomes a test.** Add the missed form to the rule's `examples` in `lexicon.ts` (this auto-generates invariant tests) and add the anonymised label to `test/labels.test.ts`.
4. **Err toward caution.** A false alarm is acceptable; a false "safe" is not. Uncertainty resolves to `cannot_verify`, never to a positive verdict.
5. **Dish verdicts never say "safe".** Estimated dishes never return `usually_gluten_free`.
6. Lexicon patterns are written for folded text (lowercase, Latin accents stripped): `blé` → `ble`. Rule order matters: exempt → safe → everything else, specific before general.

## Next: build the app (`app/`)

Stack: React + Vite + TypeScript PWA, importing `@glutenlens/engine` from the workspace. Barcode scanning with ZXing (`@zxing/browser`). Mobile-first.

Build in this order, testing each step on a real phone:

1. ✅ **App shell.** Vite PWA (installable, works on iOS Safari and Android Chrome). Settings screen: default region (AU, NZ, CA, US, EU, UK, Other), oats setting. Store settings locally.
2. ✅ **Claude API access.** The API key must not be shipped in client code. For personal use, either a tiny proxy (e.g. a Cloudflare Worker holding the key) or a key the user pastes into settings and keeps in local storage. Check the current Claude API docs for model names, vision input, structured output and browser-access requirements before writing this.
3. **Label flow.** Camera capture → send the photo with `LABEL_EXTRACTION_PROMPT` / `LABEL_EXTRACTION_SCHEMA` → show the extracted text for the user to confirm or edit → `assessLabel({ text: extractionToText(e), region, language: e.language, certificationMark: e.certificationMark, extraction: { confidence, userConfirmed: true, ingredientsFound } })`.
4. **Barcode flow.** Scan → `lookupBarcode()` → `assessLabel(lookup.input)`. If `needsLabelPhoto`, offer the label flow. "Not found" → offer the label flow.
5. **Dish flow.** Photo → `DISH_RECOGNITION_PROMPT` → `matchDish(candidates)` → user picks → `assessDish()`. Typed name → `matchDish(name)` → user picks. No match → ask the model for `typicalIngredients` → `assessEstimatedDish()`, clearly labelled as estimated.
6. **Verdict screens.** Large plain verdict, colour plus icon plus text (never colour alone). Label: quoted evidence (`findings` with effect ≠ none), reasons, caveats. Dish: typical ingredients with likelihood, questions to ask. `cannot_verify` must look clearly different from the positive verdicts.
7. **Travel card.** A translated "I have coeliac disease, I cannot eat wheat, barley, rye…" card for the restaurant flow. Have translations checked by native speakers or Coeliac Australia/Coeliac UK resources; don't ship unchecked machine translations as safety text.
8. **Real-product test.** Run 50+ known products through the app with the person who has coeliac disease. Count false "safe" results; the target is zero. Each miss → a test (rule 3).

## Known limitations

- Words split by OCR ("w heat") aren't matched; the confirm-text step is the guard.
- Japanese, Korean and Thai precautionary statements that name the allergen before the keyword are scoped to their clause; a run-together label can read an allergen as an ingredient (a false alarm, not a false "safe").
- No region model for Japan, Korea or others yet (they use `OTHER`, the most conservative).
- The dish knowledge base (~100 dishes) describes common recipes and should be reviewed by the person who has coeliac disease.
