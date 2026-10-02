// ヘルプモーダルの本文（静的なHTML、日本語と英語）。行の折り返しが表示で余計な空白にならないよう、
// 日本語は改行と字下げを取り除き、英語は空白1つに置き換えて使う。
// 特徴量の説明（#helpFeatures）と長さ別の正答率の表（#helpAccuracy）は、開くときにapp.jsが
// messages.jsとmodel.jsから組み立てる（本文と数字が食い違わないように）

const LINK = (path, label) => `<a href="https://ipusiron.github.io/${path}" target="_blank" rel="noopener noreferrer">${label}</a>`;

const JA = `
  <section class="help-section">
    <h4>🔮 このツールについて</h4>
    <p>Cipher Clairvoyance（サイファー・クレアボヤンス）は、英文を古典暗号で暗号化した文から、使われた方式を推定する教育用ツールです。
    判定に使った統計値をすべて表で見せ、「この長さの暗号文でこの判定が出たとき、実際に当たっていた割合」を実測値で示します。
    シーザー・アフィン・ヴィジュネル・オートキーは、鍵を推し量って平文に戻す「試し解き」も行います。</p>
  </section>

  <section class="help-section">
    <h4>🚀 使い方</h4>
    <ol>
      <li>暗号文を入力欄に貼り付けます（英字A〜Z以外の文字・空白は無視します）。1〜5の数字の組だけなら、ポリュビオス暗号として読みます</li>
      <li>「🔍 解析開始」（またはCtrl＋Enter）を押します</li>
      <li>1位の方式と、その判定が当たっていた割合を確かめます。お知らせ（接戦・短文・対象外の可能性など）があれば読んでください</li>
      <li>「試し解き」が出たら、戻した文が英文として読めるかを確かめます</li>
      <li>「判定根拠」の表で、どの統計値がどの方式の典型に近いかを見比べます</li>
      <li>「🔧 次に試すツール」から解読・学習のツールへ進みます。「渡して開く」は暗号文を入れた状態で開きます</li>
    </ol>
    <p>「📄 サンプル読み込み」には、各方式の暗号文と「判定が崩れる例」があります。</p>
  </section>

  <section class="help-section">
    <h4>🔐 判定できる方式</h4>
    <ul>
      <li><strong>英語の平文のまま</strong>：暗号化されていない英文</li>
      <li><strong>シーザー暗号</strong>：全部の字を同じ数だけずらす（試し解きあり）</li>
      <li><strong>アフィン暗号</strong>：式(a×x＋b) mod 26で置き換える。アトバシュ暗号はa＝25、b＝25の場合（試し解きあり）</li>
      <li><strong>単一換字式暗号</strong>：決まった対応表で1文字ずつ置き換える</li>
      <li><strong>ヴィジュネル暗号</strong>：キーワードで位置ごとにずらす量を変える。鍵長の候補を出し、ボーフォート型（各列で字の並びが逆向き）も試し解きで見分けます</li>
      <li><strong>オートキー暗号</strong>：最初の数文字（プライマー）のあとは平文そのものを鍵にする。周期がありません（試し解きあり）</li>
      <li><strong>プレイフェア暗号</strong>：5×5の表で2文字ずつ置き換える</li>
      <li><strong>バイフィッド暗号</strong>：5×5の表の行と列の数字を分けてつなぎ直す</li>
      <li><strong>転置式暗号</strong>：字は変えずに並びを入れ替える（レールフェンス・縦列転置・回転グリルなど、どれかまでは区別しません）</li>
      <li><strong>ADFGX／ADFGVX暗号</strong>：暗号文がA・D・F・G・(V)・Xだけでできていれば、統計を使わずに判定します</li>
      <li><strong>ポリュビオス暗号</strong>：1〜5の数字の組だけの入力は、標準の表で字に戻してから判定します（標準の表なら「英語の平文のまま」、表を並べ替えていれば「単一換字式暗号」と出ます）</li>
    </ul>
  </section>

  <section class="help-section">
    <h4>📏 結果の読み方</h4>
    <ul>
      <li><strong>当たっていた割合</strong>：学習に使っていない英文（ディケンズ『二都物語』）を、各方式で同じ件数ずつ暗号化して判定し、
        「この長さ帯でこの方式と判定されたもののうち、本当にその方式だった割合」を数えた実測値です。どの方式も同じくらい出てくる、という前提の値で、対象外の方式は含みません</li>
      <li><strong>試し解き</strong>：戻した文が英語らしいか（隣り合う2文字の組の出やすさ）だけを手がかりに鍵を選んでいます。英文らしく戻れば、判定と鍵の両方が正しい見込みが高くなります</li>
      <li><strong>2段目の見分け</strong>：ヴィジュネル暗号とオートキー暗号は統計値がよく似るので、英字50字以上なら両方で試し解きをして、英文らしく戻った方を1位にします</li>
      <li><strong>接戦</strong>：1位と2位の当てはまりの差が小さいときに知らせます。差が小さいときの当たり方も実測値で添えます</li>
      <li><strong>ほかの候補</strong>：当てはまりのよい順に並べた順位です。確率の数字は出しません（このモデルの確率は高く出すぎるためです）</li>
      <li><strong>対象外の方式の可能性</strong>：英字200字以上あるのに試し解きで英文に戻らないとき、ヴィジュネル暗号なのに周期が見えないときに知らせます</li>
    </ul>
  </section>

  <section class="help-section">
    <h4>🧮 判定の仕組み</h4>
    <p>暗号文から下の10個の統計値（特徴量）を計算し、長さ帯（英字20〜49・50〜99・100〜199・200〜399・400字以上）ごとに、
    9つの方式の「典型的な値の分布」とどれだけ合うかを比べます（単純ベイズ分類）。分布は、オースティン『高慢と偏見』の抜粋を各方式で暗号化して求めました。
    学習・評価の手順は乱数の種を固定したスクリプトになっていて、何度作り直しても同じ結果になります。</p>
    <dl id="helpFeatures" class="help-features"></dl>
  </section>

  <section class="help-section">
    <h4>📊 長さ別の正答率（実測）</h4>
    <p>各方式の暗号文を、長さ帯ごとに同じ件数ずつ判定したとき、正しい方式が1位になった割合（再現率）です。2段目の見分けも含めた、画面と同じ手順の値です。</p>
    <div class="table-scroll"><table id="helpAccuracy" class="wide-table"></table></div>
  </section>

  <section class="help-section">
    <h4>💡 使用上の注意</h4>
    <ul>
      <li>英語の文を暗号化したものが前提です。ほかの言語の文では、統計値が英語と違うので判定が外れます</li>
      <li>上の一覧にない方式（ヒル暗号など）も、どれかの方式に振り分けられます。多くはヴィジュネル暗号かオートキー暗号になり、試し解きでは英文に戻りません</li>
      <li>短い暗号文ほど外れやすくなります。とくに英字20〜49字では、ヴィジュネル暗号・オートキー暗号・バイフィッド暗号はほとんど見分けられません（上の表）</li>
      <li>「渡して開く」は暗号文をURLに入れます。Day043以外は暗号文がGitHub Pagesのサーバーに届くので、人に見せたくない文は渡さないでください</li>
    </ul>
  </section>

  <section class="help-section">
    <h4>🔗 関連ツール（生成AIで作るセキュリティツール100）</h4>
    <ul>
      <li>${LINK('caesar-cipher-breaker/', 'Caesar Cipher Breaker（Day008）')}：シーザー暗号を総当たりで解く</li>
      <li>${LINK('frequency-analyzer/', 'Frequency Analyzer（Day009）')}：文字の頻度を詳しく見る</li>
      <li>${LINK('vigenere-cipher-tool/', 'Vigenère Cipher Tool（Day017）')}：ヴィジュネル暗号の暗号化・復号</li>
      <li>${LINK('cipherclimb/', 'Cipher Climb（Day018）')}：単一換字式暗号を山登り法で解く</li>
      <li>${LINK('grille-cipherlab/', 'Grille CipherLab（Day024）')}：回転グリル暗号</li>
      <li>${LINK('playfair-cipherlab/', 'Playfair CipherLab（Day027）')}：プレイフェア暗号</li>
      <li>${LINK('repeatseq-analyzer/', 'RepeatSeq Analyzer（Day028）')}：繰り返しから鍵長を調べる</li>
      <li>${LINK('modular-text-divider/', 'Modular Text Divider（Day030）')}：周期ごとの列に分けて解く</li>
      <li>${LINK('railfence-cipherlab/', 'RailFence CipherLab（Day034）')}：レールフェンス暗号</li>
      <li>${LINK('columnar-cipherlab/', 'Columnar CipherLab（Day043）')}：縦列転置式暗号</li>
      <li>${LINK('ic-learning-visualizer/', 'IC Learning Visualizer（Day047）')}：一致指数を学ぶ</li>
      <li>${LINK('affine-cipherlab/', 'Affine CipherLab（Day049）')}：アフィン暗号</li>
    </ul>
  </section>

  <section class="help-section">
    <h4>📄 このプロジェクトについて</h4>
    <p>本ツールは「生成AIで作るセキュリティツール100」プロジェクトのDay044として開発されました。
    <a href="https://github.com/ipusiron/cipher-clairvoyance" target="_blank" rel="noopener noreferrer">GitHubリポジトリー</a>／
    <a href="https://akademeia.info/?page_id=42163" target="_blank" rel="noopener noreferrer">プロジェクトの紹介</a></p>
  </section>
`.replace(/\n\s*/g, '');

const EN = `
  <section class="help-section">
    <h4>🔮 About this tool</h4>
    <p>Cipher Clairvoyance is an educational tool that estimates which classical cipher was used to encrypt English text.
    It shows every statistic behind the verdict in a table, together with the measured rate at which this verdict was actually correct
    for ciphertexts of the same length. For the Caesar, affine, Vigenère and autokey ciphers it also guesses the key and turns the text
    back into plaintext (a "trial decryption").</p>
  </section>

  <section class="help-section">
    <h4>🚀 How to use</h4>
    <ol>
      <li>Paste the ciphertext into the input box (characters other than A-Z and spaces are ignored).
        If it consists only of pairs of the digits 1-5, it is read as a Polybius square cipher</li>
      <li>Press "🔍 Analyze" (or Ctrl+Enter)</li>
      <li>Check the first-place method and how often that verdict was actually correct. Read any notes (close call, short text, possibly unsupported,
        and so on)</li>
      <li>If a trial decryption appears, check whether the result reads as English</li>
      <li>Use the table under "Why this verdict" to compare which statistics are close to the typical values of which method</li>
      <li>Continue with the decoding and learning tools under "🔧 Tools to try next". "Open it with this ciphertext" opens the tool with the text filled in</li>
    </ol>
    <p>"📄 Load a sample" offers ciphertexts for each method and two "failing cases".</p>
  </section>

  <section class="help-section">
    <h4>🔐 Supported methods</h4>
    <ul>
      <li><strong>Plain English</strong>: English that is not encrypted</li>
      <li><strong>Caesar cipher</strong>: every letter shifted by the same amount (with trial decryption)</li>
      <li><strong>Affine cipher</strong>: letters replaced by (a×x + b) mod 26. The Atbash cipher is the case a = 25, b = 25 (with trial decryption)</li>
      <li><strong>Simple substitution cipher</strong>: each letter replaced by a fixed table</li>
      <li><strong>Vigenère cipher</strong>: the shift changes with the letters of a keyword. Key length candidates are shown,
        and the trial decryption also recognizes the Beaufort type (the alphabet runs backwards in each column)</li>
      <li><strong>Autokey cipher</strong>: after the first few letters (the primer), the plaintext itself is the key. It has no period (with trial
        decryption)</li>
      <li><strong>Playfair cipher</strong>: letters replaced two at a time with a 5×5 table</li>
      <li><strong>Bifid cipher</strong>: the row and column numbers of a 5×5 table are split and joined again</li>
      <li><strong>Transposition cipher</strong>: the letters are kept and only their order changes (rail fence, columnar, turning grille and so on are
        not told apart)</li>
      <li><strong>ADFGX/ADFGVX cipher</strong>: decided without statistics when the ciphertext uses only A, D, F, G, (V) and X</li>
      <li><strong>Polybius square cipher</strong>: input made only of pairs of the digits 1-5 is turned back into letters with the standard table and
        then analyzed
        ("plain English" for the standard table, "simple substitution" for a shuffled one)</li>
    </ul>
  </section>

  <section class="help-section">
    <h4>📏 Reading the result</h4>
    <ul>
      <li><strong>Actually correct</strong>: an evaluation text not used for training (Dickens, A Tale of Two Cities) was encrypted with each method
        the same number of times. This is the measured share of verdicts naming this method, for this length range, that really were this method.
        It assumes every method is equally common, and it does not cover unsupported methods</li>
      <li><strong>Trial decryption</strong>: the key is chosen only by how English-like the result is (how common its adjacent letter pairs are).
        If it turns back into English, both the verdict and the key are very likely right</li>
      <li><strong>Second stage</strong>: the Vigenère and autokey ciphers have very similar statistics. With 50 or more letters, both are trial-decrypted
        and the one that turns back into English is ranked first</li>
      <li><strong>Close call</strong>: shown when the fit of first and second place is close, with the measured accuracy for such cases</li>
      <li><strong>Other candidates</strong>: ranked by fit. No probabilities are shown, because this model's probabilities are overconfident</li>
      <li><strong>Possibly unsupported</strong>: shown when a text of 200 or more letters does not turn back into English in the trial decryption,
        or when a Vigenère verdict has no visible period</li>
    </ul>
  </section>

  <section class="help-section">
    <h4>🧮 How it works</h4>
    <p>The tool computes the 10 statistics (features) below and, for each length range (20-49, 50-99, 100-199, 200-399 and 400+ letters),
    compares them with the typical distributions of nine methods (naive Bayes classification). The distributions come from encrypting
    an excerpt of Jane Austen's Pride and Prejudice with each method. Training and evaluation run in a script with a fixed random seed,
    so rebuilding always gives the same result.</p>
    <dl id="helpFeatures" class="help-features"></dl>
  </section>

  <section class="help-section">
    <h4>📊 Accuracy by length (measured)</h4>
    <p>The share of ciphertexts of each method, judged in equal numbers for each length range, whose correct method came first (recall).
    These values come from the same procedure as the screen, including the second stage.</p>
    <div class="table-scroll"><table id="helpAccuracy" class="wide-table"></table></div>
  </section>

  <section class="help-section">
    <h4>💡 Notes</h4>
    <ul>
      <li>The tool assumes encrypted English. Text in other languages has different statistics, so the verdict will be wrong</li>
      <li>Methods not in the list above (such as the Hill cipher) are still assigned to one of the methods, usually Vigenère or autokey,
        and their trial decryption does not turn back into English</li>
      <li>The shorter the text, the more often the verdict is wrong. With 20-49 letters the Vigenère, autokey and Bifid ciphers can hardly be told
        apart (see the table above)</li>
      <li>"Open it with this ciphertext" puts the ciphertext into the URL. Except for Day043, the ciphertext reaches the GitHub Pages server,
        so do not pass text you want to keep private</li>
    </ul>
  </section>

  <section class="help-section">
    <h4>🔗 Related tools (100 Security Tools with Generative AI)</h4>
    <ul>
      <li>${LINK('caesar-cipher-breaker/', 'Caesar Cipher Breaker (Day008)')}: solve a Caesar cipher by brute force</li>
      <li>${LINK('frequency-analyzer/', 'Frequency Analyzer (Day009)')}: look at letter frequencies in detail</li>
      <li>${LINK('vigenere-cipher-tool/', 'Vigenère Cipher Tool (Day017)')}: encrypt and decrypt the Vigenère cipher</li>
      <li>${LINK('cipherclimb/', 'Cipher Climb (Day018)')}: solve simple substitution by hill climbing</li>
      <li>${LINK('grille-cipherlab/', 'Grille CipherLab (Day024)')}: the turning grille</li>
      <li>${LINK('playfair-cipherlab/', 'Playfair CipherLab (Day027)')}: the Playfair cipher</li>
      <li>${LINK('repeatseq-analyzer/', 'RepeatSeq Analyzer (Day028)')}: find the key length from repeats</li>
      <li>${LINK('modular-text-divider/', 'Modular Text Divider (Day030)')}: split the text into columns by period</li>
      <li>${LINK('railfence-cipherlab/', 'RailFence CipherLab (Day034)')}: the rail fence cipher</li>
      <li>${LINK('columnar-cipherlab/', 'Columnar CipherLab (Day043)')}: columnar transposition</li>
      <li>${LINK('ic-learning-visualizer/', 'IC Learning Visualizer (Day047)')}: learn the index of coincidence</li>
      <li>${LINK('affine-cipherlab/', 'Affine CipherLab (Day049)')}: the affine cipher</li>
    </ul>
  </section>

  <section class="help-section">
    <h4>📄 About the project</h4>
    <p>This tool was built as Day044 of the "100 Security Tools with Generative AI" project.
    <a href="https://github.com/ipusiron/cipher-clairvoyance" target="_blank" rel="noopener noreferrer">GitHub repository</a> /
    <a href="https://akademeia.info/?page_id=42163" target="_blank" rel="noopener noreferrer">About the project (Japanese)</a></p>
  </section>
`.replace(/\n\s*/g, ' ').trim();

export const HELP_CONTENT = { ja: JA, en: EN };
