<!--
---
id: day044
slug: cipher-clairvoyance

title: "Cipher Clairvoyance"

subtitle_ja: "暗号化方式推定ツール"
subtitle_en: "Classical Cipher Identification Tool"

description_ja: "英文を古典暗号で暗号化した文から、使われた方式を推定する教育用Webツール。シーザー・アフィン・単一換字・ヴィジュネル・プレイフェア・転置・ADFGVXと平文を見分け、判定に使った統計値と、長さ別に実測した正答率を示します。"
description_en: "An educational web tool that identifies which classical cipher was used on English text. It distinguishes Caesar, Affine, simple substitution, Vigenère, Playfair, transposition, ADFGVX and plaintext, and shows the statistics behind each verdict together with accuracy measured by text length."

category_ja:
  - 古典暗号
  - 暗号解析
category_en:
  - Classical Cryptography
  - Cryptanalysis

difficulty: 3

tags:
  - classical-cipher
  - cryptanalysis
  - cipher-identification
  - statistics
  - naive-bayes
  - index-of-coincidence
  - CTF
  - educational

repo_url: "https://github.com/ipusiron/cipher-clairvoyance"
demo_url: "https://ipusiron.github.io/cipher-clairvoyance/"

hub: true
---
-->

# Cipher Clairvoyance - 暗号化方式推定ツール

![GitHub Repo stars](https://img.shields.io/github/stars/ipusiron/cipher-clairvoyance?style=social)
![GitHub forks](https://img.shields.io/github/forks/ipusiron/cipher-clairvoyance?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/ipusiron/cipher-clairvoyance)
![GitHub license](https://img.shields.io/github/license/ipusiron/cipher-clairvoyance)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://ipusiron.github.io/cipher-clairvoyance/)

**Day044 - 生成AIで作るセキュリティツール100**

Cipher Clairvoyanceは、英文を古典暗号で暗号化した文から、使われた方式を推定する教育用Webツールです。判定に使った統計値をすべて表で見せ、「この長さの暗号文でこの判定が出たとき、実際に当たっていた割合」を実測値で示します。

なお、"clairvoyance"は「クレアボヤンス」と読み、「千里眼」「透視能力」を意味します。

---

## 🌐 デモページ

👉 **[https://ipusiron.github.io/cipher-clairvoyance/](https://ipusiron.github.io/cipher-clairvoyance/)**

ブラウザーで直接お試しいただけます。

---

## 📸 スクリーンショット

>![単一換字式暗号のサンプルを判定した結果](assets/screenshot.png)
>
>*単一換字式暗号のサンプルを判定した結果と、1位を2位より支持した特徴*

>![周期ごとの一致指数とカシスキー法の集計](assets/screenshot2.png)
>
>*5字の鍵のヴィジュネル暗号で、周期5・10・15が鍵長の候補になる*

>![30字の短いシーザー暗号をダークモードで判定](assets/screenshot3.png)
>
>*30字の短い暗号文では、当たっていた割合が下がり、お知らせが出る（ダークモード）*

---

## ✨ 主な機能

- 判定: 英語の平文・シーザー・アフィン・単一換字・ヴィジュネル・プレイフェア・転置の7通りを統計で見分け、ADFGX／ADFGVXは文字の種類で見分ける
- 当たっていた割合: 学習に使っていない英文で長さ帯ごとに実測した値を、判定のたびに表示する（モデルの確率は出さない）
- 判定根拠: 10個の統計値（特徴量）の値と、英語の平文・1位・2位の典型値を並べた表。1位を2位より支持した特徴を説明つきで示す
- お知らせ: 1位と2位が接戦のとき、短い暗号文のとき、ヴィジュネルと判定したのに周期が見えないとき
- 詳細な分析: 文字の頻度（数値の表つき）、周期ごとの一致指数と鍵長の候補、カシスキー法の集計
- サンプル17件: アメリカ独立宣言の冒頭を参照実装で暗号化したもの（判定が崩れる例2件を含む）。鍵は「鍵を見る」で表示を切り替える
- 関連ツールへの案内: 判定結果に合わせて、シリーズの解読・学習ツールを示す
- ライト／ダークの切り替え、キーボード操作、読み上げ用の状態表示

---

## 🔐 判定できる方式

| 方式 | 見分け方の中心 |
|---|---|
| 英語の平文のまま | 文字の頻度も、隣り合う2文字の並びも英語のまま |
| シーザー暗号 | 26通りのずらしのどれかで英語の頻度に戻る |
| アフィン暗号 | 312通りのアフィン変換のどれかで英語の頻度に戻る（ずらしだけでは戻らない） |
| 単一換字式暗号 | 一致指数は英語並みなのに、ずらしやアフィン変換では英語の頻度に戻らない |
| ヴィジュネル暗号 | 一致指数が下がり、鍵長の周期で列に分けると英語並みに戻る |
| プレイフェア暗号 | 偶数の長さ、Jが出ない、2文字ずつの組に同じ字が並ばない |
| 転置式暗号 | 文字の頻度は英語のままなのに、隣り合う2文字の並びが英語らしくない（レールフェンス・縦列転置・回転グリルなどを区別せずにまとめる） |
| ADFGX／ADFGVX暗号 | 暗号文がA・D・F・G・(V)・Xだけでできている（統計を使わない） |

---

## 📊 長さ別の正答率（実測）

学習に使っていない英文（ディケンズ『二都物語』の抜粋）を、各方式で長さ帯ごとに300件ずつ暗号化して判定し、正しい方式が1位になった割合です。ヴィジュネル暗号の鍵長は2〜12字、転置式暗号は縦列転置・レールフェンス・ブロック内の並べ替えを同じ割合で混ぜています。

| 方式 | 20〜49字 | 50〜99字 | 100〜199字 | 200〜399字 | 400字以上 |
|---|---|---|---|---|---|
| 英語の平文のまま | 94% | 99% | 100% | 100% | 100% |
| シーザー暗号 | 87% | 97% | 98% | 99% | 100% |
| アフィン暗号 | 75% | 97% | 98% | 99% | 100% |
| 単一換字式暗号 | 58% | 93% | 100% | 100% | 100% |
| ヴィジュネル暗号 | 29% | 73% | 93% | 97% | 99% |
| オートキー暗号 | 47% | 83% | 99% | 99% | 100% |
| プレイフェア暗号 | 98% | 98% | 99% | 99% | 100% |
| バイフィッド暗号 | 59% | 75% | 94% | 97% | 100% |
| 転置式暗号 | 89% | 97% | 99% | 98% | 100% |

ヴィジュネル暗号の鍵長の推定（同じ評価のヴィジュネル暗号300件ずつ）は次のとおりです。

| 鍵長の推定 | 20〜49字 | 50〜99字 | 100〜199字 | 200〜399字 | 400字以上 |
|---|---|---|---|---|---|
| 1位が正解 | 19% | 49% | 80% | 91% | 99% |
| 上位3つに正解 | 45% | 81% | 95% | 100% | 100% |

画面に出す「当たっていた割合」は、上の評価で「その長さ帯でその方式と判定されたもののうち、本当にその方式だった割合」です。どの方式も同じくらい出てくる、という前提の値です。

---

## 📖 使い方

1. 暗号文を入力欄に貼り付ける（英字A〜Z以外の文字・空白は無視する。判定には英字20字以上が必要）
2. 「🔍 解析開始」を押す（Ctrl＋Enter、Macは⌘＋Enterでもよい）
3. 1位の方式と、その長さでの「当たっていた割合」を確かめる。お知らせが出ていれば読む
4. 「判定根拠」の表で、どの統計値がどの方式の典型に近いかを見比べる
5. 必要なら「📊 詳細な分析を見る」で、文字の頻度・周期ごとの一致指数・カシスキー法の集計を見る
6. 「🔧 次に試すツール」から、解読や学習のツールへ進む

「📄 サンプル読み込み」で、17種類の練習用の暗号文を選べます。

---

## 🔬 判定の仕組み

暗号文から10個の統計値（一致指数、英語の頻度との隔たり、ずらし・アフィン変換で戻したときの隔たり、周期で分けたときの一致指数の伸び、隣り合う2文字の英語らしさなど）を計算し、長さ帯ごとに、各方式の「典型的な値の分布」とどれだけ合うかを比べます（単純ベイズ分類）。分布はオースティン『高慢と偏見』の抜粋を各方式で暗号化して求め、評価は別の作品で行いました。

学習と評価は乱数の種を固定したスクリプト（`tools/build-model.mjs`）で行い、何度作り直しても同じモデル（`js/model.js`）になります。テストでもこの一致を確かめています。計算式・閾値・評価の手順の詳細は[ALGORITHM.md](ALGORITHM.md)にまとめています。

---

## 🎯 ユースケース

- 情報や数学の授業: 同じ平文をいくつかの方式で暗号化させ、判定根拠の表を並べて、方式ごとに崩れる統計値と崩れない統計値を生徒に見つけさせる
- 統計・機械学習の入門: 単純ベイズ分類が「何を見て」判定しているかを、特徴量ごとの典型値と1位・2位の差として読める。学習用と評価用の文を分ける意味や、短い文で正答率が下がる様子も数字で確かめられる
- CTFのCrypto問題の初動: 古典暗号らしい暗号文の方式に当たりを付け、関連ツールで解読に進む。一覧にない方式は、どれかの方式に振り分けられる点に注意する
- 謎解きイベント・脱出ゲームの制作: 自作の暗号文が統計的に何に見えるか、短すぎて見当が付かないか、意図した方式どおりに見えるかを、公開前に確かめる
- パズル・謎解きを解く人: 解き始める前に、文字の置き換えか並べ替えか、周期があるかの見当を付ける
- 歴史の学習: 第一次世界大戦でドイツ軍が使ったADFGVX暗号や、アメリカ独立宣言を暗号化したサンプルから、暗号の歴史に触れる
- 小説・ゲーム・映像の小道具づくり: 作中に出す暗号文が、それらしい統計の特徴を持っているかを確かめる
- プログラミングの学習: 参照実装・特徴量・モデル生成・テストが小さくまとまっているので、乱数の種の固定による再現性や、生成物をテストで縛る作り方を読める
- 研究・教材づくりの比較基準: 長さ別の実測表と同じ手順で、別の判定方法の正答率を比べられる
- シリーズのツールとの組み合わせ: Frequency Analyzer（Day009）で頻度を詳しく見る、IC Learning Visualizer（Day047）で一致指数の意味を学ぶ、Vigenère Cipher Tool（Day017）やRepeatSeq Analyzer（Day028）で鍵長から復号へ進む

---

## ⚠️ 注意と限界

- 英語の文を暗号化したものが前提です。ほかの言語の文では統計値が英語と違うので、判定が外れます
- 一覧にない方式（オートキー暗号・ヒル暗号など）も、どれかの方式に振り分けられます。多くは「ヴィジュネル暗号」になります。200字以上あれば、周期が見えないことをお知らせで示します
- 短い暗号文ほど外れやすくなります。とくに英字20〜49字では、当たる割合が大きく下がる方式があります（上の表）
- 「当たっていた割合」は、どの方式も同じくらい出てくる前提での実測値です。実際に出会う暗号文の偏りは反映していません
- 数字で書く暗号（ポリュビオス暗号など）は対象外です
- 方式の推定までを行います。平文や鍵を求めるのは関連ツールの役目です（ヴィジュネル暗号の鍵長の候補だけは示します）

---

## 🧪 テスト

```bash
npm test
```

- Node.js 22以上の標準のテストランナー（`node:test`）で動き、依存パッケージはありません
- GitHub Actionsで、pushとpull requestのたびに自動で実行します
- 主な内容: Wikipedia（英語版）の各暗号の例による既知解答、暗号化と復号の往復、モデルとサンプルの再生成の一致、長さ帯ごとの正答率の下限、入力の検査、文言の辞書、配色のコントラスト、HTMLの静的検査（CSPなど）
- このREADMEの正答率の表・サンプルの件数・ディレクトリー構造も、テストでモデルと実ファイルに突き合わせています

---

## 🔒 セキュリティ

- 入力した暗号文は、ブラウザーの中だけで処理し、外部へ送信しません
- Content Security PolicyでスクリプトとスタイルをGitHub Pagesの同じ場所のファイルだけに限り、インラインのスクリプト・スタイルを許していません
- 入力された文字列は`textContent`でだけ表示します（HTMLとして解釈しません）
- ブラウザーに保存するのは、ライト／ダークの選択だけです。保存できない環境でも動きます

---

## 🔗 関連ツール

判定結果に合わせて、画面の「🔧 次に試すツール」に次のツールを出します（いずれも「生成AIで作るセキュリティツール100」）。

- [Caesar Cipher Breaker（Day008）](https://ipusiron.github.io/caesar-cipher-breaker/): シーザー暗号を総当たりで解く
- [Frequency Analyzer（Day009）](https://ipusiron.github.io/frequency-analyzer/): 文字の頻度を詳しく見る
- [Vigenère Cipher Tool（Day017）](https://ipusiron.github.io/vigenere-cipher-tool/): ヴィジュネル暗号の暗号化・復号
- [Cipher Climb（Day018）](https://ipusiron.github.io/cipherclimb/): 単一換字式暗号を山登り法で解く
- [Grille CipherLab（Day024）](https://ipusiron.github.io/grille-cipherlab/): 回転グリル暗号
- [Playfair CipherLab（Day027）](https://ipusiron.github.io/playfair-cipherlab/): プレイフェア暗号
- [RepeatSeq Analyzer（Day028）](https://ipusiron.github.io/repeatseq-analyzer/): 繰り返しから鍵長を調べる
- [Modular Text Divider（Day030）](https://ipusiron.github.io/modular-text-divider/): 周期ごとの列に分けて解く
- [RailFence CipherLab（Day034）](https://ipusiron.github.io/railfence-cipherlab/): レールフェンス暗号
- [Columnar CipherLab（Day043）](https://ipusiron.github.io/columnar-cipherlab/): 縦列転置式暗号
- [IC Learning Visualizer（Day047）](https://ipusiron.github.io/ic-learning-visualizer/): 一致指数を学ぶ
- [Affine CipherLab（Day049）](https://ipusiron.github.io/affine-cipherlab/): アフィン暗号

---

## 📁 ディレクトリー構造

```
cipher-clairvoyance/
├── .github/                  # GitHubの設定
│   └── workflows/            # GitHub Actionsのワークフロー
│       └── test.yml          # pushとpull requestでnpm testを実行
├── assets/                   # 画像
│   ├── favicon.ico           # ファビコン（ICO）
│   ├── favicon.svg           # ファビコン（SVG）
│   ├── screenshot.png        # スクリーンショット（判定結果）
│   ├── screenshot2.png       # スクリーンショット（周期性分析）
│   └── screenshot3.png       # スクリーンショット（短い暗号文・ダーク）
├── js/                       # JavaScript（ES modules。file-check.jsとtheme-init.jsだけ通常スクリプト）
│   ├── analysis.js           # 入力の検査から判定・根拠の組み立てまで（DOM非依存）
│   ├── app.js                # イベントの登録、モーダル、解析の流れ
│   ├── cipher-core.js        # 古典暗号の参照実装（学習データ・サンプル・テストに使う）
│   ├── classifier.js         # 長さ帯ごとの単純ベイズ分類と、1位を支持した特徴
│   ├── decide.js             # 判定の流れ（ヴィジュネル／オートキーの2段目の見分け）
│   ├── features.js           # 特徴量（一致指数・χ²・周期ごとのICなど）の計算
│   ├── file-check.js         # file://で起動できなかったときの案内
│   ├── help-content.js       # ヘルプの本文
│   ├── keylength.js          # ヴィジュネル暗号の鍵長の推定とカシスキー法の集計
│   ├── links.js              # 関連ツールと、暗号文を渡して開くリンク
│   ├── messages.js           # 画面に出す文言の辞書
│   ├── model.js              # 判定モデル（tools/build-model.mjsが生成）
│   ├── samples.js            # サンプル暗号文（tools/build-samples.mjsが生成）
│   ├── solver.js             # 試し解き（シーザー・アフィン・ヴィジュネル型・オートキー）
│   ├── theme-init.js         # 読み込みの最初にテーマを当てる
│   ├── theme.js              # ライト／ダークの切り替え
│   ├── ui.js                 # 結果・根拠・詳細・ヘルプの表の描画
│   └── visualization.js      # グラフ（SVG）の描画
├── test/                     # テスト（node:test）
│   ├── analysis.test.js      # 入力の検査と判定・お知らせ
│   ├── contrast.test.js      # 配色のコントラスト比（ライト・ダーク）
│   ├── core.test.js          # 暗号の既知解答と往復
│   ├── features.test.js      # 特徴量と鍵長の推定
│   ├── format.test.js        # 行の長さと行数（詰め込みの検出）
│   ├── html.test.js          # index.htmlの静的検査（CSP・属性・要素）
│   ├── links.test.js         # 関連ツールのリンクと受け渡しのURL
│   ├── messages.test.js      # 文言の辞書
│   ├── model.test.js         # モデルの再生成の一致・形・評価の下限
│   ├── readme.test.js        # READMEの表・メタデータ・ディレクトリー構造
│   ├── samples.test.js       # サンプルの再生成の一致・往復・判定
│   └── solver.test.js        # 試し解きと2段目の見分け
├── tools/                    # 開発用のスクリプト（画面では使わない）
│   ├── corpus/               # 学習・評価に使う英文の抜粋（英字だけ）
│   │   ├── eval-pg98.txt     # 評価用: A Tale of Two Cities（Project Gutenberg #98）
│   │   └── train-pg1342.txt  # 学習用: Pride and Prejudice（Project Gutenberg #1342）
│   ├── build-model.mjs       # 判定モデルの学習・評価・書き出し（--checkで一致を確認）
│   ├── build-samples.mjs     # サンプル暗号文の書き出し（--checkで一致を確認）
│   └── make-corpus.mjs       # Gutenbergのテキストから英文の抜粋を作る
├── .gitignore                # Gitの管理から外すファイル
├── .nojekyll                 # GitHub PagesでJekyllを使わない指定
├── ALGORITHM.md              # 判定の計算式・閾値・評価の手順
├── CLAUDE.md                 # Claude Code向けの開発メモ
├── LICENSE                   # ライセンス（MIT）
├── README.md                 # このファイル
├── index.html                # 画面
├── package.json              # npm testの設定（依存パッケージなし）
└── style.css                 # スタイル（ライト・ダークの配色）
```

---

## 💻 動作環境

- Chrome・Edge・Firefoxなどの最近のブラウザー（ES modulesに対応したもの）
- スマートフォンの幅（320px以上）でも使えます
- ローカルで動かすときは、フォルダーで`python -m http.server 8000`などを実行し、`http://localhost:8000/`で開いてください。ChromeやEdgeでは、index.htmlをファイルとして直接開くとES modulesが読み込めず、ツールが動きません（画面に案内が出ます）

---

## 📄 ライセンス

- ソースコードのライセンスは`LICENSE`ファイルを参照してください。
- 学習・評価に使う英文の抜粋（`tools/corpus/`）は、Project Gutenbergの電子テキスト（#1342 Pride and Prejudice、#98 A Tale of Two Cities）の本文から英字だけを取り出したものです。どちらも米国でパブリックドメインです。
- サンプルの平文は、アメリカ独立宣言（1776年）の冒頭です（パブリックドメイン）。

---

## 🛠️ このツールについて

本ツールは、「生成AIで作るセキュリティツール100」プロジェクトの一環として開発されました。
このプロジェクトでは、AIの支援を活用しながら、セキュリティに関連するさまざまなツールを100日間にわたり制作・公開していく取り組みを行っています。

プロジェクトの詳細や他のツールについては、以下のページをご覧ください。

🔗 [https://akademeia.info/?page_id=42163](https://akademeia.info/?page_id=42163)
