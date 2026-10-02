// 暗号文の統計値（特徴量）を計算する（DOM非依存）
// english は英語の統計＝{ freq: 26文字の出現率（合計1）, bigram: 676個の log10 確率 }。
// 値はどれも「英字だけを大文字でつないだ文字列」から計算する。

import { AFFINE_A } from './cipher-core.js';

// 判定に使う特徴量。kind は確率モデルの形（gauss＝正規分布、bernoulli＝あり／なし）
export const FEATURES = [
  { id: 'ic', kind: 'gauss', digits: 4 },
  { id: 'chiEnglish', kind: 'gauss', digits: 3 },
  { id: 'chiShift', kind: 'gauss', digits: 3 },
  { id: 'chiAffine', kind: 'gauss', digits: 3 },
  { id: 'periodicGain', kind: 'gauss', digits: 4 },
  { id: 'bigram', kind: 'gauss', digits: 3 },
  { id: 'doubledPairs', kind: 'gauss', digits: 3 },
  { id: 'distinct', kind: 'gauss', digits: 0 },
  { id: 'evenLength', kind: 'bernoulli', digits: 0 },
  { id: 'hasJ', kind: 'bernoulli', digits: 0 }
];

export const PERIOD_MAX = 20;

export function letterCounts(s) {
  const c = new Array(26).fill(0);
  for (let i = 0; i < s.length; i++) c[s.charCodeAt(i) - 65]++;
  return c;
}

// 一致指数（2文字を無作為に選んだとき同じ字である確率）
export function indexOfCoincidence(counts, n) {
  if (n < 2) return 0;
  let t = 0;
  for (const v of counts) t += v * (v - 1);
  return t / (n * (n - 1));
}

// 英語の出現率とのカイ二乗値を文字数で割った値（長さに左右されにくくする）
export function chiPerLetter(counts, n, freq) {
  if (n === 0) return 0;
  let t = 0;
  for (let i = 0; i < 26; i++) {
    const e = n * freq[i];
    t += (counts[i] - e) ** 2 / e;
  }
  return t / n;
}

// 26通りのずらしのうち、英語にもっとも近づくもの（暗号文の字 = 平文の字 + shift）
export function bestShift(counts, n, freq) {
  let best = { shift: 0, chi: Infinity };
  for (let k = 0; k < 26; k++) {
    const plain = counts.map((_, p) => counts[(p + k) % 26]);
    const chi = chiPerLetter(plain, n, freq);
    if (chi < best.chi) best = { shift: k, chi };
  }
  return best;
}

// 312通りのアフィン変換（暗号文の字 = a × 平文の字 + b）のうち、英語にもっとも近づくもの
export function bestAffine(counts, n, freq) {
  let best = { a: 1, b: 0, chi: Infinity };
  for (const a of AFFINE_A) {
    for (let b = 0; b < 26; b++) {
      const plain = counts.map((_, p) => counts[(a * p + b) % 26]);
      const chi = chiPerLetter(plain, n, freq);
      if (chi < best.chi) best = { a, b, chi };
    }
  }
  return best;
}

// 周期 k ごとに文字を k 列へ振り分け、列ごとの一致指数の平均を求める（k = 1 … kmax）
// 列の文字数が 4 未満になる周期は計算しない
export function periodicIC(s, kmax = PERIOD_MAX) {
  const out = [];
  for (let k = 1; k <= kmax; k++) {
    if (Math.floor(s.length / k) < 4) break;
    let t = 0;
    for (let j = 0; j < k; j++) {
      const c = new Array(26).fill(0);
      let m = 0;
      for (let i = j; i < s.length; i += k) { c[s.charCodeAt(i) - 65]++; m++; }
      t += indexOfCoincidence(c, m);
    }
    out.push({ k, ic: t / k });
  }
  return out;
}

// 隣り合う2文字の英語らしさ（log10 確率の平均）
export function bigramScore(s, bigram) {
  if (s.length < 2) return 0;
  let t = 0;
  for (let i = 0; i + 1 < s.length; i++) t += bigram[(s.charCodeAt(i) - 65) * 26 + s.charCodeAt(i + 1) - 65];
  return t / (s.length - 1);
}

// 先頭から2文字ずつ区切った組のうち、同じ字が並ぶ組の割合（プレイフェア暗号では必ず0）
export function doubledPairRatio(s) {
  let pairs = 0;
  let dbl = 0;
  for (let i = 0; i + 1 < s.length; i += 2) {
    pairs++;
    if (s[i] === s[i + 1]) dbl++;
  }
  return pairs ? dbl / pairs : 0;
}

// すべての特徴量を計算する。values は FEATURES の id をキーにした値、vector は FEATURES の順の配列
export function extractFeatures(s, english) {
  const n = s.length;
  const counts = letterCounts(s);
  const ic = indexOfCoincidence(counts, n);
  const shift = bestShift(counts, n, english.freq);
  const affine = bestAffine(counts, n, english.freq);
  const periodic = periodicIC(s);
  const maxPeriodic = periodic.filter((p) => p.k >= 2).reduce((m, p) => Math.max(m, p.ic), ic);
  const values = {
    ic,
    chiEnglish: chiPerLetter(counts, n, english.freq),
    chiShift: shift.chi,
    chiAffine: affine.chi,
    periodicGain: maxPeriodic - ic,
    bigram: bigramScore(s, english.bigram),
    doubledPairs: doubledPairRatio(s),
    distinct: counts.filter((v) => v > 0).length,
    evenLength: n % 2 === 0 ? 1 : 0,
    hasJ: counts[9] > 0 ? 1 : 0
  };
  return { values, vector: FEATURES.map((f) => values[f.id]), counts, shift, affine, periodic };
}
