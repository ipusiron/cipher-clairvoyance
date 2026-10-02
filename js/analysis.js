// 入力の検査から判定・試し解き・根拠の組み立てまで（DOM非依存）
// 画面に出す文言は持たない。メッセージはキー（messages.js）と値で返す。

import { lettersOnly, polybiusDecode } from './cipher-core.js';
import { FEATURES, extractFeatures } from './features.js';
import { decisiveFeatures } from './classifier.js';
import { decide, STAGE2_MIN } from './decide.js';
import { keyLengthCandidates, kasiskiCounts, PERIOD_CHECK_MIN } from './keylength.js';
import { solveCaesar, solveAffine, solveVigenere, solveAutokey } from './solver.js';
import { MODEL } from './model.js';

export const MAX_CHARS = 10000;
export const MIN_LETTERS = 20;
export const POLY_TYPES = ['vigenere', 'autokey'];
// 短い文で互いに見分けにくい多表式のまとまり（お知らせと、まとまりとしての実測に使う）
export const POLY_GROUP = ['vigenere', 'autokey', 'bifid'];
const ADFGVX_RE = /^[ADFGVX]+$/;

// 英字以外で無視する文字（空白・改行は数えない）
function ignoredChars(text) {
  const rest = [...String(text).normalize('NFKC')].filter((c) => !/[A-Za-z\s]/.test(c));
  return { count: rest.length, sample: [...new Set(rest)].slice(0, 5) };
}

// ポリュビオス暗号らしい数字の列か（英字がなく、数字が 1〜5 だけで、偶数個・英字 MIN_LETTERS 字ぶん以上）
export function polybiusDigits(text) {
  const raw = String(text ?? '').normalize('NFKC');
  if (/[A-Za-z]/.test(raw)) return null;
  const digits = raw.replace(/[^0-9]/g, '');
  if (!/^[1-5]+$/.test(digits) || digits.length % 2 !== 0 || digits.length < MIN_LETTERS * 2) return null;
  if (/[^0-9\s,.\-/|]/.test(raw)) return null;
  return digits;
}

// 入力の検査。errors があれば解析しない。notes は解析を続けたうえで知らせること
export function inspectInput(text) {
  const raw = String(text ?? '');
  const errors = [];
  const notes = [];
  if (raw.trim() === '') return { letters: '', errors: [{ key: 'error.empty' }], notes, polybius: null };
  if (raw.length > MAX_CHARS) errors.push({ key: 'error.tooLong', params: { max: MAX_CHARS, length: raw.length } });
  const polybius = polybiusDigits(raw);
  if (polybius) return { letters: '', errors, notes, polybius };
  const letters = lettersOnly(raw);
  if (letters.length < MIN_LETTERS) errors.push({ key: 'error.tooFewLetters', params: { min: MIN_LETTERS, letters: letters.length } });
  const ignored = ignoredChars(raw);
  if (ignored.count > 0) notes.push({ key: 'note.ignored', params: { count: ignored.count, sample: ignored.sample } });
  const nonSpace = [...raw.normalize('NFKC')].filter((c) => !/\s/.test(c)).length;
  if (nonSpace > 0 && letters.length / nonSpace < 0.5) notes.push({ key: 'note.fewLetters', params: { percent: Math.round(letters.length / nonSpace * 100) } });
  return { letters, errors, notes, polybius: null };
}

// ある長さ帯で「この方式と判定されたとき、実際にその方式だった割合」（評価用の英文での実測）
export function measuredPrecision(model, bucketId, type) {
  const e = model.evaluation[bucketId];
  const predicted = model.classes.reduce((a, t) => a + e.confusion[t][type], 0);
  return { correct: e.confusion[type][type], predicted };
}

// 多表式のまとまりと判定したもののうち、実際にそのどれかだった割合
export function measuredGroupPrecision(model, bucketId, group = POLY_GROUP) {
  const e = model.evaluation[bucketId];
  let predicted = 0;
  let correct = 0;
  for (const t of model.classes) {
    for (const p of group) {
      predicted += e.confusion[t][p];
      if (group.includes(t)) correct += e.confusion[t][p];
    }
  }
  return { correct, predicted };
}

// 試し解きの結果が「英文らしい」か: 平文の典型（学習データ）の bigram の平均から標準偏差の3倍以内
export function englishLikeThreshold(model, bucketId) {
  const i = FEATURES.findIndex((f) => f.id === 'bigram');
  const p = model.params[bucketId].plain;
  return p.mean[i] - 3 * Math.sqrt(p.var[i]);
}

function trialFor(winner, s, model, stage2) {
  switch (winner) {
    case 'caesar': return { type: 'caesar', ...solveCaesar(s, model.english) };
    case 'affine': return { type: 'affine', ...solveAffine(s, model.english) };
    case 'vigenere': return { type: 'vigenere', ...(stage2 ? stage2.vigenere : solveVigenere(s, model.english)) };
    case 'autokey': return { type: 'autokey', ...(stage2 ? stage2.autokey : solveAutokey(s, model.english)) };
    default: return null;
  }
}

function analyzeLetters(s, model, notes) {
  const n = s.length;
  const extracted = extractFeatures(s, model.english);
  const kl = keyLengthCandidates(s);
  const base = {
    ok: true,
    errors: [],
    notes,
    n,
    letters: s,
    counts: extracted.counts,
    english: model.english.freq,
    values: extracted.values,
    keyLength: { candidates: kl.candidates.slice(0, 3), curve: kl.curve, periodFound: kl.periodFound },
    kasiski: kasiskiCounts(s)
  };

  // ADFGX／ADFGVX は文字の種類で決める（モデルの外）
  if (ADFGVX_RE.test(s)) {
    const variant = s.includes('V') ? 'adfgvx' : 'adfgx';
    if (n % 2 !== 0) notes.push({ key: 'note.adfgvxOdd' });
    return { ...base, method: 'rule', winner: 'adfgvx', variant, ranking: ['adfgvx'] };
  }

  const d = decide(s, extracted.vector, model);
  const { winner, second } = d;
  const e = model.evaluation[d.bucket.id];
  if (d.close) notes.push({ key: 'note.close', params: { second, correct: e.close.correct, count: e.close.count } });
  if (d.stage2) notes.push({ key: 'note.stage2', params: { other: winner === 'vigenere' ? 'autokey' : 'vigenere' } });
  if (POLY_GROUP.includes(winner) && n < STAGE2_MIN) {
    const g = measuredGroupPrecision(model, d.bucket.id);
    notes.push({ key: 'note.polyShort', params: { min: STAGE2_MIN, correct: g.correct, predicted: g.predicted } });
  }
  if (winner === 'vigenere' && n >= PERIOD_CHECK_MIN && !kl.periodFound) notes.push({ key: 'note.noPeriod', params: { min: PERIOD_CHECK_MIN } });
  if (d.bucket.id === model.buckets[0].id) notes.push({ key: 'note.short', params: { max: d.bucket.max } });

  const trial = trialFor(winner, s, model, d.stage2);
  if (trial) {
    trial.englishLike = trial.score >= englishLikeThreshold(model, d.bucket.id);
    // 十分な長さがあるのに試し解きで英文に戻らないなら、判定した方式ではない（対象外の方式の）可能性がある
    if (!trial.englishLike && n >= PERIOD_CHECK_MIN) notes.push({ key: 'note.trialFailed', params: { min: PERIOD_CHECK_MIN } });
  }

  const typical = (type, i) => model.params[d.bucket.id][type].mean[i];
  return {
    ...base,
    method: 'model',
    winner,
    second,
    ranking: d.types,
    margin: d.margin,
    close: d.close,
    stage2: Boolean(d.stage2),
    bucket: d.bucket,
    measured: measuredPrecision(model, d.bucket.id, winner),
    keyStats: e.keyLength,
    trial,
    decisive: decisiveFeatures(d, 3, undefined, winner, second).map((x) => x.id),
    features: FEATURES.map((f, i) => ({
      id: f.id,
      kind: f.kind,
      digits: f.digits,
      value: extracted.vector[i],
      plain: typical('plain', i),
      winner: typical(winner, i),
      second: typical(second, i)
    }))
  };
}

export function analyze(text, model = MODEL) {
  const input = inspectInput(text);
  if (input.errors.length) return { ok: false, errors: input.errors, notes: input.notes };
  if (input.polybius) {
    // 数字の組を標準の表で字に戻し、その字の列を判定する（標準の表なら平文、並べ替えた表なら単一換字式と出る）
    const decoded = polybiusDecode(input.polybius);
    const inner = analyzeLetters(decoded, model, []);
    const notes = [{ key: 'note.polybius', params: { pairs: decoded.length } }, ...inner.notes];
    return { ...inner, notes, polybius: { digits: input.polybius.length, decoded, inner: inner.winner } };
  }
  return analyzeLetters(input.letters, model, [...input.notes]);
}
