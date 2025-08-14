// ヘルプモーダルのコンテンツ

export const HELP_CONTENT = `
  <section class="help-section">
    <h4>🔮 このツールについて</h4>
    <p>Cipher Clairvoyance（サイファー・クレアボヤンス）は、古典暗号の種類を自動判定する教育用ツールです。暗号文を入力するだけで、統計分析によりもっとも可能性の高い暗号方式を推定します。</p>
  </section>

  <section class="help-section">
    <h4>🚀 基本的な使い方</h4>
    <ol>
      <li><strong>暗号文を入力</strong>: テキストエリアに解析したい暗号文を入力してください</li>
      <li><strong>サンプル利用</strong>: 「📄 サンプル読み込み」から練習用の暗号文を選択できます</li>
      <li><strong>解析実行</strong>: 「🔍 解析開始」ボタンで自動解析を開始します</li>
      <li><strong>結果確認</strong>: もっとも可能性の高い暗号方式と信頼度が表示されます</li>
      <li><strong>詳細分析</strong>: 必要に応じて統計情報や専門家向け分析を展開できます</li>
    </ol>
  </section>

  <section class="help-section">
    <h4>🔐 対応している暗号方式</h4>
    <div class="cipher-grid">
      <div class="cipher-item">
        <strong>シーザー暗号</strong>
        <span>各文字を固定数シフトする基本的な暗号</span>
      </div>
      <div class="cipher-item">
        <strong>アフィン暗号</strong>
        <span>文字を数式(ax+b)で変換するシーザー暗号の拡張</span>
      </div>
      <div class="cipher-item">
        <strong>ヴィジュネル暗号</strong>
        <span>キーワードを使った多表式暗号</span>
      </div>
      <div class="cipher-item">
        <strong>プレイフェア暗号</strong>
        <span>2文字ずつ5×5の表で換字する暗号</span>
      </div>
      <div class="cipher-item">
        <strong>転置式暗号</strong>
        <span>文字の位置を入れ替える暗号（レールフェンス、縦列転置）</span>
      </div>
      <div class="cipher-item">
        <strong>ADFGX(VX)暗号</strong>
        <span>文字をADFGX(V)のみで表現するドイツ軍暗号</span>
      </div>
    </div>
  </section>

  <section class="help-section">
    <h4>📊 分析機能の説明</h4>
    <div class="analysis-explanation">
      <div class="analysis-item">
        <strong>IC (一致指数)</strong>
        <p>文字の重複度を示す値。英語は約0.066、多表式暗号では低くなります。</p>
      </div>
      <div class="analysis-item">
        <strong>χ² 統計量</strong>
        <p>英語の標準的な文字頻度との差を示す値。小さいほど英語に近い分布です。</p>
      </div>
      <div class="analysis-item">
        <strong>自己相関分析</strong>
        <p>ヴィジュネル暗号の周期性を検出。鍵の長さの倍数で高い値を示します。</p>
      </div>
      <div class="analysis-item">
        <strong>カシスキー法</strong>
        <p>繰り返し文字列の間隔から鍵長を推定する古典的な手法です。</p>
      </div>
    </div>
  </section>

  <section class="help-section">
    <h4>⚙️ 詳細設定について</h4>
    <ul>
      <li><strong>前処理オプション</strong>: 英字以外の文字の扱いを設定できます</li>
      <li><strong>解析手法の選択</strong>: 特定のアルゴリズムを有効/無効にできます</li>
      <li><strong>専門家向け分析</strong>: より詳細な統計情報と可視化を提供します</li>
    </ul>
  </section>

  <section class="help-section">
    <h4>💡 使用上の注意</h4>
    <ul>
      <li>このツールは<strong>英語テキスト前提</strong>の分析を行います</li>
      <li>短い暗号文（50文字未満）では精度が低下する可能性があります</li>
      <li>確率表示は教育目的の目安であり、必ずしも正確な判定を保証するものではありません</li>
      <li>実際の暗号解読には、このツールの結果を参考に専門的な解読作業が必要です</li>
    </ul>
  </section>

  <section class="help-section">
    <h4>🔗 関連ツール</h4>
    <p>判定結果に応じて、以下の専用解読ツールの利用をおすすめします：</p>
    <ul>
      <li><strong>シーザー暗号</strong>: <a href="https://ipusiron.github.io/caesar-cipher-breaker/" target="_blank" rel="noopener noreferrer">Caesar Cipher Breaker</a></li>
      <li><strong>ヴィジュネル暗号</strong>: <a href="https://ipusiron.github.io/repeatseq-analyzer/" target="_blank" rel="noopener noreferrer">RepeatSeq Analyzer</a></li>
    </ul>
  </section>

  <section class="help-section">
    <h4>📄 このプロジェクトについて</h4>
    <p>本ツールは「生成AIで作るセキュリティツール100」プロジェクトのDay044として開発されました。</p>
    <p>🔗 <a href="https://github.com/ipusiron/cipher-clairvoyance" target="_blank" rel="noopener noreferrer">GitHubリポジトリ</a> | <a href="https://akademeia.info/?page_id=42163" target="_blank" rel="noopener noreferrer">プロジェクト詳細</a></p>
  </section>
`;