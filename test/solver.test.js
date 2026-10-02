import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as C from '../js/cipher-core.js';
import { solveCaesar, solveAffine, solveVigenere, solveAutokey, defaultKeyLengths, MAX_KEY_LENGTH } from '../js/solver.js';
import { decide, STAGE2_MIN } from '../js/decide.js';
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

test('ヴィジュネル型の試し解き: 鍵長2〜12の鍵を当てる', () => {
  for (const key of ['GO', 'LEMON', 'CRYPTOGRAPHY', 'ABCDEFGHIJKL']) {
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

test('鍵長の候補は MAX_KEY_LENGTH 以下から最大3つ。なければ1を試す', () => {
  const list = defaultKeyLengths(C.vigenereEncrypt(PLAIN, 'LEMON'));
  assert.ok(list.length >= 1 && list.length <= 3);
  assert.ok(list.every((k) => k <= MAX_KEY_LENGTH));
  assert.equal(list[0], 5);
  assert.deepEqual(defaultKeyLengths('ABCDEFG'), [1]);
});

test('2段目: 英字 STAGE2_MIN 字以上で1位が多表式なら、試し解きで英語らしい方を1位にする', () => {
  const vig = C.vigenereEncrypt(PLAIN, 'ATTIC');
  const auto = C.autokeyEncrypt(PLAIN, 'ATTIC');
  const dv = decide(vig, extractFeatures(vig, E).vector, MODEL);
  const da = decide(auto, extractFeatures(auto, E).vector, MODEL);
  assert.deepEqual([dv.winner, dv.second], ['vigenere', 'autokey']);
  assert.deepEqual([da.winner, da.second], ['autokey', 'vigenere']);
  assert.ok(dv.stage2 && da.stage2);
  assert.equal(dv.close, false);
  const short = C.vigenereEncrypt(PLAIN.slice(0, STAGE2_MIN - 1), 'ATTIC');
  assert.equal(decide(short, extractFeatures(short, E).vector, MODEL).stage2, null);
  const caesar = C.caesarEncrypt(PLAIN, 3);
  assert.equal(decide(caesar, extractFeatures(caesar, E).vector, MODEL).stage2, null);
});
