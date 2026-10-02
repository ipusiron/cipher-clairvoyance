import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODEL } from '../js/model.js';
import { CIPHER_SAMPLES } from '../js/samples.js';
import { TOOL_LINKS } from '../js/ui.js';
import { t } from '../js/messages.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8').replace(/\r\n/g, '\n');
const algorithm = fs.readFileSync(path.join(ROOT, 'ALGORITHM.md'), 'utf8').replace(/\r\n/g, '\n');
const pct = (a, b) => `${Math.round((a / b) * 100)}%`;

// 見出し（## ）の後ろから、次の ## までを取り出す
function section(md, heading) {
  const i = md.indexOf(`\n## ${heading}`);
  assert.ok(i >= 0, heading);
  const rest = md.slice(i + 1);
  const end = rest.indexOf('\n## ', 3);
  return end < 0 ? rest : rest.slice(0, end);
}

// Markdown の表の行（| で始まる行）を、セルの配列にする
function tableRows(text, firstCell) {
  return text.split('\n').filter((l) => l.startsWith('| ')).map((l) => l.slice(2, -2).split(' | ')).filter((r) => r[0] === firstCell || !firstCell);
}

test('YAML メタデータの構造（キーの順、ブロック形式のリスト、固定の値）', () => {
  const m = readme.match(/^<!--\n---\n([\s\S]*?)\n---\n-->\n/);
  assert.ok(m, 'YAML block');
  const yaml = m[1];
  const keys = [...yaml.matchAll(/^([a-z_]+):/gm)].map((x) => x[1]);
  assert.deepEqual(keys, ['id', 'slug', 'title', 'subtitle_ja', 'subtitle_en', 'description_ja', 'description_en',
    'category_ja', 'category_en', 'difficulty', 'tags', 'repo_url', 'demo_url', 'hub']);
  for (const k of ['category_ja', 'category_en', 'tags']) assert.match(yaml, new RegExp(`^${k}:\\n  - `, 'm'), k);
  assert.match(yaml, /^id: day044$/m);
  assert.match(yaml, /^slug: cipher-clairvoyance$/m);
  assert.match(yaml, /^repo_url: "https:\/\/github.com\/ipusiron\/cipher-clairvoyance"$/m);
  assert.match(yaml, /^demo_url: "https:\/\/ipusiron.github.io\/cipher-clairvoyance\/"$/m);
  assert.match(yaml, /^hub: true$/m);
});

test('シリーズ標準の構成（Day表記・見出しの順・定型文のリンク）', () => {
  assert.match(readme, /^# Cipher Clairvoyance - /m);
  assert.match(readme, /\*\*Day044 - 生成AIで作るセキュリティツール100\*\*/);
  const heads = [...readme.matchAll(/^## (.+)$/gm)].map((x) => x[1]);
  assert.equal(heads[0], '🌐 デモページ');
  assert.equal(heads[1], '📸 スクリーンショット');
  assert.deepEqual(heads.slice(-4), ['📁 ディレクトリー構造', '💻 動作環境', '📄 ライセンス', '🛠️ このツールについて']);
  for (const h of ['🎯 ユースケース', '🧪 テスト']) assert.ok(heads.includes(h), h);
  assert.match(section(readme, '🛠️ このツールについて'), /https:\/\/akademeia\.info\/\?page_id=42163/);
});

test('長さ別の正答率の表は、モデルの評価と一致する', () => {
  const sec = section(readme, '📊 長さ別の正答率（実測）');
  for (const c of MODEL.classes) {
    const rows = tableRows(sec, t(`cipher.${c}`));
    assert.equal(rows.length, 1, c);
    const expected = MODEL.buckets.map((b) => pct(MODEL.evaluation[b.id].confusion[c][c], MODEL.evaluation[b.id].perClass));
    assert.deepEqual(rows[0].slice(1), expected, c);
  }
  const key = (label, field) => {
    const rows = tableRows(sec, label);
    assert.equal(rows.length, 1, label);
    assert.deepEqual(rows[0].slice(1), MODEL.buckets.map((b) => pct(MODEL.evaluation[b.id].keyLength[field], MODEL.evaluation[b.id].keyLength.count)));
  };
  key('1位が正解', 'top1');
  key('上位3つに正解', 'top3');
  assert.ok(sec.includes(`${MODEL.evaluation.n20.perClass}件ずつ`));
});

test('ALGORITHM.md の典型値の表は、400字以上の長さ帯のモデルの平均と一致する', () => {
  const names = {
    plain: '英語の平文', caesar: 'シーザー', affine: 'アフィン', substitution: '単一換字', vigenere: 'ヴィジュネル',
    autokey: 'オートキー', playfair: 'プレイフェア', bifid: 'バイフィッド', transposition: '転置'
  };
  const start = algorithm.indexOf('| 方式 | ic |');
  assert.ok(start >= 0);
  const typical = algorithm.slice(start, algorithm.indexOf('\n---', start));
  for (const c of MODEL.classes) {
    const rows = tableRows(typical, names[c]);
    assert.equal(rows.length, 1, c);
    const got = rows[0].slice(1).map((v) => Number(v.replace('−', '-')));
    assert.deepEqual(got, MODEL.params.n400[c].mean.map((v) => Number(v.toPrecision(3))), c);
  }
});

test('サンプルの件数と関連ツールの一覧が実装と一致する', () => {
  assert.ok(readme.includes(`サンプル${CIPHER_SAMPLES.length}件`));
  assert.ok(readme.includes(`${CIPHER_SAMPLES.length}種類の練習用の暗号文`));
  const urls = new Set(Object.values(TOOL_LINKS).flat().map(([, p]) => `https://ipusiron.github.io/${p}`));
  for (const u of urls) assert.ok(section(readme, '🔗 関連ツール').includes(`(${u})`), u);
});

test('画像の参照はすべて実在し、assets の PNG は README から参照しているものだけ', () => {
  const refs = [...readme.matchAll(/!\[[^\]]*\]\((assets\/[^)]+)\)/g)].map((m) => m[1]);
  assert.ok(refs.length >= 3);
  for (const r of refs) assert.ok(fs.existsSync(path.join(ROOT, r)), r);
  const pngs = fs.readdirSync(path.join(ROOT, 'assets')).filter((f) => f.endsWith('.png')).map((f) => `assets/${f}`);
  assert.deepEqual(pngs.sort(), [...new Set(refs)].sort());
});

test('ディレクトリー構造: すべてのファイルとディレクトリーが載り、全行に説明がある', () => {
  const block = section(readme, '📁 ディレクトリー構造').match(/```\n([\s\S]*?)```/)[1];
  const lines = block.split('\n').filter(Boolean).slice(1);
  const listed = new Set();
  for (const line of lines) {
    const m = line.match(/^[│├└─\s]*([^\s#]+)\s+# (.+)$/);
    assert.ok(m, `説明のない行: ${line}`);
    listed.add(m[1].replace(/\/$/, ''));
  }
  const walk = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
    .filter((d) => !['.git', 'node_modules', '.claude'].includes(d.name))
    .flatMap((d) => (d.isDirectory() ? [d.name, ...walk(path.join(dir, d.name))] : [d.name]));
  for (const name of walk('.')) assert.ok(listed.has(name), `ツリーにない: ${name}`);
  // # の桁がそろっている
  const cols = new Set(lines.map((l) => l.indexOf(' # ')));
  assert.equal(cols.size, 1, [...cols].join(','));
});
