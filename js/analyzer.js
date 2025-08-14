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

// 文長に基づいた重み調整関数
function applyLengthBias(evidences, textLength) {
  const adjusted = { ...evidences };
  
  // 短い文の闾値設定
  const shortThreshold = 50;   // 50文字以下を短文と判定
  const veryShortThreshold = 20; // 20文字以下を非常に短い文と判定
  
  if (textLength <= veryShortThreshold) {
    // 非常に短い場合：基本暗号を大幅優先
    adjusted.caesar *= 2.0;
    adjusted.affine *= 1.8;
    adjusted.vigenere *= 0.3;  // 長い鍵が必要なため低下
    adjusted.playfair *= 0.4;
    adjusted.transposition *= 1.2; // シンプルな転置は可能
    if (adjusted.adfgx) adjusted.adfgx *= 0.2;
  } else if (textLength <= shortThreshold) {
    // 短い場合：基本暗号を適度優先
    adjusted.caesar *= 1.5;
    adjusted.affine *= 1.3;
    adjusted.vigenere *= 0.6;
    adjusted.playfair *= 0.7;
    adjusted.transposition *= 1.1;
    if (adjusted.adfgx) adjusted.adfgx *= 0.5;
  }
  
  // 証拠値が負にならないように下限を設定
  Object.keys(adjusted).forEach(key => {
    adjusted[key] = Math.max(0.001, adjusted[key]);
  });
  
  return adjusted;
}

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
    
    // シーザー暗号の検出を強化（より寛容な基準）
    const caesarScore = clamp01((100 - caesarRes.minChi2) / 100);
    // ICが英語的でシーザー的な場合のボーナス
    const ioc = results.stats.ioc || indexOfCoincidence(countLetters(sAZ), N);
    const iocBonus = (ioc > 0.06 && ioc < 0.08) ? 1.4 : 1.0;
    
    results.evidences.caesar = caesarScore * iocBonus;
    
    // アフィン暗号も同様にICボーナスを適用
    const affineScore = clamp01((100 - affineRes.minChi2) / 100);
    results.evidences.affine = affineScore * iocBonus;
    
    
    results.stats.caesarShift = caesarRes.shift;
    results.stats.affineParams = `a=${affineRes.a}, b=${affineRes.b}`;
  }

  // Vigenère
  if (useVigAutoKasiski || useVigColumns) {
    try {
      const vigRes = vigenereEvidence(sAZ, useVigAutoKasiski, useVigColumns);
      results.evidences.vigenere = vigRes.evidence;
      
      if (vigRes.info) {
        results.visualData.autocorrelation = vigRes.info.ac;
        results.visualData.gcdHistogram = vigRes.info.gcdHist;
        results.visualData.keyLength = vigRes.info.k;
        results.stats.vigKeyLength = vigRes.info.k;
      }
    } catch (error) {
      console.error('Error in Vigenère analysis:', error);
      results.evidences.vigenere = 0.1; // フォールバック値
    }
  }

  // Playfair（過剰検出を抑制）
  if (usePlayfair) {
    const playfairScore = playfairSuspicion(sAZ);
    
    // 統計的制約を追加
    const ioc = results.stats.ioc ? parseFloat(results.stats.ioc) : indexOfCoincidence(sAZ);
    const chi2 = results.stats.chi2 ? parseFloat(results.stats.chi2) : chiSquare(countLetters(sAZ), N);
    
    // プレイフェア暗号は単一換字式よりも高いIC値を持つ（2文字単位の処理のため）
    let iocBonus = 1.0;
    if (ioc >= 0.09 && ioc <= 0.11) {
      iocBonus = 1.4; // プレイフェア暗号の典型的なIC範囲（さらに狭く）
    } else if (ioc >= 0.08 && ioc <= 0.12) {
      iocBonus = 1.2; // やや広いプレイフェア暗号範囲
    } else if (ioc < 0.07 || ioc > 0.13) {
      iocBonus = 0.4; // プレイフェア暗号ではない可能性が高い範囲
    }
    
    const chi2Penalty = chi2 > 50000 ? 0.6 : chi2 > 10000 ? 0.8 : 1.0; // χ²値の閾値を調整
    const lengthPenalty = N < 200 ? 0.6 : 1.0;
    
    results.evidences.playfair = playfairScore * lengthPenalty * iocBonus * chi2Penalty;
  }

  // 転置式暗号
  if (useTransposition) {
    try {
      const chi2 = results.stats.chi2 ? parseFloat(results.stats.chi2) : chiSquare(countLetters(sAZ), N);
      const eng = results.stats.englishness ? parseFloat(results.stats.englishness) / 100 : englishnessScore(sAZ);
      results.evidences.transposition = englishnessVsTransposition(chi2, eng, sAZ);
    } catch (error) {
      console.error('Error in transposition analysis:', error);
      results.evidences.transposition = 0.1; // フォールバック値
    }
  }

  // ADFGX
  if (useADFGX) {
    const adfgxRes = adfgxDetector(sAZ);
    results.evidences.adfgx = adfgxRes.evidence;
    if (adfgxRes.info && adfgxRes.info.type) {
      results.stats.adfgxType = adfgxRes.info.type;
    }
  }

  // 文長に基づいた重み調整（短い文では基本的な暗号を優先）
  const lengthAdjustedEvidences = applyLengthBias(results.evidences, N);
  
  // 確率計算
  const evArr = Object.values(lengthAdjustedEvidences);
  const probs = softmax(evArr);
  const cipherTypes = Object.keys(lengthAdjustedEvidences);
  
  results.probabilities = {};
  cipherTypes.forEach((type, i) => {
    results.probabilities[type] = probs[i];
  });

  // もっとも可能性の高い暗号を特定
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