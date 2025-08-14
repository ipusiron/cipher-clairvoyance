// 解析根拠生成機能

import { clamp01 } from './utils.js';

// 各暗号方式の判定根拠を生成
export function generateEvidence(results) {
  const evidences = [];
  const winner = results.winner;
  const stats = results.stats;
  const visualData = results.visualData;

  // 基本統計に基づく根拠
  if (stats) {
    const ioc = parseFloat(stats.ioc);
    const chi2 = parseFloat(stats.chi2);
    const engPercent = parseInt(stats.englishness);

    evidences.push({
      type: 'statistical',
      title: '統計的特徴',
      items: [
        {
          metric: 'IoC (一致指数)',
          value: stats.ioc,
          analysis: getIoCAnalysis(ioc),
          confidence: getIoCConfidence(ioc)
        },
        {
          metric: 'χ² 統計量',
          value: stats.chi2,
          analysis: getChi2Analysis(chi2),
          confidence: getChi2Confidence(chi2)
        },
        {
          metric: '英語らしさ',
          value: stats.englishness,
          analysis: getEnglishnessAnalysis(engPercent),
          confidence: getEnglishnessConfidence(engPercent)
        }
      ]
    });
  }

  // 勝者暗号の特定根拠
  evidences.push({
    type: 'cipher-specific',
    title: `${winner.type.charAt(0).toUpperCase() + winner.type.slice(1)}暗号の判定根拠`,
    items: getCipherSpecificEvidence(winner.type, results)
  });

  // 除外された暗号の理由
  const excludedCiphers = getExcludedCiphers(results);
  if (excludedCiphers.length > 0) {
    evidences.push({
      type: 'excluded',
      title: '除外された暗号とその理由',
      items: excludedCiphers
    });
  }

  return evidences;
}

// IoC分析
function getIoCAnalysis(ioc) {
  if (ioc > 0.06) return '英語の標準値(0.066)に近く、単一置換暗号の可能性が高い';
  if (ioc > 0.04) return '英語より低く、多表式暗号や転置暗号の可能性';
  return '非常に低く、複雑な暗号化または非英語テキストの可能性';
}

function getIoCConfidence(ioc) {
  return Math.abs(ioc - 0.066) < 0.01 ? 'high' : 
         Math.abs(ioc - 0.066) < 0.02 ? 'medium' : 'low';
}

// χ²分析
function getChi2Analysis(chi2) {
  if (chi2 < 20) return '英語の文字頻度に非常に近く、単一置換暗号の可能性が高い';
  if (chi2 < 50) return '英語の文字頻度にやや近く、単純な暗号の可能性';
  if (chi2 < 100) return '英語の文字頻度から乖離、複雑な暗号の可能性';
  return '英語の文字頻度から大きく乖離、転置暗号や多表式暗号の可能性';
}

function getChi2Confidence(chi2) {
  return chi2 < 30 ? 'high' : chi2 < 70 ? 'medium' : 'low';
}

// 英語らしさ分析
function getEnglishnessAnalysis(percent) {
  if (percent > 80) return '非常に英語らしく、転置暗号の可能性が高い';
  if (percent > 50) return 'やや英語らしく、部分的に復号済みまたは転置暗号';
  if (percent > 20) return '英語らしさが低く、置換暗号の可能性';
  return '英語らしさが非常に低く、強力な置換暗号または多表式暗号';
}

function getEnglishnessConfidence(percent) {
  return percent > 70 ? 'high' : percent > 40 ? 'medium' : 'low';
}

// 暗号特有の根拠
function getCipherSpecificEvidence(cipherType, results) {
  const items = [];
  const prob = Math.round(results.probabilities[cipherType] * 100);

  switch (cipherType) {
    case 'caesar':
      items.push({
        evidence: 'シーザー暗号の特徴',
        description: `シフト量${results.stats.caesarShift}で最も良い統計値を示した`,
        strength: prob > 70 ? 'strong' : prob > 40 ? 'medium' : 'weak'
      });
      if (results.stats.chi2 && parseFloat(results.stats.chi2) < 30) {
        items.push({
          evidence: '文字頻度パターン',
          description: '単一シフト後の文字頻度が英語に一致',
          strength: 'strong'
        });
      }
      break;

    case 'affine':
      items.push({
        evidence: 'アフィン暗号の特徴',
        description: `パラメータ${results.stats.affineParams}で最適な復号結果`,
        strength: prob > 70 ? 'strong' : prob > 40 ? 'medium' : 'weak'
      });
      break;

    case 'vigenere':
      if (results.stats.vigKeyLength) {
        items.push({
          evidence: '周期性検出',
          description: `鍵長${results.stats.vigKeyLength}の周期性を確認`,
          strength: 'strong'
        });
      }
      if (results.visualData.autocorrelation) {
        const maxAC = Math.max(...results.visualData.autocorrelation);
        if (maxAC > 0.05) {
          items.push({
            evidence: '自己相関ピーク',
            description: `位置${results.visualData.autocorrelation.indexOf(maxAC) + 1}で強い相関`,
            strength: 'strong'
          });
        }
      }
      break;

    case 'playfair':
      items.push({
        evidence: 'プレイフェアの特徴',
        description: '偶数長、同字ペアの少なさ、X文字の偏在を確認',
        strength: prob > 60 ? 'strong' : 'medium'
      });
      if (results.length % 2 === 0) {
        items.push({
          evidence: '偶数長テキスト',
          description: 'プレイフェア暗号は必ず偶数長になる',
          strength: 'medium'
        });
      }
      break;

    case 'transposition':
      if (results.stats.englishness && parseInt(results.stats.englishness) > 60) {
        items.push({
          evidence: '高い英語らしさ',
          description: '転置暗号は元の文字頻度を保持する',
          strength: 'strong'
        });
      }
      break;

    case 'adfgx':
      items.push({
        evidence: 'ADFGX文字集合',
        description: 'テキストがADFGX(V)文字のみで構成',
        strength: 'very_strong'
      });
      if (results.length % 2 === 0) {
        items.push({
          evidence: '偶数長要件',
          description: 'ADFGX暗号は座標ペアで偶数長になる',
          strength: 'strong'
        });
      }
      break;

    default:
      items.push({
        evidence: '統計的判定',
        description: `他の暗号方式より${prob}%の確率で一致`,
        strength: prob > 70 ? 'strong' : prob > 40 ? 'medium' : 'weak'
      });
  }

  return items;
}

// 除外された暗号の理由
function getExcludedCiphers(results) {
  const excluded = [];
  const sortedProbs = Object.entries(results.probabilities)
    .sort((a, b) => b[1] - a[1])
    .slice(1); // 勝者以外

  sortedProbs.forEach(([type, prob]) => {
    const percentage = Math.round(prob * 100);
    if (percentage < 20) {
      excluded.push({
        cipher: type.charAt(0).toUpperCase() + type.slice(1),
        reason: getExclusionReason(type, results),
        probability: percentage
      });
    }
  });

  return excluded.slice(0, 3); // 上位3つの除外理由
}

// 除外理由の生成
function getExclusionReason(cipherType, results) {
  const stats = results.stats;
  
  switch (cipherType) {
    case 'caesar':
      return stats.chi2 && parseFloat(stats.chi2) > 50 ? 
        '文字頻度が英語から大きく乖離' : '統計的特徴が一致しない';
    
    case 'vigenere':
      return !results.visualData.autocorrelation || 
             Math.max(...results.visualData.autocorrelation) < 0.03 ?
        '明確な周期性パターンが検出されない' : '鍵長推定で有意な結果なし';
    
    case 'playfair':
      return results.length % 2 !== 0 ? 
        'テキスト長が奇数（プレイフェアは必ず偶数長）' : '特徴的パターンが不足';
    
    case 'adfgx':
      return '文字集合がADFGX(V)に限定されていない';
    
    case 'transposition':
      return stats.englishness && parseInt(stats.englishness) < 40 ?
        '英語らしさが低すぎる（転置暗号は高い英語らしさを保持）' : '統計的特徴が不一致';
    
    default:
      return '他の暗号方式により強い特徴が見つかった';
  }
}