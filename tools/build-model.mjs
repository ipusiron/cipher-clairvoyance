// 判定モデル js/model.js を作る（開発用。画面では使わない）
// 使い方: node tools/build-model.mjs          … js/model.js を書き出す
//         node tools/build-model.mjs --check  … 書き出す内容が今の js/model.js と同じかを確かめる（テストで使う）
//
// 1. 学習用の英文（tools/corpus/train-pg1342.txt）から英語の文字の出現率と2文字の組の確率を求める
// 2. 学習用の英文の一部を各方式で暗号化し、長さ帯ごと・方式ごとに特徴量の分布を求める
// 3. 評価用の英文（tools/corpus/eval-pg98.txt。学習には使わない）を同じように暗号化して判定し、正答率を記録する
// 乱数は種を固定した擬似乱数（mulberry32）なので、何度実行しても同じモデルになる。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from '../js/cipher-core.js';
import { FEATURES, extractFeatures } from '../js/features.js';
import { CLOSE_MARGIN } from '../js/classifier.js';
import { decide, STAGE2_MIN } from '../js/decide.js';
import { keyLengthCandidates, KEY_IC_THRESHOLD, PERIOD_CHECK_MIN } from '../js/keylength.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'js', 'model.js');

export const SEED = 20261002;
export const N_TRAIN = 400;
export const N_EVAL = 300;
export const CLASSES = ['plain', 'caesar', 'affine', 'substitution', 'vigenere', 'autokey', 'playfair', 'bifid', 'transposition'];
// 長さ帯（英字の数）。maxGen は最後の帯で学習・評価に使う長さの上限
export const BUCKETS = [
  { id: 'n20', min: 20, max: 49 },
  { id: 'n50', min: 50, max: 99 },
  { id: 'n100', min: 100, max: 199 },
  { id: 'n200', min: 200, max: 399 },
  { id: 'n400', min: 400, max: null, maxGen: 1000 }
];
export const VIGENERE_KEY = [2, 12];
export const AUTOKEY_PRIMER = [3, 10];
const VAR_FLOOR_RATIO = 1e-3;

function readCorpus(name) {
  return fs.readFileSync(path.join(ROOT, 'tools', 'corpus', name), 'utf8').replace(/[^A-Z]/g, '');
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sig = (x) => Number(x.toPrecision(6));

export function englishStats(text) {
  const counts = new Array(26).fill(0);
  const pairs = new Array(676).fill(0);
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i) - 65;
    counts[c]++;
    if (i + 1 < text.length) pairs[c * 26 + text.charCodeAt(i + 1) - 65]++;
  }
  const n = text.length;
  return {
    freq: counts.map((v) => sig(v / n)),
    bigram: pairs.map((v) => Number(Math.log10((v + 1) / (n - 1 + 676)).toFixed(4)))
  };
}

// 方式ごとの暗号化（鍵は毎回ランダム）。戻り値の key は評価の記録用
function makers(rnd) {
  const ri = (n) => Math.floor(rnd() * n);
  const shuffled = (s) => {
    const a = [...s];
    for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const blockPermute = (s) => {
    const size = [16, 25, 36, 49, 64][ri(5)];
    const perm = shuffled([...Array(size).keys()]);
    let out = '';
    for (let i = 0; i < s.length; i += size) {
      const block = s.slice(i, i + size);
      out += perm.filter((p) => p < block.length).map((p) => block[p]).join('');
    }
    return out;
  };
  return {
    plain: (s) => ({ c: s }),
    caesar: (s) => ({ c: C.caesarEncrypt(s, 1 + ri(25)) }),
    affine: (s) => ({ c: C.affineEncrypt(s, C.AFFINE_A[1 + ri(C.AFFINE_A.length - 1)], ri(26)) }),
    substitution: (s) => ({ c: C.substitutionEncrypt(s, shuffled(C.ALPHABET).join('')) }),
    vigenere: (s) => {
      const k = VIGENERE_KEY[0] + ri(VIGENERE_KEY[1] - VIGENERE_KEY[0] + 1);
      return { c: C.vigenereEncrypt(s, Array.from({ length: k }, () => C.ALPHABET[ri(26)]).join('')), keyLength: k };
    },
    autokey: (s) => {
      const k = AUTOKEY_PRIMER[0] + ri(AUTOKEY_PRIMER[1] - AUTOKEY_PRIMER[0] + 1);
      return { c: C.autokeyEncrypt(s, Array.from({ length: k }, () => C.ALPHABET[ri(26)]).join('')) };
    },
    playfair: (s) => ({ c: C.playfairEncrypt(s, shuffled('ABCDEFGHIKLMNOPQRSTUVWXYZ').join('')) }),
    bifid: (s) => ({ c: C.bifidEncrypt(s, shuffled('ABCDEFGHIKLMNOPQRSTUVWXYZ').join(''), rnd() < 0.5 ? null : 5 + ri(6)) }),
    transposition: (s) => {
      const r = ri(3);
      if (r === 0) return { c: C.columnarEncrypt(s, shuffled([...Array(3 + ri(8)).keys()])) };
      if (r === 1) return { c: C.railFenceEncrypt(s, 2 + ri(5)) };
      return { c: blockPermute(s) };
    }
  };
}

// 長さ帯の中の長さで英文を切り出して暗号化する。暗号文が長くなる方式（プレイフェアの埋字）は目標の長さで切る
function sample(text, type, bucket, rnd, make) {
  const hi = bucket.max ?? bucket.maxGen;
  let len = bucket.min + Math.floor(rnd() * (hi - bucket.min + 1));
  if (type === 'playfair') len -= len % 2;
  if (len < bucket.min) len += 2;
  const start = Math.floor(rnd() * (text.length - len - 1));
  const m = make[type](text.slice(start, start + len));
  return { ...m, c: m.c.slice(0, len) };
}

function fitClass(vectors) {
  const d = FEATURES.length;
  const mean = new Array(d).fill(0);
  const vr = new Array(d).fill(0);
  for (const v of vectors) v.forEach((x, i) => { mean[i] += x / vectors.length; });
  for (const v of vectors) v.forEach((x, i) => { vr[i] += (x - mean[i]) ** 2 / vectors.length; });
  return FEATURES.map((f, i) => {
    if (f.kind === 'bernoulli') {
      const ones = vectors.filter((v) => v[i] === 1).length;
      return { mean: (ones + 1) / (vectors.length + 2), var: 0 };
    }
    return { mean: mean[i], var: vr[i] };
  });
}

export function buildModel() {
  const train = readCorpus('train-pg1342.txt');
  const evalText = readCorpus('eval-pg98.txt');
  const english = englishStats(train);
  const rnd = mulberry32(SEED);
  const make = makers(rnd);

  const model = {
    version: 1,
    english,
    buckets: BUCKETS.map(({ id, min, max }) => ({ id, min, max })),
    classes: CLASSES,
    features: FEATURES.map((f) => f.id),
    params: {},
    evaluation: {}
  };

  // 学習
  const trainVectors = {};
  for (const b of BUCKETS) {
    trainVectors[b.id] = {};
    const fits = {};
    for (const type of CLASSES) {
      const vs = [];
      for (let t = 0; t < N_TRAIN; t++) vs.push(extractFeatures(sample(train, type, b, rnd, make).c, english).vector);
      trainVectors[b.id][type] = vs;
      fits[type] = fitClass(vs);
    }
    // 分散の下限＝全方式をまとめた分散の VAR_FLOOR_RATIO 倍（特徴量の目盛りの違いに左右されない）
    const pooled = FEATURES.map((f, i) => {
      const all = CLASSES.flatMap((type) => trainVectors[b.id][type].map((v) => v[i]));
      const mu = all.reduce((a, x) => a + x, 0) / all.length;
      return all.reduce((a, x) => a + (x - mu) ** 2, 0) / all.length;
    });
    model.params[b.id] = {};
    for (const type of CLASSES) {
      model.params[b.id][type] = {
        mean: fits[type].map((p) => sig(p.mean)),
        var: fits[type].map((p, i) => (FEATURES[i].kind === 'bernoulli' ? 0 : sig(Math.max(p.var, pooled[i] * VAR_FLOOR_RATIO))))
      };
    }
  }

  // 評価（学習に使っていない英文）
  for (const b of BUCKETS) {
    const confusion = Object.fromEntries(CLASSES.map((t) => [t, Object.fromEntries(CLASSES.map((p) => [p, 0]))]));
    const close = { count: 0, correct: 0 };
    const clear = { count: 0, correct: 0 };
    const key = { count: 0, top1: 0, top3: 0, noPeriod: 0 };
    for (const type of CLASSES) {
      for (let t = 0; t < N_EVAL; t++) {
        const s = sample(evalText, type, b, rnd, make);
        const r = decide(s.c, extractFeatures(s.c, english).vector, model);
        const pred = r.winner;
        confusion[type][pred]++;
        const bin = r.close ? close : clear;
        bin.count++;
        if (pred === type) bin.correct++;
        if (type === 'vigenere') {
          const kl = keyLengthCandidates(s.c);
          key.count++;
          if (kl.candidates[0] === s.keyLength) key.top1++;
          if (kl.candidates.slice(0, 3).includes(s.keyLength)) key.top3++;
          if (!kl.periodFound) key.noPeriod++;
        }
      }
    }
    model.evaluation[b.id] = { perClass: N_EVAL, confusion, close, clear, keyLength: key };
  }
  return model;
}

function fmtArray(a, perLine, indent) {
  const lines = [];
  for (let i = 0; i < a.length; i += perLine) lines.push(indent + a.slice(i, i + perLine).join(', '));
  return '[\n' + lines.join(',\n') + '\n' + indent.slice(2) + ']';
}

export function renderModel(model) {
  const ind = (n) => ' '.repeat(n);
  const out = [];
  out.push('// 判定モデル（tools/build-model.mjs が生成。手で編集しない）');
  out.push('// 学習: Project Gutenberg #1342 Pride and Prejudice（Jane Austen）の抜粋 tools/corpus/train-pg1342.txt');
  out.push('// 評価: Project Gutenberg #98 A Tale of Two Cities（Charles Dickens）の抜粋 tools/corpus/eval-pg98.txt');
  out.push('// どちらも米国でパブリックドメイン。抜粋の作り方は tools/make-corpus.mjs。');
  out.push(`// 乱数の種 ${SEED}、学習は長さ帯×方式ごとに ${N_TRAIN} 件、評価は ${N_EVAL} 件。`);
  out.push(`// 接戦の目安 CLOSE_MARGIN=${CLOSE_MARGIN}、鍵長の閾値 KEY_IC_THRESHOLD=${KEY_IC_THRESHOLD}`
    + `（周期の確認は ${PERIOD_CHECK_MIN} 字以上）、ヴィジュネルの鍵長 ${VIGENERE_KEY.join('〜')}、`
    + `オートキーのプライマー ${AUTOKEY_PRIMER.join('〜')} 字、ヴィジュネル／オートキーの2段目は ${STAGE2_MIN} 字以上。`);
  out.push('');
  out.push('export const MODEL = {');
  out.push(`  version: ${model.version},`);
  out.push('  english: {');
  out.push(`    freq: ${fmtArray(model.english.freq, 9, ind(6))},`);
  out.push(`    bigram: ${fmtArray(model.english.bigram, 13, ind(6))}`);
  out.push('  },');
  out.push(`  buckets: [\n${model.buckets.map((b) => `    { id: '${b.id}', min: ${b.min}, max: ${b.max} }`).join(',\n')}\n  ],`);
  out.push(`  classes: [${model.classes.map((c) => `'${c}'`).join(', ')}],`);
  out.push(`  features: [${model.features.map((c) => `'${c}'`).join(', ')}],`);
  out.push('  params: {');
  out.push(model.buckets.map((b) => `    ${b.id}: {\n` + model.classes.map((c) => {
    const p = model.params[b.id][c];
    return `      ${c}: {\n        mean: [${p.mean.join(', ')}],\n        var: [${p.var.join(', ')}]\n      }`;
  }).join(',\n') + '\n    }').join(',\n'));
  out.push('  },');
  out.push('  evaluation: {');
  out.push(model.buckets.map((b) => {
    const e = model.evaluation[b.id];
    const conf = model.classes.map((t) => `        ${t}: { ${model.classes.map((p) => `${p}: ${e.confusion[t][p]}`).join(', ')} }`).join(',\n');
    return `    ${b.id}: {\n      perClass: ${e.perClass},\n      confusion: {\n${conf}\n      },\n`
      + `      close: { count: ${e.close.count}, correct: ${e.close.correct} },\n`
      + `      clear: { count: ${e.clear.count}, correct: ${e.clear.correct} },\n`
      + `      keyLength: { count: ${e.keyLength.count}, top1: ${e.keyLength.top1}, top3: ${e.keyLength.top3}, `
      + `noPeriod: ${e.keyLength.noPeriod} }\n    }`;
  }).join(',\n'));
  out.push('  }');
  out.push('};');
  return out.join('\n') + '\n';
}

if (process.argv[1] && process.argv[1].endsWith('build-model.mjs')) {
  const text = renderModel(buildModel());
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
    if (cur !== text) {
      console.error('js/model.js is out of date: run node tools/build-model.mjs');
      process.exit(1);
    }
    console.log('js/model.js is up to date');
  } else {
    fs.writeFileSync(OUT, text);
    console.log(`wrote ${path.relative(ROOT, OUT)} (${text.length} bytes)`);
  }
}
