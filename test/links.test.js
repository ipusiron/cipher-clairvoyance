import test from 'node:test';
import assert from 'node:assert/strict';
import { buildToolLinks, LINKS_BY_TYPE, allToolUrls, BASE, MAX_PERIOD } from '../js/links.js';
import { MODEL } from '../js/model.js';

const byId = (links, id) => links.find((l) => l.id === id);

test('判定した方式ごとに関連ツールを出す（英語の平文・ADFGVX・ポリュビオスは出さない）', () => {
  for (const c of MODEL.classes.filter((x) => x !== 'plain')) assert.ok(LINKS_BY_TYPE[c].length >= 1, c);
  assert.deepEqual(buildToolLinks('plain', 'ABC'), []);
  assert.deepEqual(buildToolLinks('adfgvx', 'ADFG'), []);
  for (const url of allToolUrls()) assert.ok(url.startsWith(BASE) && url.endsWith('/'), url);
});

test('Day009 には ?text= で英字を渡す（URLSearchParams で1回デコードすると元に戻る）', () => {
  const link = byId(buildToolLinks('caesar', 'WKLVLVDWHVW'), 'frequency');
  const url = new URL(link.pass.href);
  assert.equal(url.origin + url.pathname, `${BASE}frequency-analyzer/`);
  assert.equal(url.searchParams.get('text'), 'WKLVLVDWHVW');
  assert.equal(link.pass.via, 'query');
});

test('上限を超える長さは渡さない（Day009 は5,000字まで）', () => {
  assert.equal(byId(buildToolLinks('caesar', 'A'.repeat(5000)), 'frequency').pass.tooLong, false);
  const over = byId(buildToolLinks('caesar', 'A'.repeat(5001)), 'frequency').pass;
  assert.equal(over.tooLong, true);
  assert.equal(over.href, null);
});

test('Day030 には周期 n（1〜20）を添える。周期がなければ受け渡しを出さない', () => {
  const ok = byId(buildToolLinks('vigenere', 'LXFOPVEFRNHR', 5), 'divider');
  const url = new URL(ok.pass.href);
  assert.equal(url.searchParams.get('text'), 'LXFOPVEFRNHR');
  assert.equal(url.searchParams.get('n'), '5');
  assert.equal(ok.pass.period, 5);
  assert.equal(byId(buildToolLinks('vigenere', 'ABC', MAX_PERIOD + 1), 'divider').pass, null);
  assert.equal(byId(buildToolLinks('vigenere', 'ABC', null), 'divider').pass, null);
  assert.ok(byId(buildToolLinks('vigenere', 'ABC', null), 'vigenere').pass.href.includes('?text=ABC'));
});

test('Day043 には「#」より後ろで渡し、解読ラボ・埋字なしで開く', () => {
  const link = byId(buildToolLinks('transposition', 'EVLNACDTESEAROFODEECWIREE'), 'columnar');
  const url = new URL(link.pass.href);
  assert.equal(url.search, '');
  const params = new URLSearchParams(url.hash.slice(1));
  assert.deepEqual([params.get('tab'), params.get('c'), params.get('m')], ['lab', 'EVLNACDTESEAROFODEECWIREE', 'incomplete']);
  assert.equal(link.pass.via, 'fragment');
});
