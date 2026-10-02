// ヘルプモーダルの本文（静的なHTML）。行の折り返しが表示で空白にならないよう、改行と字下げは取り除いて使う。特徴量の説明（#helpFeatures）と長さ別の正答率の表（#helpAccuracy）は
// 開くときにapp.jsがmessages.jsとmodel.jsから組み立てる（本文と数字が食い違わないように）

export const HELP_CONTENT = `
  <section class="help-section">
    <h4>🔮 このツールについて</h4>
    <p>Cipher Clairvoyance（サイファー・クレアボヤンス）は、英文を古典暗号で暗号化した文から、使われた方式を推定する教育用ツールです。
    判定に使った統計値をすべて表で見せ、さらに「この長さの暗号文でこの判定が出たとき、実際に当たっていた割合」を実測値で示します。
    平文や鍵を求める（解読する）のは、結果の下に出る関連ツールの役目です。</p>
  </section>

  <section class="help-section">
    <h4>🚀 使い方</h4>
    <ol>
      <li>暗号文を入力欄に貼り付けます（英字A〜Z以外の文字・空白は無視します）。「📄 サンプル読み込み」で練習用の暗号文も選べます</li>
      <li>「🔍 解析開始」（またはCtrl＋Enter）を押します</li>
      <li>1位の方式と、その判定が当たっていた割合を確かめます。お知らせ（接戦・短文など）があれば読んでください</li>
      <li>「判定根拠」の表で、どの統計値がどの方式の典型に近いかを見比べます</li>
      <li>「📊 詳細な分析を見る」で、文字の頻度・周期ごとの一致指数・カシスキー法の集計を見られます</li>
    </ol>
  </section>

  <section class="help-section">
    <h4>🔐 判定できる方式</h4>
    <ul>
      <li><strong>英語の平文のまま</strong>：暗号化されていない英文</li>
      <li><strong>シーザー暗号</strong>：全部の字を同じ数だけずらす</li>
      <li><strong>アフィン暗号</strong>：式(a×x＋b) mod 26で置き換える</li>
      <li><strong>単一換字式暗号</strong>：決まった対応表で1文字ずつ置き換える</li>
      <li><strong>ヴィジュネル暗号</strong>：キーワードで位置ごとにずらす量を変える（鍵長の候補も出します）</li>
      <li><strong>プレイフェア暗号</strong>：5×5の表で2文字ずつ置き換える</li>
      <li><strong>転置式暗号</strong>：字は変えずに並びを入れ替える（レールフェンス・縦列転置・回転グリルなど、どれかまでは区別しません）</li>
      <li><strong>ADFGX／ADFGVX暗号</strong>：暗号文がA・D・F・G・(V)・Xだけでできていれば、統計を使わずに判定します</li>
    </ul>
  </section>

  <section class="help-section">
    <h4>📏 結果の読み方</h4>
    <ul>
      <li><strong>当たっていた割合</strong>：学習に使っていない英文（ディケンズ『二都物語』）を、各方式で同じ件数ずつ暗号化して判定し、
        「この長さ帯でこの方式と判定されたもののうち、本当にその方式だった割合」を数えた実測値です。どの方式も同じくらい出てくる、という前提の値です</li>
      <li><strong>接戦</strong>：1位と2位の当てはまりの差が小さいときに知らせます。差が小さいときの当たり方も実測値で添えます</li>
      <li><strong>ほかの候補</strong>：当てはまりのよい順に並べた順位です。確率の数字は出しません（このモデルの確率は高く出すぎるためです）</li>
      <li><strong>周期が見つからない</strong>：ヴィジュネル暗号と判定したのに、200字以上あっても鍵の周期が見えないときに知らせます。オートキー暗号など、周期のない方式の可能性があります</li>
    </ul>
  </section>

  <section class="help-section">
    <h4>🧮 判定の仕組み</h4>
    <p>暗号文から下の10個の統計値（特徴量）を計算し、長さ帯（英字20〜49・50〜99・100〜199・200〜399・400字以上）ごとに、
    各方式の「典型的な値の分布」とどれだけ合うかを比べます（単純ベイズ分類）。分布は、オースティン『高慢と偏見』の抜粋を各方式で暗号化して求めました。
    学習・評価の手順は乱数の種を固定したスクリプトになっていて、何度作り直しても同じ結果になります。</p>
    <dl id="helpFeatures" class="help-features"></dl>
  </section>

  <section class="help-section">
    <h4>📊 長さ別の正答率（実測）</h4>
    <p>各方式の暗号文を、長さ帯ごとに同じ件数ずつ判定したとき、正しい方式が1位になった割合（再現率）です。</p>
    <div class="table-scroll"><table id="helpAccuracy" class="wide-table"></table></div>
  </section>

  <section class="help-section">
    <h4>💡 使用上の注意</h4>
    <ul>
      <li>英語の文を暗号化したものが前提です。ほかの言語の文では、統計値が英語と違うので判定が外れます</li>
      <li>上の一覧にない方式（オートキー・ヒル暗号など）も、どれかの方式に振り分けられます。多くは「ヴィジュネル暗号」になります</li>
      <li>短い暗号文ほど外れやすくなります。とくに英字20〜49字では、当たる割合が大きく下がる方式があります（上の表）</li>
      <li>数字で書く暗号（ポリュビオス暗号など）は対象外です</li>
    </ul>
  </section>

  <section class="help-section">
    <h4>🔗 関連ツール（生成AIで作るセキュリティツール100）</h4>
    <ul>
      <li><a href="https://ipusiron.github.io/caesar-cipher-breaker/" target="_blank" rel="noopener noreferrer">Caesar Cipher Breaker（Day008）</a>：
        シーザー暗号を総当たりで解く</li>
      <li><a href="https://ipusiron.github.io/frequency-analyzer/" target="_blank" rel="noopener noreferrer">Frequency Analyzer（Day009）</a>：文字の頻度を詳しく見る</li>
      <li><a href="https://ipusiron.github.io/vigenere-cipher-tool/" target="_blank" rel="noopener noreferrer">Vigenère Cipher Tool（Day017）</a>：
        ヴィジュネル暗号の暗号化・復号</li>
      <li><a href="https://ipusiron.github.io/cipherclimb/" target="_blank" rel="noopener noreferrer">Cipher Climb（Day018）</a>：単一換字式暗号を山登り法で解く</li>
      <li><a href="https://ipusiron.github.io/grille-cipherlab/" target="_blank" rel="noopener noreferrer">Grille CipherLab（Day024）</a>：回転グリル暗号</li>
      <li><a href="https://ipusiron.github.io/playfair-cipherlab/" target="_blank" rel="noopener noreferrer">Playfair CipherLab（Day027）</a>：プレイフェア暗号</li>
      <li><a href="https://ipusiron.github.io/repeatseq-analyzer/" target="_blank" rel="noopener noreferrer">RepeatSeq Analyzer（Day028）</a>：繰り返しから鍵長を調べる</li>
      <li><a href="https://ipusiron.github.io/railfence-cipherlab/" target="_blank" rel="noopener noreferrer">RailFence CipherLab（Day034）</a>：レールフェンス暗号</li>
      <li><a href="https://ipusiron.github.io/columnar-cipherlab/" target="_blank" rel="noopener noreferrer">Columnar CipherLab（Day043）</a>：縦列転置式暗号</li>
      <li><a href="https://ipusiron.github.io/ic-learning-visualizer/" target="_blank" rel="noopener noreferrer">IC Learning Visualizer（Day047）</a>：一致指数を学ぶ</li>
      <li><a href="https://ipusiron.github.io/affine-cipherlab/" target="_blank" rel="noopener noreferrer">Affine CipherLab（Day049）</a>：アフィン暗号</li>
    </ul>
  </section>

  <section class="help-section">
    <h4>📄 このプロジェクトについて</h4>
    <p>本ツールは「生成AIで作るセキュリティツール100」プロジェクトのDay044として開発されました。
    <a href="https://github.com/ipusiron/cipher-clairvoyance" target="_blank" rel="noopener noreferrer">GitHubリポジトリー</a>／
    <a href="https://akademeia.info/?page_id=42163" target="_blank" rel="noopener noreferrer">プロジェクトの紹介</a></p>
  </section>
`.replace(/\n\s*/g, '');
