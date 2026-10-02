import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 1行に詰め込んだ（minify した）ファイルを検出する
const ROOT = new URL('..', import.meta.url);
const files = (dir, ext) => fs.readdirSync(new URL(dir, ROOT)).filter((f) => f.endsWith(ext)).map((f) => `${dir}${f}`);
const lines = (f) => fs.readFileSync(new URL(f, ROOT), 'utf8').split(/\r?\n/);

test('JS・CSS・テスト・道具の最長行は160文字以下、index.html は250文字以下', () => {
  const targets = [...files('js/', '.js'), ...files('test/', '.js'), ...files('tools/', '.mjs'), 'style.css'];
  for (const f of targets) {
    const long = lines(f).findIndex((l) => l.length > 160);
    assert.equal(long, -1, `${f}:${long + 1}`);
  }
  assert.equal(lines('index.html').findIndex((l) => l.length > 250), -1);
});

test('主要ファイルの行数の下限（詰め込み・取り違えの検出）', () => {
  const min = { 'index.html': 150, 'style.css': 600, 'js/app.js': 120, 'js/ui.js': 200, 'js/cipher-core.js': 150, 'js/features.js': 80, 'js/model.js': 250 };
  for (const [f, n] of Object.entries(min)) assert.ok(lines(f).length >= n, `${f}: ${lines(f).length}`);
});
