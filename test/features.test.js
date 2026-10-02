import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as C from '../js/cipher-core.js';
import {
  FEATURES, letterCounts, indexOfCoincidence, chiPerLetter, bestShift, bestAffine,
  periodicIC, bigramScore, doubledPairRatio, extractFeatures
} from '../js/features.js';
import { keyLengthCandidates, kasiskiCounts, KEY_IC_THRESHOLD } from '../js/keylength.js';
import { MODEL } from '../js/model.js';

const EVAL = fs.readFileSync(new URL('../tools/corpus/eval-pg98.txt', import.meta.url), 'utf8').replace(/\s/g, '');
const PLAIN = EVAL.slice(5000, 5600);
const close = (a, b, eps = 1e-12) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

// 一致指数を「すべての2文字の組を数える」素朴な方法で求める参照
function naiveIC(s) {
  let same = 0;
  let pairs = 0;
  for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) { pairs++; if (s[i] === s[j]) same++; }
  return pairs ? same / pairs : 0;
}

test('一致指数は、すべての2文字の組を数えた値と一致する', () => {
  for (const s of ['AABB', 'ABCDEFG', 'AAAA', 'A', '', PLAIN.slice(0, 200)]) {
    close(indexOfCoincidence(letterCounts(s), s.length), naiveIC(s));
  }
  close(indexOfCoincidence(letterCounts('AABB'), 4), 4 / 12);
});

test('英語の出現率どおりの文字数なら χ² は0、偏るほど大きい', () => {
  const freq = new Array(26).fill(1 / 26);
  close(chiPerLetter(new Array(26).fill(10), 260, freq), 0);
  assert.ok(chiPerLetter([260, ...new Array(25).fill(0)], 260, freq) > 20);
  assert.equal(chiPerLetter(new Array(26).fill(0), 0, freq), 0);
});

test('bestShift・bestAffine は英文を暗号化したときの鍵を当てる', () => {
  const counts = (s) => letterCounts(s);
  for (const k of [1, 3, 13, 25]) {
    const c = C.caesarEncrypt(PLAIN, k);
    assert.equal(bestShift(counts(c), c.length, MODEL.english.freq).shift, k);
  }
  for (const [a, b] of [[5, 8], [3, 0], [25, 17], [11, 4]]) {
    const c = C.affineEncrypt(PLAIN, a, b);
    const r = bestAffine(counts(c), c.length, MODEL.english.freq);
    assert.deepEqual([r.a, r.b], [a, b]);
  }
});

test('周期ごとの一致指数: 鍵長で分けると英語並みに上がる', () => {
  const c = C.vigenereEncrypt(PLAIN, 'CRYPTOG');
  const p = periodicIC(c);
  close(p[0].ic, indexOfCoincidence(letterCounts(c), c.length));
  const at = (k) => p.find((x) => x.k === k).ic;
  assert.ok(at(7) >= KEY_IC_THRESHOLD);
  assert.ok(at(14) >= KEY_IC_THRESHOLD);
  for (const k of [2, 3, 4, 5, 6, 8, 9, 10]) assert.ok(at(k) < at(7), `k=${k}`);
  assert.equal(keyLengthCandidates(c).candidates[0], 7);
  assert.equal(keyLengthCandidates(c).periodFound, true);
});

test('周期の計算は、列の文字数が4未満になる周期を含めない', () => {
  assert.deepEqual(periodicIC('ABCDEFGHIJKL').map((x) => x.k), [1, 2, 3]);
  assert.deepEqual(periodicIC('ABC'), []);
});

test('カシスキー法の補助: 繰り返す3文字の並びの間隔を周期ごとに数える', () => {
  const r = kasiskiCounts('ABCDEFGHABC');
  assert.equal(r.repeats, 1);
  const by = Object.fromEntries(r.byPeriod.map((x) => [x.k, x.count]));
  assert.equal(by[2], 1);
  assert.equal(by[4], 1);
  assert.equal(by[8], 1);
  assert.equal(by[3], 0);
});

test('プレイフェア暗号文は2文字ずつの組に同じ字が並ばない', () => {
  const c = C.playfairEncrypt(PLAIN, C.playfairSquare('MONARCHY'));
  assert.equal(doubledPairRatio(c), 0);
  assert.equal(doubledPairRatio('AABBCD'), 2 / 3);
  assert.equal(doubledPairRatio('A'), 0);
});

test('2文字の組の英語らしさ: 平文は転置した文より高い', () => {
  const t = C.columnarEncrypt(PLAIN, 'ZEBRAS');
  assert.ok(bigramScore(PLAIN, MODEL.english.bigram) > bigramScore(t, MODEL.english.bigram) + 0.3);
  assert.equal(bigramScore('A', MODEL.english.bigram), 0);
});

test('extractFeatures は FEATURES の全部の値を、同じ順の配列でも返す', () => {
  const r = extractFeatures(PLAIN, MODEL.english);
  assert.deepEqual(Object.keys(r.values).sort(), FEATURES.map((f) => f.id).sort());
  assert.deepEqual(r.vector, FEATURES.map((f) => r.values[f.id]));
  assert.equal(r.values.evenLength, 1);
  assert.equal(r.values.distinct, letterCounts(PLAIN).filter((v) => v > 0).length);
  for (const f of FEATURES) assert.ok(Number.isFinite(r.values[f.id]), f.id);
  assert.ok(r.values.periodicGain >= 0);
});
