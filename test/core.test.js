import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/cipher-core.js';

const L = C.lettersOnly;

// 既知解答は Wikipedia（英語版）の各暗号の記事の例。暗号文の空白・句読点は除いて比べる
test('既知解答: シーザー暗号（左へ3＝右へ23）', () => {
  assert.equal(C.caesarEncrypt(L('THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG'), 23), L('QEB NRFZH YOLTK CLU GRJMP LSBO QEB IXWV ALD'));
  assert.equal(C.caesarDecrypt(L('QEB NRFZH YOLTK CLU GRJMP LSBO QEB IXWV ALD'), 23), L('THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG'));
});

test('既知解答: アフィン暗号（a=5, b=8）', () => {
  assert.equal(C.affineEncrypt(L('AFFINE CIPHER'), 5, 8), 'IHHWVCSWFRCP');
  assert.equal(C.affineDecrypt('IHHWVCSWFRCP', 5, 8), 'AFFINECIPHER');
});

test('既知解答: 単一換字式暗号（キーワード zebras）', () => {
  assert.equal(C.keywordAlphabet('zebras'), 'ZEBRASCDFGHIJKLMNOPQTUVWXY');
  assert.equal(C.substitutionEncrypt(L('flee at once. we are discovered!'), C.keywordAlphabet('zebras')), L('SIAA ZQ LKBA. VA ZOA RFPBLUAOAR!'));
});

test('既知解答: ヴィジュネル暗号（鍵 key）', () => {
  assert.equal(C.vigenereEncrypt(L('helloworld'), 'key'), 'RIJVSUYVJN');
  assert.equal(C.vigenereDecrypt('RIJVSUYVJN', 'KEY'), 'HELLOWORLD');
});

test('既知解答: プレイフェア暗号（鍵 playfair example）', () => {
  const sq = C.playfairSquare('playfair example');
  assert.equal(sq, 'PLAYFIREXMBCDGHKNOQSTUVWZ');
  const plain = L('hide the gold in the tree stump');
  assert.equal(C.playfairDigrams(plain).join(' '), 'HI DE TH EG OL DI NT HE TR EX ES TU MP');
  assert.equal(C.playfairEncrypt(plain, sq), L('BMODZ BXDNA BEKUD MUIXM MOUVI F'));
  assert.equal(C.playfairDecrypt('BMODZBXDNABEKUDMUIXMMOUVIF', sq), 'HIDETHEGOLDINTHETREXESTUMP');
});

test('既知解答: レールフェンス暗号（3段）', () => {
  assert.equal(C.railFenceEncrypt(L('WE ARE DISCOVERED. RUN AT ONCE.'), 3), L('WECRUO ERDSOEERNTNE AIVDAC'));
  assert.equal(C.railFenceDecrypt(L('WECRUO ERDSOEERNTNE AIVDAC'), 3), 'WEAREDISCOVEREDRUNATONCE');
});

test('既知解答: 縦列転置（キーワード ZEBRAS、埋字なし）', () => {
  assert.equal(C.columnarEncrypt(L('WE ARE DISCOVERED. FLEE AT ONCE'), 'ZEBRAS'), 'EVLNACDTESEAROFODEECWIREE');
  assert.deepEqual(C.columnOrder('ZEBRAS'), [4, 2, 1, 3, 5, 0]);
  assert.deepEqual(C.columnOrder('BALLOON'), [1, 0, 2, 3, 6, 4, 5]);
});

test('既知解答: ADFGX（鍵 CARGO）', () => {
  assert.equal(C.adfgvxEncrypt('Attack at once', 'BTALPDHOZKQFVSNGICUXMREWY', 'CARGO'), L('FAXDF ADDDG DGFFF AFAX AFAFX'));
});

test('ADFGVX は数字も換字する（6×6）', () => {
  const sq = 'NA1C3H8TB2OME5WRPD4F6G7I9J0KLQSUVXYZ';
  const c = C.adfgvxEncrypt('A1', sq, 'AB');
  // A は (0,1)＝AD、1 は (0,2)＝AF。"ADAF" を2列に書くと列A＝AA、列B＝DF
  assert.equal(c, 'AADF');
});

// 独立した書き方の参照実装と突き合わせる往復の全数検査
const TEXT = 'THEQUICKBROWNFOXJUMPSOVERTHELAZYDOGANDKEEPSRUNNINGINTOTHEFORESTX';

test('往復: シーザー・アフィン・ヴィジュネル・換字（長さ0〜64、全部の鍵）', () => {
  for (let n = 0; n <= TEXT.length; n++) {
    const t = TEXT.slice(0, n);
    for (let k = 0; k < 26; k++) assert.equal(C.caesarDecrypt(C.caesarEncrypt(t, k), k), t);
    for (const a of C.AFFINE_A) for (const b of [0, 7, 25]) assert.equal(C.affineDecrypt(C.affineEncrypt(t, a, b), a, b), t);
    for (const key of ['A', 'LEMON', 'INDEPENDENCE']) assert.equal(C.vigenereDecrypt(C.vigenereEncrypt(t, key), key), t);
    const alpha = C.keywordAlphabet('QWERTY');
    assert.equal(C.substitutionDecrypt(C.substitutionEncrypt(t, alpha), alpha), t);
  }
});

test('往復: レールフェンス（1〜8段）と縦列転置（数列・キーワード）', () => {
  for (let n = 0; n <= TEXT.length; n++) {
    const t = TEXT.slice(0, n);
    for (let r = 1; r <= 8; r++) assert.equal(C.railFenceDecrypt(C.railFenceEncrypt(t, r), r), t);
    for (const key of ['A', 'AB', 'ZEBRAS', 'BALLOON', [2, 0, 1], [3, 1, 4, 0, 2]]) {
      assert.equal(C.columnarDecrypt(C.columnarEncrypt(t, key), key), t);
    }
  }
});

test('レールフェンスの並びは、ジグザグの段番号で数えた参照と一致する', () => {
  for (let r = 2; r <= 6; r++) {
    for (let n = 1; n <= 40; n++) {
      const t = TEXT.slice(0, n);
      const cycle = 2 * (r - 1);
      const rowOf = (i) => Math.min(i % cycle, cycle - (i % cycle));
      let ref = '';
      for (let row = 0; row < r; row++) for (let i = 0; i < n; i++) if (rowOf(i) === row) ref += t[i];
      assert.equal(C.railFenceEncrypt(t, r), ref);
    }
  }
});

test('往復: プレイフェア（復号すると、埋字を入れた平文の組に戻る）', () => {
  const sq = C.playfairSquare('MONARCHY');
  for (let n = 1; n <= TEXT.length; n++) {
    const t = TEXT.slice(0, n);
    const c = C.playfairEncrypt(t, sq);
    assert.equal(c.length % 2, 0);
    assert.equal(C.playfairDecrypt(c, sq), C.playfairDigrams(t).join(''));
    for (let i = 0; i < c.length; i += 2) assert.notEqual(c[i], c[i + 1]);
    assert.ok(!c.includes('J'));
  }
});

test('プレイフェアの埋字: 同じ字の組と最後の1字に X、X が並ぶときは Q', () => {
  assert.deepEqual(C.playfairDigrams('BALLOON'), ['BA', 'LX', 'LO', 'ON']);
  assert.deepEqual(C.playfairDigrams('XXA'), ['XQ', 'XA']);
  assert.deepEqual(C.playfairDigrams('ABC'), ['AB', 'CX']);
  assert.deepEqual(C.playfairDigrams('JIG'), ['IX', 'IG']);
});

test('lettersOnly: 英字だけを大文字で残す（全角英字は半角にそろえる）', () => {
  assert.equal(L('Hello, World! 123'), 'HELLOWORLD');
  assert.equal(L('ＡＢＣ ｄｅｆ'), 'ABCDEF');
  assert.equal(L('暗号 cipher'), 'CIPHER');
  assert.equal(L(null), '');
  assert.equal(L(undefined), '');
});

test('不正な鍵は例外にする', () => {
  assert.throws(() => C.affineEncrypt('ABC', 2, 1), RangeError);
  assert.throws(() => C.affineDecrypt('ABC', 13, 1), RangeError);
  assert.throws(() => C.substitutionEncrypt('ABC', 'ABC'), RangeError);
  assert.throws(() => C.substitutionEncrypt('ABC', 'AACDEFGHIJKLMNOPQRSTUVWXYZ'), RangeError);
  assert.throws(() => C.vigenereEncrypt('ABC', '123'), RangeError);
  assert.throws(() => C.railFenceEncrypt('ABC', 0), RangeError);
  assert.throws(() => C.columnarEncrypt('ABC', ''), RangeError);
  assert.throws(() => C.playfairDecrypt('ABC', C.playfairSquare('')), RangeError);
  assert.throws(() => C.adfgvxEncrypt('ABC', 'ABC', 'KEY'), RangeError);
});

test('modInverse: 26 と互いに素な a だけ逆元がある', () => {
  for (let a = 1; a < 26; a++) {
    const inv = C.modInverse(a);
    if (C.AFFINE_A.includes(a)) assert.equal((a * inv) % 26, 1);
    else assert.equal(inv, null);
  }
});

test('既知解答: オートキー暗号（プライマー QUEENLY）', () => {
  assert.equal(C.autokeyEncrypt(L('attackatdawn'), 'QUEENLY'), 'QNXEPVYTWTWP');
  assert.equal(C.autokeyDecrypt('QNXEPVYTWTWP', 'QUEENLY'), 'ATTACKATDAWN');
});

test('既知解答: バイフィッド暗号（Wikipedia の表、文全体を1ブロック）', () => {
  assert.equal(C.bifidEncrypt('FLEEATONCE', 'BGWKZQPNDSIOAXEFCLUMTHYVR'), 'UAEOLWRINS');
  assert.ok(!C.bifidEncrypt('JUMPINGJACK', C.playfairSquare('KEY')).includes('J'));
});

test('既知解答: ヒル暗号（2×2、鍵 [[3,3],[2,5]]）とポリュビオス暗号（BAT＝12 11 44）', () => {
  assert.equal(C.hill2Encrypt('HELP', [[3, 3], [2, 5]]), 'HIAT');
  assert.throws(() => C.hill2Encrypt('HELP', [[2, 4], [1, 2]]), RangeError);
  assert.equal(C.polybiusEncode('BAT'), '12 11 44');
  assert.equal(C.polybiusDecode('12 11 44'), 'BAT');
  assert.equal(C.polybiusDecode('121'), 'B');
});

test('往復: オートキー（プライマー1〜12字）・ボーフォート型（同じ操作で戻る）・ポリュビオス', () => {
  for (let n = 0; n <= TEXT.length; n++) {
    const t = TEXT.slice(0, n);
    for (const p of ['A', 'KEY', 'QUEENLY', 'ABCDEFGHIJKL']) assert.equal(C.autokeyDecrypt(C.autokeyEncrypt(t, p), p), t);
    for (const k of ['A', 'FORT', 'JEFFERSON']) assert.equal(C.beaufortEncrypt(C.beaufortEncrypt(t, k), k), t);
    assert.equal(C.polybiusDecode(C.polybiusEncode(t)), t.replace(/J/g, 'I'));
  }
});

test('バイフィッドのブロック: 周期で区切ると、区切りごとに独立して変わる', () => {
  const sq = C.playfairSquare('SECRET');
  const whole = C.bifidEncrypt('ABCDEFGHIK', sq, 5);
  assert.equal(whole.slice(0, 5), C.bifidEncrypt('ABCDE', sq));
  assert.equal(whole.slice(5), C.bifidEncrypt('FGHIK', sq));
  assert.throws(() => C.bifidEncrypt('ABC', sq, 0), RangeError);
});
