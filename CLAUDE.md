# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cipher Clairvoyance** is a classical cipher identification and visualization web tool (Day044 of the "生成AIで作るセキュリティツール100" project). It's a client-side educational tool that analyzes ciphertext to identify which classical cipher method was likely used.

## Development Commands

Static web application with no build process. ES6 modules require a server:

```bash
# Recommended: Use a local server (ES6 modules require this)
python -m http.server 8000
# or
npx serve .

# Then open http://localhost:8000 in browser
```

## Architecture

### ES6 Module Structure (`js/`)

| Module | Responsibility |
|--------|---------------|
| **app.js** | Entry point, event listeners, modal management |
| **analyzer.js** | Main analysis pipeline, evidence aggregation, softmax normalization |
| **analyzers.js** | Individual cipher detection algorithms (Caesar, Affine, Vigenère, Playfair, etc.) |
| **ui.js** | DOM manipulation, result rendering, input validation |
| **visualization.js** | SVG chart generation (frequency, autocorrelation, GCD histogram) |
| **evidence.js** | Judgment reason generation, confidence calculation |
| **utils.js** | Statistical functions (IC, χ², englishness), string utilities |
| **config.js** | Constants (English letter frequencies, cipher descriptions) |
| **samples.js** | 8 sample ciphertexts with masked key info |
| **help-content.js** | Dynamic help modal HTML content |

### Data Flow

1. **Input** → `app.js` validates and passes to `analyzer.js`
2. **Analysis** → `analyzer.js` orchestrates calls to `analyzers.js` functions
3. **Evidence** → Each cipher detector returns evidence scores (0-1)
4. **Normalization** → Softmax converts evidences to probabilities
5. **Display** → `ui.js` renders results, `visualization.js` creates charts

### Key Analysis Functions in `analyzers.js`

- `bestCaesarShiftChi2()` - Brute force all 26 shifts, return best χ²
- `bestAffineChi2()` - Try all valid (a,b) pairs for affine cipher
- `vigenereEvidence()` - Autocorrelation + Kasiski method for key length
- `playfairSuspicion()` - Even length, J-absence, X-padding detection
- `adfgxDetector()` - Character set analysis for ADFGX/ADFGVX

## Testing

Manual testing via sample ciphertexts (dropdown in UI):
1. Load sample → verify correct cipher identification
2. Check visualizations render properly
3. Test interactive features (autocorrelation bar clicks, n-gram highlighting)

## Deployment

GitHub Pages: https://ipusiron.github.io/cipher-clairvoyance/
Auto-deploys on push to main branch.