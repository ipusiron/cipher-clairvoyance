import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as C from '../js/cipher-core.js';
import {
  analyze, inspectInput, measuredPrecision, measuredGroupPrecision, polybiusDigits, POLY_TYPES, POLY_GROUP, MAX_CHARS, MIN_LETTERS
} from '../js/analysis.js';
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
    ['autokey', C.autokeyEncrypt(plain, 'LANTERN')],
    ['playfair', C.playfairEncrypt(plain, C.playfairSquare('KEYWORD'))],
    ['bifid', C.bifidEncrypt(plain, C.playfairSquare('KEYWORD'), 7)],
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

test('判定: オートキー暗号は2段目の試し解きでヴィジュネル暗号と見分け、プライマーと平文を戻す', () => {
  const plain = EVAL.slice(40000, 40000 + 300);
  const r = analyze(C.autokeyEncrypt(plain, 'QXZ'));
  assert.equal(r.winner, 'autokey');
  assert.equal(r.stage2, true);
  assert.ok(keys(r.notes).includes('note.stage2'));
  assert.equal(r.trial.primer, 'QXZ');
  assert.equal(r.trial.plaintext, plain);
  assert.equal(r.trial.englishLike, true);
  const v = analyze(C.vigenereEncrypt(plain, 'QXZ'));
  assert.equal(v.winner, 'vigenere');
  assert.equal(v.trial.key, 'QXZ');
  assert.equal(v.trial.plaintext, plain);
});

test('判定: 対象外のヒル暗号を200字以上で入れると、試し解きが英文に戻らないことと、周期がないことを知らせる', () => {
  for (const start of [40000, 50000]) {
    const r = analyze(C.hill2Encrypt(EVAL.slice(start, start + PERIOD_CHECK_MIN + 100), [[3, 3], [2, 5]]));
    assert.ok(POLY_TYPES.includes(r.winner), r.winner);
    assert.equal(r.keyLength.periodFound, false);
    assert.equal(r.trial.englishLike, false);
    assert.ok(keys(r.notes).includes('note.trialFailed'));
    assert.equal(keys(r.notes).includes('note.noPeriod'), r.winner === 'vigenere');
  }
  // 試し解きで戻る暗号文には出さない
  assert.ok(!keys(analyze(C.vigenereEncrypt(EVAL.slice(40000, 40300), 'KEY')).notes).includes('note.trialFailed'));
});

test('試し解き: シーザー・アフィン・ボーフォート型は平文に戻り、平文・換字・転置には試し解きがない', () => {
  const plain = EVAL.slice(60000, 60300);
  const c = analyze(C.caesarEncrypt(plain, 5));
  assert.deepEqual([c.trial.type, c.trial.shift, c.trial.plaintext, c.trial.englishLike], ['caesar', 5, plain, true]);
  const a = analyze(C.affineEncrypt(plain, 25, 25));
  assert.deepEqual([a.trial.a, a.trial.b, a.trial.plaintext], [25, 25, plain]);
  const b = analyze(C.beaufortEncrypt(plain, 'WARD'));
  assert.equal(b.winner, 'vigenere');
  assert.deepEqual([b.trial.variant, b.trial.keyLength, b.trial.plaintext], ['beaufort', 4, plain]);
  for (const text of [plain, C.substitutionEncrypt(plain, C.keywordAlphabet('QUARTZ')), C.railFenceEncrypt(plain, 3)]) {
    assert.equal(analyze(text).trial, null);
  }
});

test('判定: 2段目は英字50字未満では使わず、短い多表式には見分けられないことを実測つきで知らせる', () => {
  let seen = 0;
  for (let i = 0; i < 60; i++) {
    const r = analyze(C.vigenereEncrypt(EVAL.slice(i * 97, i * 97 + 40), 'LEMON'));
    assert.equal(r.stage2, false);
    if (POLY_GROUP.includes(r.winner)) {
      seen++;
      const note = r.notes.find((n) => n.key === 'note.polyShort');
      assert.ok(note);
      assert.deepEqual([note.params.correct, note.params.predicted], Object.values(measuredGroupPrecision(MODEL, r.bucket.id)));
    }
  }
  assert.ok(seen > 0);
});

test('ポリュビオス暗号: 1〜5の数字の組だけなら字に戻して判定する（標準の表なら平文）', () => {
  const plain = EVAL.slice(80000, 80100);
  const digits = C.polybiusEncode(plain);
  const r = analyze(digits);
  assert.equal(r.ok, true);
  assert.equal(r.polybius.decoded, plain.replace(/J/g, 'I'));
  assert.equal(r.winner, 'plain');
  assert.equal(r.notes[0].key, 'note.polybius');
  const mixed = analyze(C.polybiusEncode(plain, C.playfairSquare('ZEBRA')));
  assert.equal(mixed.polybius.inner, 'substitution');
  assert.equal(polybiusDigits('12 34'), null);
  assert.equal(polybiusDigits(digits + ' 1'), null);
  assert.equal(polybiusDigits(digits.replace('1', '6')), null);
  assert.equal(polybiusDigits(digits + ' A'), null);
  assert.equal(polybiusDigits(digits.replace(/ /g, ',')), digits.replace(/ /g, ''));
});
