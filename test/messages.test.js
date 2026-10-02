import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MESSAGES, t } from '../js/messages.js';
import { MODEL } from '../js/model.js';
import { FEATURES } from '../js/features.js';
import { CIPHER_SAMPLES } from '../js/samples.js';
import { buildToolLinks, LINKS_BY_TYPE } from '../js/links.js';

const ja = MESSAGES.ja;
const read = (f) => fs.readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');

test('t(): 置き場所に値を入れ、配列は「、」でつなぐ。ない鍵はキーをそのまま返す', () => {
  assert.equal(t('error.tooFewLetters', { letters: 3, min: 20 }), '英字が3字しかありません。判定には20字以上が必要です。');
  assert.equal(t('period.candidates', { threshold: 0.058, list: [5, 10, 15] }).endsWith('5、10、15'), true);
  assert.equal(t('no.such.key'), 'no.such.key');
  assert.equal(t('input.count', { letters: 1 }), '英字1字（判定には{min}字以上が必要）');
});

test('判定・特徴量・サンプル・関連ツールの文言がそろっている', () => {
  for (const c of [...MODEL.classes, 'adfgvx', 'adfgx']) {
    assert.ok(ja[`cipher.${c}`], c);
    assert.ok(ja[`desc.${c}`], c);
  }
  for (const f of FEATURES) {
    assert.ok(ja[`feature.${f.id}`], f.id);
    assert.ok(ja[`featureHelp.${f.id}`], f.id);
  }
  for (const s of CIPHER_SAMPLES) {
    assert.ok(ja[`sample.name.${s.id}`], s.id);
    assert.ok(ja[`sample.desc.${s.id}`], s.id);
    for (const k of Object.keys(s.params)) assert.ok(ja[`sample.param.${k}`], k);
  }
  for (const type of Object.keys(LINKS_BY_TYPE)) {
    for (const link of buildToolLinks(type, 'ABC', 5)) {
      assert.ok(ja[link.key], link.key);
      if (link.pass) assert.ok(ja[link.pass.key], link.pass.key);
    }
  }
});

test('コードの中で t() に直接書いたキーは、すべて辞書にある', () => {
  const files = ['app.js', 'ui.js', 'visualization.js', 'analysis.js', 'theme.js', 'i18n.js'];
  let found = 0;
  for (const f of files) {
    for (const m of read(f).matchAll(/\bt\('([A-Za-z.]+)'/g)) { found++; assert.ok(ja[m[1]], `${f}: ${m[1]}`); }
    for (const m of read(f).matchAll(/key: '([A-Za-z.]+)'/g)) { found++; assert.ok(ja[m[1]], `${f}: ${m[1]}`); }
  }
  assert.ok(found > 40, String(found));
});

test('ロジックと画面の JS には日本語の文字列を書かない（文言は messages.js に集める）', () => {
  const jp = /[　-ヿ㐀-鿿＀-￯]/;
  const logic = ['app.js', 'ui.js', 'visualization.js', 'analysis.js', 'classifier.js', 'features.js', 'keylength.js', 'cipher-core.js'];
  for (const f of [...logic, 'decide.js', 'solver.js', 'links.js', 'i18n.js', 'theme.js']) {
    const code = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    const hit = code.split('\n').find((line) => jp.test(line));
    assert.equal(hit, undefined, `${f}: ${hit}`);
  }
});
