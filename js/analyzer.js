// メイン解析処理

import { CIPHER_DESCRIPTIONS } from './config.js';
import { 
  toAZ, countLetters, chiSquare, indexOfCoincidence, 
  englishnessScore, softmax, clamp01 
} from './utils.js';
import {
  bestCaesarShiftChi2, bestAffineChi2, playfairSuspicion,
  englishnessVsTransposition, adfgxDetector, vigenereEvidence
} from './analyzers.js';

// テキスト解析のメイン関数
export function analyzeText(orig, opts={}) {
  const stripNonLetters = opts.stripNonLetters !== false;
  const useBasic = opts.basic !== false;
  const useCaesarAffine = opts.caesarAffine !== false;
  const useVigAutoKasiski = opts.vigAutoKasiski !== false;
  const useVigColumns = opts.vigColumns !== false;
  const usePlayfair = opts.playfair !== false;
  const useTransposition = opts.transposition !== false;
  const useADFGX = opts.adfgx !== false;

  const sAZ = toAZ(orig);
  const N = sAZ.length;
  
  if (N === 0) {
    return {
      success: false,
      error: "暗号文に英字が含まれていません",
      results: []
    };
  }

  const results = {
    text: sAZ,
    length: N,
    evidences: {},
    stats: {},
    visualData: {}
  };

  // 基本統計
  if (useBasic) {
    const freq = countLetters(sAZ);
    const chi2 = chiSquare(freq, N);
    const ioc = indexOfCoincidence(sAZ);
    const eng = englishnessScore(sAZ);
    
    results.stats = {
      ioc: ioc.toFixed(4),
      chi2: chi2.toFixed(1),
      englishness: (eng * 100).toFixed(0) + "%",
      length: N,
      uniqueChars: new Set(sAZ).size
    };
    
    results.visualData.frequencies = freq;
    results.evidences.substitution = clamp01((30 - chi2) / 30) * 0.5;
  }

  // Caesar/Affine
  if (useCaesarAffine) {
    const caesarRes = bestCaesarShiftChi2(sAZ);
    const affineRes = bestAffineChi2(sAZ);
    
    results.evidences.caesar = clamp01((30 - caesarRes.minChi2) / 30);
    results.evidences.affine = clamp01((30 - affineRes.minChi2) / 30);
    
    results.stats.caesarShift = caesarRes.shift;
    results.stats.affineParams = `a=${affineRes.a}, b=${affineRes.b}`;
  }

  // Vigenère
  if (useVigAutoKasiski || useVigColumns) {
    const vigRes = vigenereEvidence(sAZ, useVigAutoKasiski, useVigColumns);
    results.evidences.vigenere = vigRes.evidence;
    
    if (vigRes.info) {
      results.visualData.autocorrelation = vigRes.info.ac;
      results.visualData.gcdHistogram = vigRes.info.gcdHist;
      results.visualData.keyLength = vigRes.info.k;
      results.stats.vigKeyLength = vigRes.info.k;
    }
  }

  // Playfair
  if (usePlayfair) {
    results.evidences.playfair = playfairSuspicion(sAZ);
  }

  // 転置暗号
  if (useTransposition) {
    const chi2 = results.stats.chi2 ? parseFloat(results.stats.chi2) : chiSquare(countLetters(sAZ), N);
    const eng = results.stats.englishness ? parseFloat(results.stats.englishness) / 100 : englishnessScore(sAZ);
    results.evidences.transposition = englishnessVsTransposition(chi2, eng);
  }

  // ADFGX
  if (useADFGX) {
    const adfgxRes = adfgxDetector(sAZ);
    results.evidences.adfgx = adfgxRes.evidence;
    if (adfgxRes.info && adfgxRes.info.type) {
      results.stats.adfgxType = adfgxRes.info.type;
    }
  }

  // 確率計算
  const evArr = Object.values(results.evidences);
  const probs = softmax(evArr);
  const cipherTypes = Object.keys(results.evidences);
  
  results.probabilities = {};
  cipherTypes.forEach((type, i) => {
    results.probabilities[type] = probs[i];
  });

  // 最も可能性の高い暗号を特定
  const maxProb = Math.max(...probs);
  const winnerIndex = probs.indexOf(maxProb);
  const winnerType = cipherTypes[winnerIndex];
  
  results.winner = {
    type: winnerType,
    probability: maxProb,
    description: CIPHER_DESCRIPTIONS[winnerType] || CIPHER_DESCRIPTIONS.unknown
  };

  return {
    success: true,
    results
  };
}