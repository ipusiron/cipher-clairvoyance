import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODEL } from '../js/model.js';
import { CIPHER_SAMPLES } from '../js/samples.js';
import { allToolUrls } from '../js/links.js';
import { MESSAGES } from '../js/messages.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const DOCS = {
  ja: {
    file: 'README.md',
    text: read('README.md'),
    accuracy: '📊 長さ別の正答率（実測）',
    related: '🔗 関連ツール',
    tree: '📁 ディレクトリー構造',
    about: '🛠️ このツールについて',
    day: '**Day044 - 生成AIで作るセキュリティツール100**',
    switcher: '[English](README.en.md) · 日本語',
    keyTop1: '1位が正解',
    keyTop3: '上位3つに正解',
    perClass: (n) => `${n}件ずつ`,
    samples: (n) => [`サンプル${n}件`, `${n}種類の練習用の暗号文`],
    images: /^assets\/screenshot\d*\.png$/
  },
  en: {
    file: 'README.en.md',
    text: read('README.en.md'),
    accuracy: '📊 Accuracy by length (measured)',
    related: '🔗 Related tools',
    tree: '📁 Directory structure',
    about: '🛠️ About this tool',
    day: '**Day044 - 100 Security Tools with Generative AI**',
    switcher: 'English · [日本語](README.md)',
    keyTop1: 'First candidate correct',
    keyTop3: 'Correct within the top 3',
    perClass: (n) => `${n} times`,
    samples: (n) => [`${n} samples`, `${n} practice ciphertexts`],
    images: /^assets\/en\/screenshot\d*\.png$/
  }
};
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

const headings = (md) => md.replace(/```[\s\S]*?```/g, '').split('\n').filter((l) => /^#{1,4} /.test(l));

test('YAML メタデータの構造（キーの順、ブロック形式のリスト、固定の値）。YAML は README.md だけに置く', () => {
  const m = DOCS.ja.text.match(/^<!--\n---\n([\s\S]*?)\n---\n-->\n/);
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
  assert.doesNotMatch(DOCS.en.text, /^<!--/);
});

test('日英の README は同じ見出しを同じ順に持つ（階層と絵文字がそろう）', () => {
  const ja = headings(DOCS.ja.text);
  const en = headings(DOCS.en.text);
  assert.equal(en.length, ja.length);
  ja.forEach((h, i) => {
    assert.equal(en[i].split(' ')[0], h.split(' ')[0], `${h} / ${en[i]}`);
    if (h.startsWith('## ')) assert.equal([...en[i].slice(3)][0], [...h.slice(3)][0], `${h} / ${en[i]}`);
  });
});

for (const [lang, d] of Object.entries(DOCS)) {
  test(`${d.file}: シリーズ標準の構成（Day表記・切り替えリンク・見出しの順・定型文のリンク）`, () => {
    assert.match(d.text, /^# Cipher Clairvoyance - /m);
    assert.ok(d.text.includes(d.day));
    assert.ok(d.text.includes(d.switcher));
    const heads = [...d.text.matchAll(/^## (.+)$/gm)].map((x) => x[1]);
    assert.ok(heads[0].startsWith('🌐'));
    assert.ok(heads[1].startsWith('📸'));
    assert.deepEqual(heads.slice(-4).map((h) => [...h][0]), ['📁', '💻', '📄', '🛠']);
    for (const icon of ['🎯', '🧪']) assert.ok(heads.some((h) => h.startsWith(icon)), icon);
    assert.match(section(d.text, d.about), /https:\/\/akademeia\.info\/\?page_id=42163/);
  });

  test(`${d.file}: 長さ別の正答率と鍵長の表は、モデルの評価と一致する`, () => {
    const sec = section(d.text, d.accuracy);
    for (const c of MODEL.classes) {
      const rows = tableRows(sec, MESSAGES[lang][`cipher.${c}`]);
      assert.equal(rows.length, 1, c);
      assert.deepEqual(rows[0].slice(1), MODEL.buckets.map((b) => pct(MODEL.evaluation[b.id].confusion[c][c], MODEL.evaluation[b.id].perClass)), c);
    }
    const key = (label, field) => {
      const rows = tableRows(sec, label);
      assert.equal(rows.length, 1, label);
      assert.deepEqual(rows[0].slice(1), MODEL.buckets.map((b) => pct(MODEL.evaluation[b.id].keyLength[field], MODEL.evaluation[b.id].keyLength.count)));
    };
    key(d.keyTop1, 'top1');
    key(d.keyTop3, 'top3');
    assert.ok(sec.includes(d.perClass(MODEL.evaluation.n20.perClass)));
  });

  test(`${d.file}: サンプルの件数と関連ツールの一覧が実装と一致する`, () => {
    for (const s of d.samples(CIPHER_SAMPLES.length)) assert.ok(d.text.includes(s), s);
    for (const u of allToolUrls()) assert.ok(section(d.text, d.related).includes(`(${u})`), u);
  });

  test(`${d.file}: ディレクトリー構造にすべてのファイルとディレクトリーが載り、全行に説明がある`, () => {
    const block = section(d.text, d.tree).match(/```\n([\s\S]*?)```/)[1];
    const lines = block.split('\n').filter(Boolean).slice(1);
    const listed = new Set();
    for (const line of lines) {
      const m = line.match(/^[│├└─\s]*([^\s#]+)\s+# (.+)$/);
      assert.ok(m, `説明のない行: ${line}`);
      listed.add(m[1].replace(/\/$/, ''));
    }
    const walk = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
      .filter((x) => !['.git', 'node_modules', '.claude'].includes(x.name))
      .flatMap((x) => (x.isDirectory() ? [x.name, ...walk(path.join(dir, x.name))] : [x.name]));
    for (const name of walk('.')) assert.ok(listed.has(name), `ツリーにない: ${name}`);
    const cols = new Set(lines.map((l) => l.indexOf(' # ')));
    assert.equal(cols.size, 1, [...cols].join(','));
  });
}

test('画像: 参照はすべて実在し、日本語版は assets/、英語版は assets/en/ の画像を使う。参照していない PNG は置かない', () => {
  const refs = {};
  for (const [lang, d] of Object.entries(DOCS)) {
    refs[lang] = [...d.text.matchAll(/!\[[^\]]*\]\((assets\/[^)]+)\)/g)].map((m) => m[1]);
    assert.ok(refs[lang].length >= 4, lang);
    for (const r of refs[lang]) {
      assert.ok(fs.existsSync(path.join(ROOT, r)), r);
      assert.match(r, d.images, r);
    }
  }
  const pngs = (dir) => fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.png')).map((f) => `${dir}/${f}`).sort();
  assert.deepEqual(pngs('assets'), [...new Set(refs.ja)].sort());
  assert.deepEqual(pngs('assets/en'), [...new Set(refs.en)].sort());
});

test('ALGORITHM.md の典型値の表は、400字以上の長さ帯のモデルの平均と一致する', () => {
  const algorithm = read('ALGORITHM.md');
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
