// 判定の流れ（DOM非依存）: モデルの順位に、統計値の似た方式どうしの2段目の見分けを加える
// ヴィジュネル・オートキー・ヒル（2×2）は、周期が見えない長さでは統計値がよく似る。1位がこのどれかで英字が
// STAGE2_MIN 字以上なら、3つとも試し解きをして、英語らしく戻った方（2文字の組の英語らしさが高い方）を1位にする。
// 画面の判定も、tools/build-model.mjs の評価も、この関数を通る（表示する正答率と同じ手順で測るため）

import { classifyVector, CLOSE_MARGIN } from './classifier.js';
import { solveVigenere, solveAutokey, solveHill2 } from './solver.js';

export const STAGE2_MIN = 50;
export const STAGE2_TYPES = ['vigenere', 'autokey', 'hill'];
const SOLVERS = { vigenere: solveVigenere, autokey: solveAutokey, hill: solveHill2 };

export function decide(s, vector, model) {
  const r = classifyVector(vector, s.length, model);
  if (!r) return null;
  const ranking = r.ranking.map((x) => x.type);
  const out = { ...r, types: ranking, winner: ranking[0], stage2: null };
  const group = STAGE2_TYPES.filter((t) => model.classes.includes(t));
  if (s.length >= STAGE2_MIN && group.includes(ranking[0])) {
    const trials = Object.fromEntries(group.map((t) => [t, SOLVERS[t](s, model.english)]));
    const scored = group.filter((t) => trials[t]).sort((a, b) => trials[b].score - trials[a].score || ranking.indexOf(a) - ranking.indexOf(b));
    const pick = scored[0];
    // 2段目で比べた方式を、英語らしさの順に上位へ置く
    out.types = [...scored, ...ranking.filter((t) => !scored.includes(t))];
    out.winner = pick;
    out.stage2 = { ...trials, changed: pick !== ranking[0] };
    out.close = false;
  }
  out.second = out.types[1];
  return out;
}

export { CLOSE_MARGIN };
