import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js = (f) => fs.readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');

test('CSP: インラインのスクリプト・スタイルを許さず、外部への送信先を持たない', () => {
  const m = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
  assert.ok(m);
  const csp = m[1];
  for (const d of ["default-src 'self'", "script-src 'self'", "style-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"]) {
    assert.ok(csp.includes(d), d);
  }
  assert.ok(!csp.includes('unsafe-inline'));
  assert.ok(!csp.includes('unsafe-eval'));
  // frame-ancestors は meta では効かないので書かない
  assert.ok(!csp.includes('frame-ancestors'));
  assert.match(html, /<meta name="referrer" content="no-referrer">/);
});

test('インラインのイベントハンドラー・style 属性・インラインのスクリプトがない', () => {
  assert.doesNotMatch(html, /\son[a-z]+="/i);
  assert.doesNotMatch(html, /\sstyle="/i);
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    assert.match(m[1], /src="/);
    assert.equal(m[2].trim(), '');
  }
  for (const f of ['app.js', 'ui.js', 'visualization.js', 'help-content.js', 'theme.js']) {
    assert.doesNotMatch(js(f), /style="|\.cssText|setAttribute\('style'/, f);
  }
});

test('読み込み順: テーマの初期化はスタイルより前、本体は module、file:// の案内は通常スクリプト', () => {
  const order = ['js/theme-init.js', 'style.css', 'js/app.js'].map((s) => html.indexOf(s));
  assert.ok(order.every((i) => i > 0));
  assert.ok(order[0] < order[1] && order[1] < order[2]);
  assert.match(html, /<script type="module" src="js\/app.js"><\/script>/);
  assert.match(html, /<script src="js\/file-check.js" defer><\/script>/);
  assert.match(html, /<noscript>/);
  assert.match(js('app.js'), /setAttribute\('data-ready', 'true'\)/);
});

test('画面の要素の id がそろっている', () => {
  const ids = ['btnTheme', 'btnHelp', 'btnSampleSelect', 'cipherText', 'inputCount', 'inputError', 'inputNotes', 'btnAnalyze', 'btnClear',
    'mainResult', 'staleNote', 'srStatus', 'winnerName', 'winnerDesc', 'measuredLabel', 'confidenceLevel', 'confidenceText', 'measuredNote',
    'resultNotes', 'otherPossibilities', 'evidenceContent', 'toolLinks', 'toggleDetails', 'detailsSection', 'basicStats', 'freqChart',
    'freqTable', 'freqTableSummary', 'periodChart', 'keyLengthInfo', 'kasiskiChart', 'kasiskiInfo', 'sampleModal', 'modalClose', 'sampleList',
    'helpModal', 'helpModalClose', 'fileNotice'];
  for (const id of ids) assert.equal(html.split(`id="${id}"`).length - 1, 1, id);
});

test('ボタンには type、モーダルには dialog の役割と見出し、外部リンクには noopener noreferrer', () => {
  for (const m of html.matchAll(/<button\b[^>]*>/g)) assert.match(m[0], /type="button"/, m[0]);
  for (const id of ['sampleModal', 'helpModal']) {
    const tag = html.match(new RegExp(`<div id="${id}"[^>]*>`))[0];
    assert.match(tag, /role="dialog"/);
    assert.match(tag, /aria-modal="true"/);
    assert.match(tag, /aria-labelledby="/);
  }
  for (const src of [html, js('help-content.js')]) {
    for (const m of src.matchAll(/<a\b[^>]*href="https?:[^"]*"[^>]*>/g)) assert.match(m[0], /rel="noopener noreferrer"/, m[0]);
  }
  assert.match(js('ui.js'), /a\.rel = 'noopener noreferrer'/);
});

test('ユーザーの入力は innerHTML に入れない（innerHTML は静的なヘルプ本文だけ）', () => {
  for (const f of ['app.js', 'ui.js', 'visualization.js', 'theme.js']) {
    const uses = [...js(f).matchAll(/\.innerHTML\s*=\s*([^;]+);/g)].map((m) => m[1].trim());
    for (const u of uses) assert.equal(u, 'HELP_CONTENT', `${f}: ${u}`);
  }
});
