# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cipher Clairvoyance** is a classical cipher identification and visualization web tool (Day044 of the "生成AIで作るセキュリティツール100" project). It's a client-side educational tool that analyzes ciphertext to identify which classical cipher method was likely used, supporting Caesar, Affine, Playfair, Vigenère, transposition ciphers, and ADFGX(VX).

## Architecture

### Single-Page Application
- **index.html**: Main HTML structure with input controls, visualization containers, and result display areas
- **script.js**: Core JavaScript implementation containing all cipher analysis algorithms, visualization code, and UI interactions
- **style.css**: CSS styling for the application interface
- **assets/**: Contains screenshots and other static assets

### Key Components in script.js

1. **Configuration & Constants** (lines 1-24)
   - English letter frequencies, common bigrams/trigrams
   - Sample ciphertexts for demonstration

2. **Core Analysis Functions** (lines 26-250)
   - Statistical analysis: IC, Chi-square, englishness scoring
   - Cipher-specific detection: Caesar/Affine brute force, Vigenère period detection (autocorrelation, Kasiski)
   - Column analysis for Vigenère with IC and Caesar shift estimation

3. **Visualization System** (lines 250-450)
   - SVG-based charts: frequency comparison, autocorrelation, GCD histogram, column IC heatmap
   - Interactive Kasiski n-gram table with highlighting
   - Vigenère lab for column-by-column analysis

4. **Main Analysis Pipeline** (lines 450-600)
   - Evidence collection from multiple detection methods
   - Softmax normalization for probability display
   - Result presentation with confidence rings

## Development Commands

This is a static web application with no build process required. To develop:

```bash
# Open directly in browser (no server required for basic functionality)
start index.html

# For development with live reload, use any static server:
python -m http.server 8000
# or
npx serve .
```

## Key Implementation Details

- **Language**: Pure JavaScript (ES6+), no external dependencies
- **Cipher Detection**: Heuristic-based with evidence scoring
- **Visualization**: Native SVG generation for all charts
- **Supported Ciphers**: 
  - Substitution: Caesar, Affine
  - Polygraphic: Playfair
  - Polyalphabetic: Vigenère
  - Transposition: Columnar, Rail Fence (detection only)
  - Other: ADFGX/ADFGVX, Baconian, Polybius, Nihilist

## Testing Approach

Manual testing using the built-in sample ciphertexts. Load samples via the dropdown and verify:
1. Correct cipher type identification
2. Proper visualization rendering
3. Interactive features (clicking autocorrelation bars, Kasiski n-grams)

## GitHub Pages Deployment

The project is configured for GitHub Pages deployment at https://ipusiron.github.io/cipher-clairvoyance/
No build step required - pushes to main branch automatically deploy.