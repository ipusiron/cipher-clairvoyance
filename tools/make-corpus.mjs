// Project Gutenberg のテキストから、学習・評価に使う英字だけの抜粋を作る（開発用。画面では使わない）
// 使い方: node tools/make-corpus.mjs <pgXXXX.txt> <出力.txt>
// 本文（*** START OF … と *** END OF … の間）の英字を大文字でつなぎ、
// 前付け・序文を避けるため先頭の SKIP 字を除いた次の TAKE 字を、1行100字で書き出す。
import fs from 'node:fs';
import { createHash } from 'node:crypto';

export const SKIP = 30000;
export const TAKE = 200000;

export function excerpt(raw) {
  const text = raw.replace(/\r\n?/g, '\n');
  const start = text.indexOf('\n', text.indexOf('*** START OF'));
  const end = text.indexOf('*** END OF');
  if (start < 0 || end < 0 || end <= start) throw new Error('Project Gutenberg の本文の区切りが見つからない');
  const letters = text.slice(start, end).toUpperCase().replace(/[^A-Z]/g, '');
  if (letters.length < SKIP + TAKE) throw new Error('本文が短すぎる');
  const body = letters.slice(SKIP, SKIP + TAKE);
  const lines = [];
  for (let i = 0; i < body.length; i += 100) lines.push(body.slice(i, i + 100));
  return lines.join('\n') + '\n';
}

if (process.argv[1] && process.argv[1].endsWith('make-corpus.mjs')) {
  const [src, dst] = process.argv.slice(2);
  if (!src || !dst) {
    console.error('usage: node tools/make-corpus.mjs <pgXXXX.txt> <out.txt>');
    process.exit(2);
  }
  const raw = fs.readFileSync(src, 'utf8');
  const out = excerpt(raw);
  fs.writeFileSync(dst, out);
  const sha = (s) => createHash('sha256').update(s).digest('hex');
  console.log(`source sha256 ${sha(fs.readFileSync(src))}`);
  console.log(`output sha256 ${sha(out)} (${TAKE} letters)`);
}
