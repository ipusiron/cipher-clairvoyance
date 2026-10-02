// 入力の検査から判定・根拠の組み立てまで（DOM非依存）
// 画面に出す文言は持たない。メッセージはキー（messages.js）と値で返す。

import { lettersOnly } from './cipher-core.js';
import { FEATURES, extractFeatures } from './features.js';
import { classifyVector, decisiveFeatures } from './classifier.js';
import { keyLengthCandidates, kasiskiCounts, PERIOD_CHECK_MIN } from './keylength.js';
import { MODEL } from './model.js';

export const MAX_CHARS = 10000;
export const MIN_LETTERS = 20;
const ADFGVX_RE = /^[ADFGVX]+$/;

// 英字以外で無視する文字（空白・改行は数えない）
function ignoredChars(text) {
  const rest = [...String(text).normalize('NFKC')].filter((c) => !/[A-Za-z\s]/.test(c));
  return { count: rest.length, sample: [...new Set(rest)].slice(0, 5) };
}

// 入力の検査。errors があれば解析しない。notes は解析を続けたうえで知らせること
export function inspectInput(text) {
  const raw = String(text ?? '');
  const errors = [];
  const notes = [];
  if (raw.trim() === '') return { letters: '', errors: [{ key: 'error.empty' }], notes };
  if (raw.length > MAX_CHARS) errors.push({ key: 'error.tooLong', params: { max: MAX_CHARS, length: raw.length } });
  const letters = lettersOnly(raw);
  if (letters.length < MIN_LETTERS) errors.push({ key: 'error.tooFewLetters', params: { min: MIN_LETTERS, letters: letters.length } });
  const ignored = ignoredChars(raw);
  if (ignored.count > 0) notes.push({ key: 'note.ignored', params: { count: ignored.count, sample: ignored.sample } });
  const nonSpace = [...raw.normalize('NFKC')].filter((c) => !/\s/.test(c)).length;
  if (nonSpace > 0 && letters.length / nonSpace < 0.5) notes.push({ key: 'note.fewLetters', params: { percent: Math.round(letters.length / nonSpace * 100) } });
  return { letters, errors, notes };
}

// ある長さ帯で「この方式と判定されたとき、実際にその方式だった割合」（評価用の英文での実測）
export function measuredPrecision(model, bucketId, type) {
  const e = model.evaluation[bucketId];
  const predicted = model.classes.reduce((a, t) => a + e.confusion[t][type], 0);
  return { correct: e.confusion[type][type], predicted };
}

// 特徴量ごとの「典型」（学習データでの平均。あり／なしの特徴量は「あり」の割合）
function typical(model, bucketId, type, i) {
  return model.params[bucketId][type].mean[i];
}

export function analyze(text, model = MODEL) {
  const input = inspectInput(text);
  if (input.errors.length) return { ok: false, errors: input.errors, notes: input.notes };
  const s = input.letters;
  const n = s.length;
  const notes = [...input.notes];
  const extracted = extractFeatures(s, model.english);
  const kl = keyLengthCandidates(s);
  const base = {
    ok: true,
    errors: [],
    notes,
    n,
    counts: extracted.counts,
    english: model.english.freq,
    values: extracted.values,
    shift: extracted.shift,
    affine: extracted.affine,
    keyLength: { candidates: kl.candidates.slice(0, 3), curve: kl.curve, periodFound: kl.periodFound },
    kasiski: kasiskiCounts(s)
  };

  // ADFGX／ADFGVX は文字の種類で決める（モデルの外）
  if (ADFGVX_RE.test(s)) {
    const variant = s.includes('V') ? 'adfgvx' : 'adfgx';
    if (n % 2 !== 0) notes.push({ key: 'note.adfgvxOdd' });
    return { ...base, method: 'rule', winner: 'adfgvx', variant, ranking: ['adfgvx'] };
  }

  const r = classifyVector(extracted.vector, n, model);
  const winner = r.ranking[0].type;
  const second = r.ranking[1].type;
  const e = model.evaluation[r.bucket.id];
  if (r.close) notes.push({ key: 'note.close', params: { second, correct: e.close.correct, count: e.close.count } });
  if (winner === 'vigenere' && n >= PERIOD_CHECK_MIN && !kl.periodFound) notes.push({ key: 'note.noPeriod', params: { min: PERIOD_CHECK_MIN } });
  if (r.bucket.id === model.buckets[0].id) notes.push({ key: 'note.short', params: { max: r.bucket.max } });

  return {
    ...base,
    method: 'model',
    winner,
    second,
    ranking: r.ranking.map((x) => x.type),
    margin: r.margin,
    close: r.close,
    bucket: r.bucket,
    measured: measuredPrecision(model, r.bucket.id, winner),
    keyStats: e.keyLength,
    decisive: decisiveFeatures(r).map((d) => d.id),
    features: FEATURES.map((f, i) => ({
      id: f.id,
      kind: f.kind,
      digits: f.digits,
      value: extracted.vector[i],
      plain: typical(model, r.bucket.id, 'plain', i),
      winner: typical(model, r.bucket.id, winner, i),
      second: typical(model, r.bucket.id, second, i)
    }))
  };
}
