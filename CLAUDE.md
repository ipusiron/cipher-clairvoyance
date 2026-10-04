# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cipher Clairvoyance** (Day044 of "生成AIで作るセキュリティツール100") identifies which classical cipher was used on English text. It is a static, client-side web tool with no build step and no runtime dependencies.

- Classes: plaintext, Caesar, Affine, simple substitution, Vigenère, Autokey, Playfair, Bifid, Hill 2x2, transposition (statistical model), ADFGX/ADFGVX (character-set rule) and Polybius (digits 1-5, decoded with the standard square and then classified).
- Vigenère vs Autokey vs Hill: with 50+ letters all three are trial-decrypted and the most English-like result wins (`decide.js`). The evaluation in `tools/build-model.mjs` runs through the same `decide` function.
- The verdict comes from a Gaussian/Bernoulli naive Bayes model per length bucket (20–49, 50–99, 100–199, 200–399, 400+ letters) over 10 explainable features.
- The UI shows the measured precision for the verdict in that length bucket (from `MODEL.evaluation`), never the model's posterior probability.

## Commands

```bash
npm test                              # node:test, Node 22+, no dependencies
node tools/build-model.mjs            # regenerate js/model.js (deterministic, seed 20261002)
node tools/build-model.mjs --check    # fail if js/model.js is out of date (run by the tests)
node tools/build-samples.mjs          # regenerate js/samples.js
node tools/build-samples.mjs --check
python -m http.server 8000            # serve locally; file:// cannot load ES modules in Chrome/Edge
```

## Architecture (`js/`)

| Module | Responsibility |
|--------|---------------|
| cipher-core.js | Reference implementations of the ciphers (used for training data, samples and tests) |
| features.js | The 10 features (IC, χ² per letter, best shift/affine χ², periodic IC gain, bigram score, doubled pairs, distinct letters, even length, J present) |
| classifier.js | Naive Bayes scoring, close-call margin (3), decisive features (log-likelihood difference ≥ 1) |
| keylength.js | Vigenère key length candidates (smallest period with mean column IC ≥ 0.058) and Kasiski counts |
| decide.js | Model ranking plus the Vigenère/Autokey second stage |
| solver.js | Trial decryption: Caesar, Affine, Vigenère/Beaufort-type, Autokey, Hill 2x2 (scored by English bigram log-probability) |
| links.js | Related tools and pass-the-ciphertext links (Day009/017/030/046/047 via query, Day043 via fragment; Day047 opens `tab=advanced`; AlphaLoom gets no `n`) |
| analysis.js | Input inspection (errors vs notes) and the full analysis result; returns message keys, not text |
| model.js | Generated model (do not edit by hand) |
| samples.js | Generated samples (do not edit by hand) |
| messages.js | All UI strings in Japanese and English (same keys and placeholders, tested). Logic modules must not contain Japanese string literals (tested) |
| i18n.js | Language choice (?lang=ja|en, then the saved choice, then navigator.language) and data-i18n / data-i18n-attr replacement in index.html |
| app.js / ui.js / visualization.js | Events, modals, rendering. User input is shown only via textContent |
| theme-init.js / theme.js | Theme applied before CSS; light/dark toggle; works without Storage |
| file-check.js | Shows a notice when opened via file:// and the app did not start |

## Rules

- Keep the model and samples generated: change `tools/` and regenerate, then run `npm test`.
- Training text (`tools/corpus/train-pg1342.txt`) and evaluation text (`tools/corpus/eval-pg98.txt`) must stay separate.
- CSP has no `'unsafe-inline'`: do not add inline scripts, `style` attributes or inline event handlers.
- README.md and README.en.md keep the same headings; their accuracy tables are checked against `js/model.js` by `test/readme.test.js`.

## Deployment

GitHub Pages: https://ipusiron.github.io/cipher-clairvoyance/ (legacy build from `main`, `/`).
