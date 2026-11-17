# GlutenLens

Gluten verdicts for people with coeliac disease, from a food label photo, a barcode, a dish photo or a dish name.

- **Labels and barcodes** get one of five verdicts: *Contains gluten*, *May contain gluten*, *Can't verify*, *No gluten ingredients found*, *Labelled gluten-free*. Each verdict quotes the label text that caused it.
- **Dishes** get one of four: *Usually contains gluten*, *Often has hidden gluten — ask first*, *Usually made without gluten — confirm with the kitchen*, *Can't assess*. Each comes with the questions to ask.

The app never presents missing information as safety. See [SPEC.md](SPEC.md) for the rules and [CLAUDE.md](CLAUDE.md) for development notes.

**Status:** the verdict engine (`engine/`) is built and tested (13 languages; AU, NZ, CA, US, EU and UK labelling rules). The phone app (`app/`) has its installable shell, settings screen and Claude API connection (your own key, or the optional proxy in `proxy/`); the label, barcode and dish flows are next.

```
npm install && npm test
```

Not medical advice. Always check the physical label, and ask when eating out.
