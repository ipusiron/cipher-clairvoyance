// 特徴量から方式を判定する（DOM非依存）
// 長さ帯ごと・方式ごとに、学習データでの特徴量の分布（正規分布の平均と分散、または「あり」の割合）を持ち、
// 暗号文の特徴量がどの方式の分布にもっとも当てはまるか（対数尤度の合計）で順位を付ける（単純ベイズ）。
// どの方式も同じ割合で出てくると仮定している（事前確率は等しい）。

import { FEATURES } from './features.js';

// 1位と2位の対数尤度の差がこれ未満なら「接戦」とする（e^3 ≒ 20倍）
export const CLOSE_MARGIN = 3;

export function bucketFor(n, buckets) {
  return buckets.find((b) => n >= b.min && (b.max === null || n <= b.max)) || null;
}

// 1つの特徴量の対数尤度
export function featureLogLik(feature, x, p) {
  if (feature.kind === 'bernoulli') return Math.log(x ? p.mean : 1 - p.mean);
  return -0.5 * Math.log(2 * Math.PI * p.var) - (x - p.mean) ** 2 / (2 * p.var);
}

// 各方式の対数尤度と、特徴量ごとの内訳
export function scoreClasses(vector, bucketParams, classes) {
  return classes.map((type) => {
    const par = bucketParams[type];
    const parts = FEATURES.map((f, i) => featureLogLik(f, vector[i], { mean: par.mean[i], var: par.var[i] }));
    return { type, logLik: parts.reduce((a, b) => a + b, 0), parts };
  }).sort((a, b) => b.logLik - a.logLik);
}

// 判定（ranking は対数尤度の大きい順）
export function classifyVector(vector, n, model) {
  const bucket = bucketFor(n, model.buckets);
  if (!bucket) return null;
  const ranking = scoreClasses(vector, model.params[bucket.id], model.classes);
  const [first, second] = ranking;
  const margin = first.logLik - second.logLik;
  return { bucket, ranking, margin, close: margin < CLOSE_MARGIN };
}

// 1位を2位より支持した特徴量（内訳の差が大きい順）
export function decisiveFeatures(result, count = 3) {
  const [first, second] = result.ranking;
  return FEATURES.map((f, i) => ({ id: f.id, diff: first.parts[i] - second.parts[i] }))
    .sort((a, b) => b.diff - a.diff)
    .slice(0, count)
    .filter((d) => d.diff > 0);
}
