// サンプル暗号文 js/samples.js を作る（開発用。画面では使わない）
// 使い方: node tools/build-samples.mjs          … js/samples.js を書き出す
//         node tools/build-samples.mjs --check  … 書き出す内容が今の js/samples.js と同じかを確かめる（テストで使う）
// 平文はアメリカ独立宣言（1776年）の冒頭。米国でパブリックドメイン。
// 暗号文はすべて js/cipher-core.js の参照実装で作り、5文字ずつ区切って書く。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from '../js/cipher-core.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'js', 'samples.js');

export const PLAINTEXT_SOURCE = [
  'When in the Course of human events, it becomes necessary for one people to dissolve the political bands',
  'which have connected them with another, and to assume among the powers of the earth, the separate and',
  "equal station to which the Laws of Nature and of Nature's God entitle them, a decent respect to the",
  'opinions of mankind requires that they should declare the causes which impel them to the separation.',
  'We hold these truths to be self-evident, that all men are created equal, that they are endowed by their',
  'Creator with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness.',
  'That to secure these rights, Governments are instituted among Men, deriving their just powers from the',
  'consent of the governed'
];

const ADFGVX_SQUARE = 'INDEPC176ABFGHJKLMOQRSTUVWXYZ0234589';

// type＝判定で出てほしい方式、params＝鍵（画面では伏せて表示し、押すと見える）
export function sampleDefs(plain) {
  const short = plain.slice(0, 30);
  return [
    { id: 'plain', type: 'plain', params: {}, letters: plain },
    { id: 'caesar', type: 'caesar', params: { shift: 3 }, letters: C.caesarEncrypt(plain, 3) },
    { id: 'caesarShort', type: 'caesar', params: { shift: 7 }, letters: C.caesarEncrypt(short, 7) },
    { id: 'affine', type: 'affine', params: { a: 5, b: 8 }, letters: C.affineEncrypt(plain, 5, 8) },
    { id: 'substitution', type: 'substitution', params: { keyword: 'LIBERTY' }, letters: C.substitutionEncrypt(plain, C.keywordAlphabet('LIBERTY')) },
    { id: 'vigenere', type: 'vigenere', params: { keyword: 'INDEPENDENCE' }, letters: C.vigenereEncrypt(plain, 'INDEPENDENCE') },
    { id: 'vigenereShort', type: 'vigenere', params: { keyword: 'EAGLE' }, letters: C.vigenereEncrypt(plain, 'EAGLE') },
    { id: 'playfair', type: 'playfair', params: { keyword: 'MONARCHY' }, letters: C.playfairEncrypt(plain, C.playfairSquare('MONARCHY')) },
    { id: 'railfence', type: 'transposition', params: { rails: 3 }, letters: C.railFenceEncrypt(plain, 3) },
    { id: 'columnar', type: 'transposition', params: { keyword: 'ZEBRAS' }, letters: C.columnarEncrypt(plain, 'ZEBRAS') },
    { id: 'adfgvx', type: 'adfgvx', params: { square: ADFGVX_SQUARE, keyword: 'LIBERTY' }, letters: C.adfgvxEncrypt(plain, ADFGVX_SQUARE, 'LIBERTY') }
  ];
}

const groups = (s) => s.match(/.{1,5}/g).join(' ');

function wrap(s, indent) {
  const words = s.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).length > 120 && line) { lines.push(line); line = w; } else line = line ? line + ' ' + w : w;
  }
  lines.push(line);
  return lines.map((l, i) => (i ? indent : '') + l).join('\n');
}

export function renderSamples() {
  const plain = C.lettersOnly(PLAINTEXT_SOURCE.join(' '));
  const out = [];
  out.push('// サンプル暗号文（tools/build-samples.mjs が生成。手で編集しない）');
  out.push('// 平文はアメリカ独立宣言（1776年）の冒頭の英字。米国でパブリックドメイン。');
  out.push('// 暗号文は js/cipher-core.js の参照実装で作った（5文字ずつ区切っている）。名前と説明は messages.js にある。');
  out.push('');
  out.push('export const SAMPLE_PLAINTEXT = [');
  out.push(plain.match(/.{1,100}/g).map((l) => `  '${l}'`).join(',\n'));
  out.push("].join('');");
  out.push('');
  out.push('export const CIPHER_SAMPLES = [');
  const defs = sampleDefs(plain);
  out.push(defs.map((d) => {
    const params = Object.entries(d.params).map(([k, v]) => `${k}: ${typeof v === 'number' ? v : `'${v}'`}`).join(', ');
    return `  {\n    id: '${d.id}',\n    type: '${d.type}',\n    params: { ${params} },\n`
      + `    ciphertext: \`${wrap(groups(d.letters), '      ')}\`\n  }`;
  }).join(',\n'));
  out.push('];');
  return out.join('\n').replace(/ \{ {2}\}/g, ' {}') + '\n';
}

if (process.argv[1] && process.argv[1].endsWith('build-samples.mjs')) {
  const text = renderSamples();
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
    if (cur !== text) {
      console.error('js/samples.js is out of date: run node tools/build-samples.mjs');
      process.exit(1);
    }
    console.log('js/samples.js is up to date');
  } else {
    fs.writeFileSync(OUT, text);
    console.log(`wrote ${path.relative(ROOT, OUT)} (${text.length} bytes)`);
  }
}
