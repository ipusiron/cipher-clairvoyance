// グラフ（SVG）の描画。色は style.css のクラスで付ける（ダークモードでも同じクラスで切り替わる）
// 各棒の <title> にマウスを重ねると数値が出る。タッチ端末では、グラフの下の数値の表・説明文で同じ値を読める

import { t } from './messages.js';

const NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs, className) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (className) node.setAttribute('class', className);
  return node;
}

function withTitle(node, text) {
  const title = document.createElementNS(NS, 'title');
  title.textContent = text;
  node.append(title);
  return node;
}

function label(x, y, text, className = 'chart-label') {
  const node = svgEl('text', { x, y, 'text-anchor': 'middle' }, className);
  node.textContent = text;
  return node;
}

// 文字の出現頻度（暗号文と英語）
export function drawFrequencyChart(svg, counts, n, english) {
  const width = 520;
  const height = 180;
  const base = height - 20;
  const barWidth = width / 26;
  const maxP = Math.max(...counts.map((c) => c / n), ...english);
  const scale = (p) => (p / maxP) * (base - 10);
  svg.replaceChildren();
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    const p = n ? counts[i] / n : 0;
    const g = svgEl('g', {}, 'bar-group');
    g.append(svgEl('rect', { x: i * barWidth + 2, y: base - scale(english[i]), width: barWidth - 4, height: scale(english[i]) }, 'bar-expected'));
    g.append(svgEl('rect', { x: i * barWidth + 5, y: base - scale(p), width: barWidth - 10, height: scale(p) }, 'bar-observed'));
    withTitle(g, t('freq.barTitle', { letter, percent: (p * 100).toFixed(1), count: counts[i], english: (english[i] * 100).toFixed(1) }));
    g.append(label(i * barWidth + barWidth / 2, height - 5, letter));
    svg.append(g);
  }
}

// 周期ごとの一致指数（目安の線と、鍵長の候補の強調つき）
export function drawPeriodChart(svg, curve, candidates, threshold) {
  const width = 400;
  const height = 120;
  const base = height - 18;
  svg.replaceChildren();
  if (!curve.length) return;
  const maxIc = Math.max(0.08, ...curve.map((p) => p.ic));
  const scale = (v) => (v / maxIc) * (base - 14);
  const barWidth = width / curve.length;
  const top = new Set(candidates.slice(0, 3));
  curve.forEach((p, i) => {
    const cls = top.has(p.k) ? 'bar-hit' : p.ic >= threshold ? 'bar-over' : 'bar-plain';
    const g = svgEl('g', {}, 'bar-group');
    g.append(svgEl('rect', { x: i * barWidth + 2, y: base - scale(p.ic), width: Math.max(2, barWidth - 4), height: scale(p.ic) }, cls));
    withTitle(g, t('period.barTitle', { k: p.k, ic: p.ic.toFixed(4) }));
    g.append(label(i * barWidth + barWidth / 2, height - 4, String(p.k)));
    svg.append(g);
  });
  const y = base - scale(threshold);
  svg.append(svgEl('line', { x1: 0, y1: y, x2: width, y2: y }, 'threshold-line'));
}

// カシスキー法の集計（周期ごとの、間隔を割り切る組の数）
export function drawKasiskiChart(svg, byPeriod) {
  const width = 400;
  const height = 120;
  const base = height - 18;
  svg.replaceChildren();
  const max = Math.max(0, ...byPeriod.map((x) => x.count));
  const barWidth = width / byPeriod.length;
  byPeriod.forEach((x, i) => {
    const h = max ? (x.count / max) * (base - 14) : 0;
    const g = svgEl('g', {}, 'bar-group');
    g.append(svgEl('rect', { x: i * barWidth + 2, y: base - h, width: Math.max(2, barWidth - 4), height: h }, 'bar-kasiski'));
    withTitle(g, t('kasiski.barTitle', { k: x.k, count: x.count }));
    g.append(label(i * barWidth + barWidth / 2, height - 4, String(x.k)));
    svg.append(g);
  });
}
