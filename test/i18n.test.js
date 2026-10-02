import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MESSAGES, t, setLanguage, getLanguage } from '../js/messages.js';
import { detectLanguage } from '../js/i18n.js';
import { HELP_CONTENT } from '../js/help-content.js';

const JP = /[　-ヿ㐀-鿿＀-￯]/;
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('日本語と英語の辞書は同じキーを持ち、置き場所（{name}）もそろう', () => {
  const ja = Object.keys(MESSAGES.ja).sort();
  const en = Object.keys(MESSAGES.en).sort();
  assert.deepEqual(en, ja);
  for (const k of ja) assert.deepEqual(placeholders(MESSAGES.en[k]), placeholders(MESSAGES.ja[k]), k);
});

test('英語の文言に日本語の文字がない（言語の切り替えボタンの「日本語」だけは例外）', () => {
  for (const [k, v] of Object.entries(MESSAGES.en)) {
    if (k === 'ui.langButton') continue;
    assert.doesNotMatch(v, JP, `${k}: ${v}`);
  }
  assert.equal(MESSAGES.en['ui.langButton'], '日本語');
  assert.equal(MESSAGES.ja['ui.langButton'], 'EN');
});

test('英語のヘルプに日本語の文字がなく、日本語と同じ組み立て用の要素を持つ', () => {
  assert.doesNotMatch(HELP_CONTENT.en, JP);
  for (const lang of ['ja', 'en']) {
    assert.match(HELP_CONTENT[lang], /<dl id="helpFeatures"/);
    assert.match(HELP_CONTENT[lang], /<table id="helpAccuracy"/);
    assert.doesNotMatch(HELP_CONTENT[lang], /\n/);
  }
  const count = (s, re) => (s.match(re) || []).length;
  assert.equal(count(HELP_CONTENT.en, /<section/g), count(HELP_CONTENT.ja, /<section/g));
  assert.equal(count(HELP_CONTENT.en, /<a /g), count(HELP_CONTENT.ja, /<a /g));
  // 英語は行の折り返しを空白1つにする（単語がつながらない）
  assert.ok(HELP_CONTENT.en.includes('estimates which classical cipher'));
});

test('index.html の data-i18n と data-i18n-attr のキーは、すべて辞書にある', () => {
  const keys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]);
  const attrs = [...html.matchAll(/data-i18n-attr="([^"]+)"/g)].flatMap((m) => m[1].split(';').map((p) => p.split(':')[1]));
  assert.ok(keys.length >= 25, String(keys.length));
  for (const k of [...keys, ...attrs]) {
    assert.ok(MESSAGES.ja[k], k);
    assert.ok(MESSAGES.en[k], k);
  }
});

test('file:// の案内と noscript は日本語と英語の両方を持つ', () => {
  assert.match(html, /<div data-lang="ja">/);
  assert.match(html, /<div data-lang="en" hidden>/);
  assert.match(html.slice(html.indexOf('<noscript>'), html.indexOf('</noscript>')), /This tool needs JavaScript/);
});

test('初期の言語: ?lang= → 保存した選択 → ブラウザーの言語（日本語以外は英語）', () => {
  assert.equal(detectLanguage('?lang=en', 'ja', 'ja-JP'), 'en');
  assert.equal(detectLanguage('?lang=ja', 'en', 'en-US'), 'ja');
  assert.equal(detectLanguage('?lang=fr', 'en', 'ja-JP'), 'en');
  assert.equal(detectLanguage('', null, 'ja-JP'), 'ja');
  assert.equal(detectLanguage('', null, 'en-GB'), 'en');
  assert.equal(detectLanguage('', null, 'fr'), 'en');
  assert.equal(detectLanguage('', 'xx', ''), 'en');
});

test('t() は今の言語で引き、配列は言語ごとの区切りでつなぐ', () => {
  setLanguage('en');
  try {
    assert.equal(getLanguage(), 'en');
    assert.equal(t('cipher.caesar'), 'Caesar cipher');
    assert.ok(t('period.candidates', { threshold: 0.058, list: [5, 10] }).endsWith('5, 10'));
    assert.equal(t('cipher.caesar', {}, 'ja'), 'シーザー暗号');
  } finally {
    setLanguage('ja');
  }
  assert.equal(setLanguage('xx'), 'ja');
});
