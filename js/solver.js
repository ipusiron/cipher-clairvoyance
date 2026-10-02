// 試し解き（DOM非依存）: 判定した方式の鍵を統計で推し量り、平文の候補を作る
// 候補の良し悪しは、隣り合う2文字の英語らしさ（bigramScore）で比べる。
// 鍵を当てるのは「英語らしい文に戻るか」だけが手がかりなので、短い文では外れる。

import * as C from './cipher-core.js';
import { letterCounts, bestShift, bigramScore } from './features.js';
import { keyLengthCandidates } from './keylength.js';

export const MAX_KEY_LENGTH = 12;
export const MAX_PRIMER = 12;

const A = C.ALPHABET;

// 列（i ≡ j mod L の位置の字）を取り出す
function column(s, j, L) {
  let out = '';
  for (let i = j; i < s.length; i += L) out += s[i];
  return out;
}

// シーザー: 26通りを英語らしさで比べる
export function solveCaesar(s, english) {
  let best = null;
  for (let k = 0; k < 26; k++) {
    const p = C.caesarDecrypt(s, k);
    const score = bigramScore(p, english.bigram);
    if (!best || score > best.score) best = { shift: k, plaintext: p, score };
  }
  return best;
}

// アフィン: 312通りを英語らしさで比べる（a=1 はシーザーと同じ）
export function solveAffine(s, english) {
  let best = null;
  for (const a of C.AFFINE_A) {
    for (let b = 0; b < 26; b++) {
      const p = C.affineDecrypt(s, a, b);
      const score = bigramScore(p, english.bigram);
      if (!best || score > best.score) best = { a, b, plaintext: p, score };
    }
  }
  return best;
}

// 1つの列を「ずらし」（ヴィジュネル型）または「逆向きにしてずらす」（ボーフォート型）で英語に近づける
function bestColumnShift(col, english, reversed) {
  const src = reversed ? [...col].map((c) => A[(26 - A.indexOf(c)) % 26]).join('') : col;
  return bestShift(letterCounts(src), src.length, english.freq).shift;
}

// ヴィジュネル型・ボーフォート型: 鍵長の候補ごとに、列を独立にずらして英語に近づける
export function defaultKeyLengths(s) {
  const list = keyLengthCandidates(s).candidates.filter((k) => k <= MAX_KEY_LENGTH).slice(0, 3);
  return list.length ? list : [1];
}

export function solveVigenere(s, english, lengths = defaultKeyLengths(s)) {
  let best = null;
  for (const L of lengths.filter((x) => x >= 1 && x <= MAX_KEY_LENGTH)) {
    for (const variant of ['vigenere', 'beaufort']) {
      const reversed = variant === 'beaufort';
      const shifts = Array.from({ length: L }, (_, j) => bestColumnShift(column(s, j, L), english, reversed));
      let p = '';
      for (let i = 0; i < s.length; i++) {
        const c = A.indexOf(s[i]);
        const k = shifts[i % L];
        p += A[(((reversed ? -c : c) - k) % 26 + 26) % 26];
      }
      const score = bigramScore(p, english.bigram);
      if (!best || score > best.score) {
        best = { variant, keyLength: L, key: reversed ? null : shifts.map((k) => A[k]).join(''), plaintext: p, score };
      }
    }
  }
  return best;
}

// オートキー（平文オートキー）: プライマーの長さ L ごとに、位置 j, j+L, j+2L… の平文は
// プライマーの j 文字目だけで決まる鎖になる。鎖ごとに26通りを試し、英語の頻度に近いものを選ぶ
export function solveAutokey(s, english, maxPrimer = MAX_PRIMER) {
  let best = null;
  for (let L = 1; L <= Math.min(maxPrimer, Math.floor(s.length / 2)); L++) {
    const primer = [];
    for (let j = 0; j < L; j++) {
      let pick = 0;
      let pickChi = Infinity;
      for (let k = 0; k < 26; k++) {
        let prev = k;
        const counts = new Array(26).fill(0);
        let n = 0;
        for (let i = j; i < s.length; i += L) {
          const p = ((A.indexOf(s[i]) - prev) % 26 + 26) % 26;
          counts[p]++;
          n++;
          prev = p;
        }
        let chi = 0;
        for (let x = 0; x < 26; x++) chi += (counts[x] - n * english.freq[x]) ** 2 / (n * english.freq[x]);
        if (chi < pickChi) { pickChi = chi; pick = k; }
      }
      primer.push(A[pick]);
    }
    const key = primer.join('');
    const p = C.autokeyDecrypt(s, key);
    const score = bigramScore(p, english.bigram);
    if (!best || score > best.score) best = { primer: key, primerLength: L, plaintext: p, score };
  }
  return best;
}
