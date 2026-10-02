import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as C from '../js/cipher-core.js';
import { analyze, inspectInput, measuredPrecision, MAX_CHARS, MIN_LETTERS } from '../js/analysis.js';
import { CLOSE_MARGIN } from '../js/classifier.js';
import { PERIOD_CHECK_MIN } from '../js/keylength.js';
import { MODEL } from '../js/model.js';

const EVAL = fs.readFileSync(new URL('../tools/corpus/eval-pg98.txt', import.meta.url), 'utf8').replace(/\s/g, '');
const keys = (list) => list.map((m) => m.key);

test('入力の検査: 空・長すぎ・英字が少なすぎは解析しない', () => {
  assert.deepEqual(keys(inspectInput('').errors), ['error.empty']);
  assert.deepEqual(keys(inspectInput('   \n').errors), ['error.empty']);
  assert.deepEqual(keys(inspectInput('A'.repeat(MAX_CHARS + 1)).errors), ['error.tooLong']);
  assert.equal(inspectInput('A'.repeat(MAX_CHARS)).errors.length, 0);
  const few = inspectInput('A'.repeat(MIN_LETTERS - 1));
  assert.deepEqual(keys(few.errors), ['error.tooFewLetters']);
  assert.deepEqual(few.errors[0].params, { min: MIN_LETTERS, letters: MIN_LETTERS - 1 });
  assert.equal(inspectInput('A'.repeat(MIN_LETTERS)).errors.length, 0);
});

test('入力の検査: 英字以外は無視して続け、1回だけ知らせる（日本語で2回出さない）', () => {
  const r = inspectInput('あいう ' + 'ABCDE'.repeat(5));
  assert.equal(r.errors.length, 0);
  assert.deepEqual(keys(r.notes), ['note.ignored']);
  assert.deepEqual(r.notes[0].params, { count: 3, sample: ['あ', 'い', 'う'] });
  // 数字24字＋英字20字＝英字は45%
  const d = inspectInput('12 34 56 78 90 11 22 33 44 55 66 77 ' + 'ABCDEFGHIJKLMNOPQRST');
  assert.deepEqual(keys(d.notes), ['note.ignored', 'note.fewLetters']);
  assert.deepEqual(d.notes[1].params, { percent: 45 });
  // 数字16字＋英字20字＝英字は56%（半分以上なら「少ない」とは言わない）
  assert.deepEqual(keys(inspectInput('12 34 56 78 90 11 22 33 ' + 'ABCDEFGHIJKLMNOPQRST').notes), ['note.ignored']);
  // 空白・改行は数えない
  assert.equal(inspectInput('ABCDE FGHIJ\nKLMNO PQRST').notes.length, 0);
});

test('判定: 長い英文の暗号文は方式どおりに判定し、実測の適合率を添える', () => {
  const plain = EVAL.slice(20000, 20500);
  const cases = [
    ['plain', plain],
    ['caesar', C.caesarEncrypt(plain, 11)],
    ['affine', C.affineEncrypt(plain, 7, 3)],
    ['substitution', C.substitutionEncrypt(plain, C.keywordAlphabet('QUARTZ'))],
    ['vigenere', C.vigenereEncrypt(plain, 'LANTERN')],
    ['playfair', C.playfairEncrypt(plain, C.playfairSquare('KEYWORD'))],
    ['transposition', C.railFenceEncrypt(plain, 4)]
  ];
  for (const [type, text] of cases) {
    const r = analyze(text);
    assert.equal(r.ok, true);
    assert.equal(r.method, 'model');
    assert.equal(r.winner, type);
    assert.equal(r.bucket.id, 'n400');
    assert.deepEqual(r.measured, measuredPrecision(MODEL, 'n400', type));
    assert.ok(r.measured.correct <= r.measured.predicted);
    assert.equal(r.features.length, MODEL.features.length);
  }
  const v = analyze(C.vigenereEncrypt(plain, 'LANTERN'));
  assert.equal(v.keyLength.candidates[0], 7);
});

test('判定: ADFGX／ADFGVX は文字の種類で決め、奇数長なら知らせる', () => {
  const c = C.adfgvxEncrypt('Attack at once', 'BTALPDHOZKQFVSNGICUXMREWY', 'CARGO');
  const r = analyze(c);
  assert.equal(r.method, 'rule');
  assert.equal(r.winner, 'adfgvx');
  assert.equal(r.variant, 'adfgx');
  assert.equal(r.notes.length, 0);
  const odd = analyze(c + 'A');
  assert.deepEqual(keys(odd.notes), ['note.adfgvxOdd']);
  assert.equal(analyze('ADFGVX'.repeat(4)).variant, 'adfgvx');
});

test('判定: 接戦の目印は1位と2位の差が CLOSE_MARGIN 未満のときだけ立つ', () => {
  let seen = 0;
  for (let i = 0; i < 400; i++) {
    const r = analyze(C.vigenereEncrypt(EVAL.slice(i * 31, i * 31 + 30), 'KEY'));
    assert.equal(r.close, r.margin < CLOSE_MARGIN);
    assert.equal(keys(r.notes).includes('note.close'), r.close);
    if (r.close) seen++;
    assert.ok(keys(r.notes).includes('note.short'));
  }
  assert.ok(seen > 0);
});

test('判定: 周期のない多表式（オートキー）を200字以上で入れると「周期が見つからない」と知らせる', () => {
  const A = C.ALPHABET;
  const plain = EVAL.slice(40000, 40000 + PERIOD_CHECK_MIN + 100);
  const stream = 'QXZ' + plain;
  const autokey = [...plain].map((c, i) => A[(A.indexOf(c) + A.indexOf(stream[i])) % 26]).join('');
  const r = analyze(autokey);
  assert.equal(r.winner, 'vigenere');
  assert.equal(r.keyLength.periodFound, false);
  assert.ok(keys(r.notes).includes('note.noPeriod'));
});
