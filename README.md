# Cipher Clairvoyance - 古典暗号方式推測ツール

![GitHub Repo stars](https://img.shields.io/github/stars/ipusiron/cipher-clairvoyance?style=social)
![GitHub forks](https://img.shields.io/github/forks/ipusiron/cipher-clairvoyance?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/ipusiron/cipher-clairvoyance)
![GitHub license](https://img.shields.io/github/license/ipusiron/cipher-clairvoyance)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://ipusiron.github.io/cipher-clairvoyance/)


**Day043 - 生成AIで作るセキュリティツール100**

**Classical Cipher Identification & Visualization**  
暗号文から用いられた古典暗号を推定・特定する軽量Webツールです。

ビジュアルに訴えるUIによって教育・学習用途を支援します。

シーザー暗号、アフィン暗号、プレイフェア暗号、主な転置式暗号、ADFGX(VX)暗号、ヴィジュネル暗号の検出をサポートしています。

---

## 🌐 デモページ

👉 **[https://ipusiron.github.io/cipher-clairvoyance/](https://ipusiron.github.io/cipher-clairvoyance/)**

ブラウザーで直接お試しいただけます。

---

## 📸 スクリーンショット

> ![ダミー](assets/screenshot.png)  
>
> *ダミー*

---

## ✨ 主な機能
- **確率リング**で方式ごとの「信頼度」（Softmax正規化）を表示
- **基本統計**：IoC、単文字 χ²、英語らしさ（Bi/Tri）
- **Vigenère 検出**：Auto-correlation、Kasiski（GCDヒスト）、列IC＆列Caesar、暫定復号プレビュー
- **Playfair / 転置疑い**：ヒューリスティクス（偶数長/同字ペア/X偏在、単字χ²と n-gramの逆相関）
- **ADFGX/ADFGVX 検出**：文字集合＆偶数長
- **数字系の簡易検出**：Baconian（2シンボル）、Polybius（2桁ペア）、Nihilist（数字列）
- **教育UI**：  
  - 単文字頻度（観測 vs 英語期待）  
  - オートコリレーション・GCDミニバー、**列ICヒート**  
  - **Kasiski 反復 n-gram 表**（クリックで原文にハイライト）  
  - **Vigenère ラボ**（列分割・列IC・列Caesar推定・暫定復号）

---

## ⚙ 実装メモ
- 英語テキスト前提のヒューリスティクス。
  - 短文や多言語は誤判定の可能性あり
- 確率は「Softmax正規化された evidence」＝擬似確率（教育向けの目安）
- 4-gramログ尤度や自動復号の各方式は将来追加予定

---

## 🗺 Roadmap

- 4-gram 尤度スコア＋可視化
- Columnar / Rail Fence の列幅/レール数推定→復元→スコア
- Bifid/Trifid/Hill の簡易テスター
- Vigenère 派生（Beaufort / Porta / Autokey）識別強化
- 多言語 n-gram（ja/de/fr/…）切替

---

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) をご覧ください。

---

## 🛠 このツールについて

本ツールは、「生成AIで作るセキュリティツール100」プロジェクトの一環として開発されました。  
このプロジェクトでは、AIの支援を活用しながら、セキュリティに関連するさまざまなツールを100日間にわたり制作・公開していく取り組みを行っています。

プロジェクトの詳細や他のツールについては、以下のページをご覧ください。

🔗 [https://akademeia.info/?page_id=42163](https://akademeia.info/?page_id=42163)