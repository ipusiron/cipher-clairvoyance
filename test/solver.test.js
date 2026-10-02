import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as C from '../js/cipher-core.js';
import { solveCaesar, solveAffine, solveVigenere, solveAutokey, solveHill2, defaultKeyLengths, MAX_KEY_LENGTH } from '../js/solver.js';
import { decide, STAGE2_MIN, STAGE2_TYPES } from '../js/decide.js';
import { extractFeatures } from '../js/features.js';
import { MODEL } from '../js/model.js';

const EVAL = fs.readFileSync(new URL('../tools/corpus/eval-pg98.txt', import.meta.url), 'utf8').replace(/\s/g, '');
const E = MODEL.english;
const PLAIN = EVAL.slice(120000, 120400);

test('シーザー・アフィンの試し解きは、全部の鍵で平文に戻る', () => {
  for (let k = 1; k < 26; k++) assert.equal(solveCaesar(C.caesarEncrypt(PLAIN, k), E).shift, k);
  for (const a of C.AFFINE_A) {
    for (const b of [0, 13, 25]) {
      const r = solveAffine(C.affineEncrypt(PLAIN, a, b), E);
      assert.deepEqual([r.a, r.b, r.plaintext], [a, b, PLAIN]);
    }
  }
});

test('ヴィジュネル型の試し解き: 鍵長2〜20の鍵を当てる', () => {
  for (const key of ['GO', 'LEMON', 'CRYPTOGRAPHY', 'ABCDEFGHIJKL', 'DECLARATIONOFLIBERTY']) {
    const r = solveVigenere(C.vigenereEncrypt(PLAIN, key), E);
    assert.deepEqual([r.variant, r.key, r.plaintext], ['vigenere', key, PLAIN]);
  }
});

test('ボーフォート型の試し解き: 各列を逆向きにして平文に戻す（鍵の表し方は示さない）', () => {
  const r = solveVigenere(C.beaufortEncrypt(PLAIN, 'WARDROBE'), E);
  assert.deepEqual([r.variant, r.keyLength, r.key, r.plaintext], ['beaufort', 8, null, PLAIN]);
});

test('オートキーの試し解き: プライマーの長さと字を当てる', () => {
  for (const primer of ['K', 'QXZ', 'FREEDOM', 'ABCDEFGHIJ']) {
    const r = solveAutokey(C.autokeyEncrypt(PLAIN, primer), E);
    assert.deepEqual([r.primer, r.primerLength, r.plaintext], [primer, primer.length, PLAIN]);
  }
});

test('ヒル暗号（2×2）の試し解き: 鍵の行列と逆行列を当てる', () => {
  for (const key of [[[3, 3], [2, 5]], [[5, 8], [17, 3]], [[1, 2], [3, 9]]]) {
    const r = solveHill2(C.hill2Encrypt(PLAIN, key), E);
    assert.deepEqual([r.key, r.plaintext], [key, PLAIN]);
    assert.deepEqual(C.inverse2(r.key), r.inverse);
  }
  assert.equal(solveHill2('AB', E), null);
});

test('鍵長の候補は MAX_KEY_LENGTH 以下から最大3つ。なければ1を試す', () => {
  const list = defaultKeyLengths(C.vigenereEncrypt(PLAIN, 'LEMON'));
  assert.ok(list.length >= 1 && list.length <= 3);
  assert.ok(list.every((k) => k <= MAX_KEY_LENGTH));
  assert.equal(list[0], 5);
  assert.deepEqual(defaultKeyLengths('ABCDEFG'), [1]);
});

test('2段目: 英字 STAGE2_MIN 字以上で1位がヴィジュネル・オートキー・ヒルのどれかなら、3つとも試し解きして英語らしい方を1位にする', () => {
  assert.deepEqual(STAGE2_TYPES, ['vigenere', 'autokey', 'hill']);
  const cases = [
    ['vigenere', C.vigenereEncrypt(PLAIN, 'ATTIC')],
    ['autokey', C.autokeyEncrypt(PLAIN, 'ATTIC')],
    ['hill', C.hill2Encrypt(PLAIN, [[3, 3], [2, 5]])]
  ];
  for (const [type, c] of cases) {
    const d = decide(c, extractFeatures(c, E).vector, MODEL);
    assert.equal(d.winner, type);
    assert.ok(d.stage2);
    assert.deepEqual([...d.types.slice(0, 3)].sort(), [...STAGE2_TYPES].sort());
    assert.ok(STAGE2_TYPES.includes(d.second));
    assert.equal(d.close, false);
  }
  const short = C.vigenereEncrypt(PLAIN.slice(0, STAGE2_MIN - 1), 'ATTIC');
  assert.equal(decide(short, extractFeatures(short, E).vector, MODEL).stage2, null);
  const caesar = C.caesarEncrypt(PLAIN, 3);
  assert.equal(decide(caesar, extractFeatures(caesar, E).vector, MODEL).stage2, null);
});
