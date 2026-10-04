// 判定結果から案内する関連ツールと、暗号文を渡して開くリンク（DOM非依存）
// いずれも「生成AIで作るセキュリティツール100」のツール。受け取り方は各ツールの README の仕様に合わせる
//   Day009 Frequency Analyzer  ?text=（5,000字まで。読み込むと頻度分析を実行）
//   Day017 Vigenère Cipher Tool ?text=（入力欄に読み込む）
//   Day030 Modular Text Divider ?text=…&n=…（10,000字まで、n は1〜20。周期 n で列に分ける）
//   Day046 AlphaLoom           ?text=（10,000字まで。n は付けない＝AlphaLoom が鍵の長さを推定する。1位の周期が鍵の約数のことがあるため）
//   Day047 IC Learning Visualizer ?text=…&tab=advanced（10,000字まで。鍵長の推定のタブで、候補を倍数まで並べる）
//   Day043 Columnar CipherLab   #tab=lab&c=…&m=incomplete（「#」より後ろなのでサーバーへは送られない。解読ラボで開く）

export const BASE = 'https://ipusiron.github.io/';

const TOOLS = {
  caesarBreaker: { key: 'links.caesar', path: 'caesar-cipher-breaker/' },
  frequency: { key: 'links.frequency', path: 'frequency-analyzer/', pass: { key: 'links.pass.frequency', via: 'query', max: 5000 } },
  affine: { key: 'links.affine', path: 'affine-cipherlab/' },
  cipherclimb: { key: 'links.cipherclimb', path: 'cipherclimb/' },
  vigenere: { key: 'links.vigenere', path: 'vigenere-cipher-tool/', pass: { key: 'links.pass.vigenere', via: 'query', max: 100000 } },
  divider: { key: 'links.divider', path: 'modular-text-divider/', pass: { key: 'links.pass.divider', via: 'query', max: 10000, needsPeriod: true } },
  repeatseq: { key: 'links.repeatseq', path: 'repeatseq-analyzer/' },
  alphaloom: { key: 'links.alphaloom', path: 'alphaloom/', pass: { key: 'links.pass.alphaloom', via: 'query', max: 10000 } },
  ic: { key: 'links.ic', path: 'ic-learning-visualizer/', pass: { key: 'links.pass.ic', via: 'query', max: 10000, tab: 'advanced' } },
  playfair: { key: 'links.playfair', path: 'playfair-cipherlab/' },
  railfence: { key: 'links.railfence', path: 'railfence-cipherlab/' },
  columnar: { key: 'links.columnar', path: 'columnar-cipherlab/', pass: { key: 'links.pass.columnar', via: 'fragment', max: 10000 } },
  grille: { key: 'links.grille', path: 'grille-cipherlab/' }
};

export const LINKS_BY_TYPE = {
  caesar: ['caesarBreaker', 'frequency'],
  affine: ['affine', 'frequency'],
  substitution: ['cipherclimb', 'frequency'],
  vigenere: ['vigenere', 'alphaloom', 'divider', 'repeatseq', 'ic'],
  autokey: ['frequency', 'ic'],
  playfair: ['playfair'],
  bifid: ['frequency'],
  hill: ['frequency'],
  transposition: ['columnar', 'railfence', 'grille']
};

export const MAX_PERIOD = 20;

function passUrl(tool, letters, period) {
  const p = tool.pass;
  const params = new URLSearchParams();
  if (p.via === 'fragment') {
    params.set('tab', 'lab');
    params.set('c', letters);
    params.set('m', 'incomplete');
    return `${BASE}${tool.path}#${params.toString()}`;
  }
  params.set('text', letters);
  if (p.needsPeriod) params.set('n', String(period));
  if (p.tab) params.set('tab', p.tab);
  return `${BASE}${tool.path}?${params.toString()}`;
}

// type＝判定した方式、letters＝英字だけの暗号文、period＝鍵長の候補の1位（なければ null）
export function buildToolLinks(type, letters, period = null) {
  return (LINKS_BY_TYPE[type] || []).map((id) => {
    const tool = TOOLS[id];
    const link = { id, key: tool.key, href: BASE + tool.path, pass: null };
    if (tool.pass) {
      const usablePeriod = Number.isInteger(period) && period >= 1 && period <= MAX_PERIOD;
      if (tool.pass.needsPeriod && !usablePeriod) return link;
      const tooLong = letters.length > tool.pass.max;
      link.pass = {
        key: tool.pass.key,
        via: tool.pass.via,
        max: tool.pass.max,
        tooLong,
        href: tooLong ? null : passUrl(tool, letters, period),
        period: tool.pass.needsPeriod ? period : null
      };
    }
    return link;
  });
}

// すべてのツールの URL（README とテストで使う）
export function allToolUrls() {
  return [...new Set(Object.values(TOOLS).map((x) => BASE + x.path))];
}
