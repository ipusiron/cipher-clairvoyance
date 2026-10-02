// 判定の流れ（DOM非依存）: モデルの順位に、ヴィジュネル／オートキーの2段目の見分けを加える
// 2つは周期が見えない長さでは統計値がよく似るので、1位がどちらかで英字が STAGE2_MIN 字以上なら、
// 両方の試し解きをして、英語らしく戻った方（2文字の組の英語らしさが高い方）を1位にする。
// 画面の判定も、tools/build-model.mjs の評価も、この関数を通る（表示する正答率と同じ手順で測るため）

import { classifyVector, CLOSE_MARGIN } from './classifier.js';
import { solveVigenere, solveAutokey } from './solver.js';

export const STAGE2_MIN = 50;
const POLY = ['vigenere', 'autokey'];

export function decide(s, vector, model) {
  const r = classifyVector(vector, s.length, model);
  if (!r) return null;
  const ranking = r.ranking.map((x) => x.type);
  const out = { ...r, types: ranking, winner: ranking[0], stage2: null };
  if (s.length >= STAGE2_MIN && POLY.includes(ranking[0])) {
    const vig = solveVigenere(s, model.english);
    const auto = solveAutokey(s, model.english);
    const pick = vig.score >= auto.score ? 'vigenere' : 'autokey';
    const other = pick === 'vigenere' ? 'autokey' : 'vigenere';
    const types = [pick, ...ranking.filter((t) => t !== pick)];
    // 2段目で選んだ方を1位、もう一方を2位に置く
    out.types = [pick, other, ...types.filter((t) => t !== pick && t !== other)];
    out.winner = pick;
    out.stage2 = { vigenere: vig, autokey: auto, changed: pick !== ranking[0] };
    out.close = false;
  }
  out.second = out.types[1];
  return out;
}

export { CLOSE_MARGIN };
