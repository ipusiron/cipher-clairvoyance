// ヴィジュネル暗号の鍵長の推定（DOM非依存）
// 周期 k ごとに文字を k 列へ振り分け、列ごとの一致指数（IC）の平均を見る。
// 鍵長（またはその倍数）で分けると各列が1つのシーザー暗号になり、IC が英語並みに上がる。
// 候補＝平均が KEY_IC_THRESHOLD 以上になる周期を小さい順に、続いて残りを平均の大きい順に並べる。
// 長さ帯ごとの正答率はモデルの evaluation に記録している（tools/build-model.mjs）。
// 閾値に届く周期がないとき periodFound=false。英字が PERIOD_CHECK_MIN 字以上あるのに周期がなければ、
// 周期のない多表式（オートキーなど）や、文の長さに比べて長すぎる鍵の可能性がある。

import { periodicIC, PERIOD_MAX } from './features.js';

export const KEY_IC_THRESHOLD = 0.058;
export const KASISKI_GRAM = 3;
export const PERIOD_CHECK_MIN = 200;

export function keyLengthCandidates(s) {
  const curve = periodicIC(s, PERIOD_MAX).filter((p) => p.k >= 2);
  const hits = curve.filter((p) => p.ic >= KEY_IC_THRESHOLD).map((p) => p.k);
  const rest = [...curve].sort((a, b) => b.ic - a.ic || a.k - b.k).map((p) => p.k).filter((k) => !hits.includes(k));
  return { candidates: [...hits, ...rest], curve, periodFound: hits.length > 0 };
}

// カシスキー法の補助表示: 3文字の並びが繰り返し現れる間隔を数え、周期 k（2〜PERIOD_MAX）で割り切れる間隔の数を返す
export function kasiskiCounts(s, gram = KASISKI_GRAM) {
  const counts = new Array(PERIOD_MAX + 1).fill(0);
  const seen = new Map();
  let repeats = 0;
  for (let i = 0; i + gram <= s.length; i++) {
    const g = s.slice(i, i + gram);
    const prev = seen.get(g);
    if (prev) {
      for (const j of prev) {
        repeats++;
        const d = i - j;
        for (let k = 2; k <= PERIOD_MAX; k++) if (d % k === 0) counts[k]++;
      }
      prev.push(i);
    } else {
      seen.set(g, [i]);
    }
  }
  return { repeats, byPeriod: counts.slice(2).map((count, i) => ({ k: i + 2, count })) };
}
