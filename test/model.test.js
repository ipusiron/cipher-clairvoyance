import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MODEL } from '../js/model.js';
import { FEATURES } from '../js/features.js';
import { MIN_LETTERS } from '../js/analysis.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const corpus = (name) => fs.readFileSync(new URL(`../tools/corpus/${name}`, import.meta.url), 'utf8');

test('js/model.js は tools/build-model.mjs の出力と一致する（手で編集されていない）', () => {
  const r = spawnSync(process.execPath, ['tools/build-model.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr + r.stdout);
});

test('学習用・評価用の英文の抜粋は、英字20万字ずつで、別の作品から取っている', () => {
  // SHA-256 は tools/make-corpus.mjs で作ったときの値（改行は LF）
  const expected = {
    'train-pg1342.txt': '0058113bb7d757db86c417cf702f7d49f796a3b6f7a69abe24a588486803204b',
    'eval-pg98.txt': '9025ea7278adebfe2db384a792da4ddb3e9a60f7cff82ee2c208a9ff19ae5e91'
  };
  for (const [name, sha] of Object.entries(expected)) {
    const text = corpus(name).replace(/\r\n/g, '\n');
    assert.equal(createHash('sha256').update(text).digest('hex'), sha, name);
    const letters = text.replace(/\n/g, '');
    assert.equal(letters.length, 200000);
    assert.match(letters, /^[A-Z]+$/);
  }
  assert.ok(!corpus('train-pg1342.txt').includes(corpus('eval-pg98.txt').slice(0, 300)));
});

test('モデルの形: 長さ帯は MIN_LETTERS から切れ目なく続き、方式×特徴量の数がそろう', () => {
  assert.equal(MODEL.buckets[0].min, MIN_LETTERS);
  for (let i = 1; i < MODEL.buckets.length; i++) assert.equal(MODEL.buckets[i].min, MODEL.buckets[i - 1].max + 1);
  assert.equal(MODEL.buckets.at(-1).max, null);
  assert.deepEqual(MODEL.features, FEATURES.map((f) => f.id));
  for (const b of MODEL.buckets) {
    for (const c of MODEL.classes) {
      const p = MODEL.params[b.id][c];
      assert.equal(p.mean.length, FEATURES.length);
      FEATURES.forEach((f, i) => {
        if (f.kind === 'bernoulli') assert.ok(p.mean[i] > 0 && p.mean[i] < 1, `${b.id} ${c} ${f.id}`);
        else assert.ok(p.var[i] > 0, `${b.id} ${c} ${f.id}`);
      });
    }
  }
});

test('英語の統計: 出現率の合計は1、2文字の組の確率は676個', () => {
  const sum = MODEL.english.freq.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-4, String(sum));
  assert.equal(MODEL.english.freq.length, 26);
  assert.equal(MODEL.english.bigram.length, 676);
  // E と T は英語で多い字
  const top = MODEL.english.freq.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 2).map((x) => String.fromCharCode(65 + x[1]));
  assert.deepEqual(top.sort(), ['E', 'T']);
});

test('評価: 件数がそろい、50字以上の長さ帯では各方式の再現率が80%以上、100字以上では95%以上', () => {
  for (const b of MODEL.buckets) {
    const e = MODEL.evaluation[b.id];
    for (const t of MODEL.classes) {
      const row = Object.values(e.confusion[t]).reduce((a, x) => a + x, 0);
      assert.equal(row, e.perClass);
      const recall = e.confusion[t][t] / e.perClass;
      if (b.min >= 100) assert.ok(recall >= 0.95, `${b.id} ${t} ${recall}`);
      else if (b.min >= 50) assert.ok(recall >= 0.8, `${b.id} ${t} ${recall}`);
    }
    assert.equal(e.close.count + e.clear.count, e.perClass * MODEL.classes.length);
    assert.equal(e.keyLength.count, e.perClass);
  }
  const last = MODEL.evaluation[MODEL.buckets.at(-1).id].keyLength;
  assert.ok(last.top1 / last.count >= 0.95);
});
