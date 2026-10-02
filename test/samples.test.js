import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as C from '../js/cipher-core.js';
import { CIPHER_SAMPLES, SAMPLE_PLAINTEXT } from '../js/samples.js';
import { analyze } from '../js/analysis.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('js/samples.js は tools/build-samples.mjs の出力と一致する（手で編集されていない）', () => {
  const r = spawnSync(process.execPath, ['tools/build-samples.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr + r.stdout);
});

test('平文はアメリカ独立宣言の冒頭（英字604字）', () => {
  assert.equal(SAMPLE_PLAINTEXT.length, 604);
  assert.ok(SAMPLE_PLAINTEXT.startsWith('WHENINTHECOURSEOFHUMANEVENTS'));
  assert.ok(SAMPLE_PLAINTEXT.endsWith('CONSENTOFTHEGOVERNED'));
});

// サンプルを書かれた鍵で復号すると平文に戻る（鍵の表示と暗号文が食い違っていないことの確認）
function decrypt(sample) {
  const c = C.lettersOnly(sample.ciphertext);
  const p = sample.params;
  switch (sample.id) {
    case 'plain': return c;
    case 'caesar': case 'caesarShort': return C.caesarDecrypt(c, p.shift);
    case 'affine': return C.affineDecrypt(c, p.a, p.b);
    case 'substitution': return C.substitutionDecrypt(c, C.keywordAlphabet(p.keyword));
    case 'vigenere': case 'vigenereShort': return C.vigenereDecrypt(c, p.keyword);
    case 'playfair': return C.playfairDecrypt(c, C.playfairSquare(p.keyword));
    case 'railfence': return C.railFenceDecrypt(c, p.rails);
    case 'columnar': return C.columnarDecrypt(c, p.keyword);
    case 'autokey': return C.autokeyDecrypt(c, p.primer);
    case 'beaufort': return C.beaufortEncrypt(c, p.keyword);
    case 'trapShortVigenere': return C.vigenereDecrypt(c, p.keyword);
    default: return null;
  }
}

test('各サンプルを書かれた鍵で復号すると平文に戻る', () => {
  for (const s of CIPHER_SAMPLES) {
    const expected = ['caesarShort', 'trapShortVigenere'].includes(s.id) ? SAMPLE_PLAINTEXT.slice(0, 30)
      : s.id === 'playfair' ? C.playfairDigrams(SAMPLE_PLAINTEXT).join('') : SAMPLE_PLAINTEXT;
    if (s.id === 'adfgvx') {
      assert.equal(C.lettersOnly(s.ciphertext), C.adfgvxEncrypt(SAMPLE_PLAINTEXT, s.params.square, s.params.keyword));
      assert.equal(C.lettersOnly(s.ciphertext).length, SAMPLE_PLAINTEXT.length * 2);
      continue;
    }
    if (s.id === 'bifid') {
      assert.equal(C.lettersOnly(s.ciphertext), C.bifidEncrypt(SAMPLE_PLAINTEXT, C.playfairSquare(s.params.keyword)));
      continue;
    }
    if (s.id === 'trapHill') {
      assert.equal(C.lettersOnly(s.ciphertext), C.hill2Encrypt(SAMPLE_PLAINTEXT, [[3, 3], [2, 5]]));
      assert.equal(s.params.matrix, '3 3 / 2 5');
      continue;
    }
    if (s.id === 'polybius') {
      assert.equal(C.polybiusDecode(s.ciphertext), SAMPLE_PLAINTEXT.replace(/J/g, 'I'));
      continue;
    }
    assert.equal(decrypt(s), expected, s.id);
  }
});

test('暗号文は5文字ずつ（ポリュビオス暗号は数字2つずつ）区切って書いてある', () => {
  for (const s of CIPHER_SAMPLES) {
    if (s.id === 'polybius') {
      assert.ok(s.ciphertext.split(/\s+/).every((g) => /^[1-5]{2}$/.test(g)));
      continue;
    }
    const groups = s.ciphertext.split(/\s+/);
    for (const g of groups.slice(0, -1)) assert.equal(g.length, 5, s.id);
    assert.ok(groups.at(-1).length >= 1 && groups.at(-1).length <= 5);
  }
});

test('各サンプルは意図した方式と判定される', () => {
  for (const s of CIPHER_SAMPLES) {
    const r = analyze(s.ciphertext);
    assert.equal(r.ok, true, s.id);
    if (s.type === 'trap') assert.equal(r.winner, s.expect, s.id);
    else if (s.type === 'polybius') assert.deepEqual([Boolean(r.polybius), r.winner], [true, 'plain']);
    else assert.equal(r.winner, s.type, s.id);
    if (s.type !== 'trap') assert.equal(s.expect, undefined);
  }
});

test('ID は重複しない', () => {
  assert.equal(new Set(CIPHER_SAMPLES.map((s) => s.id)).size, CIPHER_SAMPLES.length);
});
