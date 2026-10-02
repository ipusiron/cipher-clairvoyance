// 古典暗号の参照実装（DOM非依存）
// 判定器の学習データの生成・サンプルの作成・テストの既知解答に使う。
// 文字はすべて A〜Z の大文字だけを扱う（前処理は lettersOnly）。

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// アフィン暗号で使える a（26 と互いに素）。a=1 はシーザー暗号と同じ
export const AFFINE_A = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];

const code = (c) => c.charCodeAt(0) - 65;
const letter = (n) => String.fromCharCode(((n % 26) + 26) % 26 + 65);
const mod = (n, m) => ((n % m) + m) % m;

// 入力から英字だけを取り出して大文字にする。全角英字は NFKC で半角にそろえる
export function lettersOnly(text) {
  return String(text ?? '').normalize('NFKC').toUpperCase().replace(/[^A-Z]/g, '');
}

// 26 を法とする逆元（なければ null）
export function modInverse(a) {
  for (let x = 1; x < 26; x++) if (mod(a * x, 26) === 1) return x;
  return null;
}

// シーザー暗号（k だけ後ろへずらす。負の k は前へ）
export function caesarEncrypt(s, k) {
  let out = '';
  for (const c of s) out += letter(code(c) + k);
  return out;
}

export function caesarDecrypt(s, k) {
  return caesarEncrypt(s, -k);
}

// アフィン暗号 E(x) = (a x + b) mod 26
export function affineEncrypt(s, a, b) {
  if (modInverse(a) === null) throw new RangeError('a must be coprime to 26');
  let out = '';
  for (const c of s) out += letter(a * code(c) + b);
  return out;
}

export function affineDecrypt(s, a, b) {
  const inv = modInverse(a);
  if (inv === null) throw new RangeError('a must be coprime to 26');
  let out = '';
  for (const c of s) out += letter(inv * (code(c) - b));
  return out;
}

// キーワードから換字表（暗号文の字の並び）を作る。重複を除いたキーワードのあとに残りの字を順に並べる
export function keywordAlphabet(keyword) {
  let out = '';
  for (const c of lettersOnly(keyword) + ALPHABET) if (!out.includes(c)) out += c;
  return out;
}

// 単一換字式暗号（平文の A〜Z を cipherAlphabet の同じ位置の字へ置き換える）
export function substitutionEncrypt(s, cipherAlphabet) {
  checkPermutation(cipherAlphabet);
  let out = '';
  for (const c of s) out += cipherAlphabet[code(c)];
  return out;
}

export function substitutionDecrypt(s, cipherAlphabet) {
  checkPermutation(cipherAlphabet);
  let out = '';
  for (const c of s) out += ALPHABET[cipherAlphabet.indexOf(c)];
  return out;
}

function checkPermutation(alpha) {
  if (typeof alpha !== 'string' || alpha.length !== 26 || new Set(alpha).size !== 26 || /[^A-Z]/.test(alpha)) {
    throw new RangeError('cipher alphabet must be a permutation of A-Z');
  }
}

// ヴィジュネル暗号（鍵の字 A=0 … Z=25 だけずらす）
export function vigenereEncrypt(s, key) {
  const k = lettersOnly(key);
  if (!k) throw new RangeError('key must contain letters');
  let out = '';
  for (let i = 0; i < s.length; i++) out += letter(code(s[i]) + code(k[i % k.length]));
  return out;
}

export function vigenereDecrypt(s, key) {
  const k = lettersOnly(key);
  if (!k) throw new RangeError('key must contain letters');
  let out = '';
  for (let i = 0; i < s.length; i++) out += letter(code(s[i]) - code(k[i % k.length]));
  return out;
}

// プレイフェア暗号の 5×5 表（J は I とみなす）
export function playfairSquare(keyword) {
  let sq = '';
  for (const c of (lettersOnly(keyword) + ALPHABET).replace(/J/g, 'I')) if (!sq.includes(c)) sq += c;
  return sq;
}

// 平文を2文字の組に分ける。同じ字が並ぶ組と最後の1字には pad（pad 自身が並ぶときは altPad）を挟む
export function playfairDigrams(s, pad = 'X', altPad = 'Q') {
  const t = s.replace(/J/g, 'I');
  const pairs = [];
  let i = 0;
  while (i < t.length) {
    const a = t[i];
    const b = t[i + 1];
    const filler = a === pad ? altPad : pad;
    if (b === undefined || a === b) {
      pairs.push(a + filler);
      i += 1;
    } else {
      pairs.push(a + b);
      i += 2;
    }
  }
  return pairs;
}

function playfairPair(sq, pair, step) {
  const ia = sq.indexOf(pair[0]);
  const ib = sq.indexOf(pair[1]);
  const ra = Math.floor(ia / 5), ca = ia % 5, rb = Math.floor(ib / 5), cb = ib % 5;
  if (ra === rb) return sq[ra * 5 + mod(ca + step, 5)] + sq[rb * 5 + mod(cb + step, 5)];
  if (ca === cb) return sq[mod(ra + step, 5) * 5 + ca] + sq[mod(rb + step, 5) * 5 + cb];
  return sq[ra * 5 + cb] + sq[rb * 5 + ca];
}

export function playfairEncrypt(s, square, pad = 'X', altPad = 'Q') {
  return playfairDigrams(s, pad, altPad).map((p) => playfairPair(square, p, 1)).join('');
}

export function playfairDecrypt(s, square) {
  if (s.length % 2 !== 0) throw new RangeError('playfair ciphertext must have even length');
  let out = '';
  for (let i = 0; i < s.length; i += 2) out += playfairPair(square, s.slice(i, i + 2), -1);
  return out;
}

// レールフェンス暗号（rails 段のジグザグに書き、上の段から読む）
function railPattern(n, rails) {
  const rows = [];
  let r = 0;
  let d = 1;
  for (let i = 0; i < n; i++) {
    rows.push(r);
    if (rails > 1) {
      if (r === 0) d = 1;
      else if (r === rails - 1) d = -1;
      r += d;
    }
  }
  return rows;
}

function railOrder(n, rails) {
  const rows = railPattern(n, rails);
  const order = [];
  for (let r = 0; r < rails; r++) for (let i = 0; i < n; i++) if (rows[i] === r) order.push(i);
  return order;
}

export function railFenceEncrypt(s, rails) {
  if (!Number.isInteger(rails) || rails < 1) throw new RangeError('rails must be a positive integer');
  return railOrder(s.length, rails).map((i) => s[i]).join('');
}

export function railFenceDecrypt(s, rails) {
  if (!Number.isInteger(rails) || rails < 1) throw new RangeError('rails must be a positive integer');
  const out = new Array(s.length);
  railOrder(s.length, rails).forEach((pos, j) => { out[pos] = s[j]; });
  return out.join('');
}

// 縦列転置の列の読み順（キーワードの字の順。同じ字は左から）。数の配列ならそのまま使う
export function columnOrder(key) {
  if (Array.isArray(key)) return [...key];
  const k = lettersOnly(key);
  if (!k) throw new RangeError('key must contain letters');
  return [...k].map((c, i) => ({ c, i })).sort((x, y) => (x.c === y.c ? x.i - y.i : x.c < y.c ? -1 : 1)).map((e) => e.i);
}

// 縦列転置（埋字なし＝不完全な最終行のまま、列を読み順に読む）
export function columnarEncrypt(s, key) {
  const order = columnOrder(key);
  const n = order.length;
  let out = '';
  for (const col of order) for (let i = col; i < s.length; i += n) out += s[i];
  return out;
}

export function columnarDecrypt(s, key) {
  const order = columnOrder(key);
  const n = order.length;
  const rows = Math.ceil(s.length / n);
  const full = s.length % n === 0 ? n : s.length % n;
  const out = new Array(s.length);
  let p = 0;
  for (const col of order) {
    const h = col < full ? rows : rows - 1;
    for (let r = 0; r < h; r++) out[r * n + col] = s[p++];
  }
  return out.join('');
}

// オートキー暗号（平文オートキー）: 鍵の流れ＝プライマーのあとに平文そのものを続ける
export function autokeyEncrypt(s, primer) {
  const k = lettersOnly(primer);
  if (!k) throw new RangeError('primer must contain letters');
  const stream = k + s;
  let out = '';
  for (let i = 0; i < s.length; i++) out += letter(code(s[i]) + code(stream[i]));
  return out;
}

export function autokeyDecrypt(s, primer) {
  const k = lettersOnly(primer);
  if (!k) throw new RangeError('primer must contain letters');
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const keyChar = i < k.length ? k[i] : out[i - k.length];
    out += letter(code(s[i]) - code(keyChar));
  }
  return out;
}

// ボーフォート型: 各位置で「鍵の字 − 平文の字」。同じ操作で復号できる（相反）。
// 資料によって式の表し方が違う（定数を足す形など）が、どれも各列で字の並びを逆向きにしてずらす点は同じ
export function beaufortEncrypt(s, key) {
  const k = lettersOnly(key);
  if (!k) throw new RangeError('key must contain letters');
  let out = '';
  for (let i = 0; i < s.length; i++) out += letter(code(k[i % k.length]) - code(s[i]));
  return out;
}

// バイフィッド暗号（5×5、J は I とみなす）。period を省くと文全体を1つのブロックとして扱う
export function bifidEncrypt(s, square, period = null) {
  if (square.length !== 25 || new Set(square).size !== 25) throw new RangeError('square must have 25 distinct letters');
  const t = s.replace(/J/g, 'I');
  const size = period === null ? t.length : period;
  if (!Number.isInteger(size) || size < 1) throw new RangeError('period must be a positive integer');
  let out = '';
  for (let start = 0; start < t.length; start += size) {
    const block = t.slice(start, start + size);
    const rows = [];
    const cols = [];
    for (const c of block) {
      const i = square.indexOf(c);
      rows.push(Math.floor(i / 5));
      cols.push(i % 5);
    }
    const seq = rows.concat(cols);
    for (let i = 0; i < seq.length; i += 2) out += square[seq[i] * 5 + seq[i + 1]];
  }
  return out;
}

// ヒル暗号（2×2）。key＝[[a, b], [c, d]]、平文の2文字を列ベクトルとして掛ける。奇数長なら最後に pad を足す
export function hill2Encrypt(s, key, pad = 'X') {
  const [[a, b], [c, d]] = key;
  if (modInverse(mod(a * d - b * c, 26)) === null) throw new RangeError('key matrix is not invertible mod 26');
  const t = s.length % 2 ? s + pad : s;
  let out = '';
  for (let i = 0; i < t.length; i += 2) {
    const x = code(t[i]);
    const y = code(t[i + 1]);
    out += letter(a * x + b * y) + letter(c * x + d * y);
  }
  return out;
}

// ポリュビオス暗号（標準の5×5、J は I とみなす。行と列の数字 1〜5 の組）
export const POLYBIUS_SQUARE = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';

export function polybiusEncode(s, square = POLYBIUS_SQUARE) {
  return [...s.replace(/J/g, 'I')].map((c) => {
    const i = square.indexOf(c);
    if (i < 0) throw new RangeError(`letter not in square: ${c}`);
    return `${Math.floor(i / 5) + 1}${(i % 5) + 1}`;
  }).join(' ');
}

// 数字の組を、表の字へ戻す（数字以外は無視。数字が奇数個なら最後の1つは使わない）
export function polybiusDecode(digits, square = POLYBIUS_SQUARE) {
  const d = String(digits).replace(/[^1-5]/g, '');
  let out = '';
  for (let i = 0; i + 1 < d.length; i += 2) out += square[(Number(d[i]) - 1) * 5 + Number(d[i + 1]) - 1];
  return out;
}

// ADFGX（5×5、J は I とみなす）と ADFGVX（6×6、A〜Z と 0〜9）
export const ADFGX_SYMBOLS = 'ADFGX';
export const ADFGVX_SYMBOLS = 'ADFGVX';

// 換字表の字を symbols の2字の組へ置き換え、キーワードで縦列転置する
export function adfgvxEncrypt(text, square, keyword) {
  const size = square.length === 25 ? 5 : square.length === 36 ? 6 : 0;
  if (!size || new Set(square).size !== square.length) throw new RangeError('square must have 25 or 36 distinct symbols');
  const symbols = size === 5 ? ADFGX_SYMBOLS : ADFGVX_SYMBOLS;
  let src = String(text ?? '').normalize('NFKC').toUpperCase();
  src = size === 5 ? src.replace(/[^A-Z]/g, '').replace(/J/g, 'I') : src.replace(/[^A-Z0-9]/g, '');
  let frac = '';
  for (const c of src) {
    const i = square.indexOf(c);
    if (i < 0) throw new RangeError(`symbol not in square: ${c}`);
    frac += symbols[Math.floor(i / size)] + symbols[i % size];
  }
  return columnarEncrypt(frac, keyword);
}
