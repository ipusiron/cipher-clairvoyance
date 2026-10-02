// 画面の描画（DOM操作）。文言は messages.js の t() で組み立て、入力由来の文字列は textContent でだけ表示する

import { t } from './messages.js';
import { MIN_LETTERS } from './analysis.js';
import { lettersOnly } from './cipher-core.js';
import { drawFrequencyChart, drawPeriodChart, drawKasiskiChart } from './visualization.js';
import { KEY_IC_THRESHOLD } from './keylength.js';
import { FEATURES } from './features.js';
import { MODEL } from './model.js';

const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const percent = (a, b) => (b ? Math.round((a / b) * 100) : 0);

// 判定結果から案内する関連ツール（いずれも「生成AIで作るセキュリティツール100」）
const BASE = 'https://ipusiron.github.io/';
export const TOOL_LINKS = {
  caesar: [['links.caesar', 'caesar-cipher-breaker/'], ['links.frequency', 'frequency-analyzer/']],
  affine: [['links.affine', 'affine-cipherlab/'], ['links.frequency', 'frequency-analyzer/']],
  substitution: [['links.cipherclimb', 'cipherclimb/'], ['links.frequency', 'frequency-analyzer/']],
  vigenere: [['links.vigenere', 'vigenere-cipher-tool/'], ['links.repeatseq', 'repeatseq-analyzer/'], ['links.ic', 'ic-learning-visualizer/']],
  playfair: [['links.playfair', 'playfair-cipherlab/']],
  transposition: [['links.railfence', 'railfence-cipherlab/'], ['links.columnar', 'columnar-cipherlab/'], ['links.grille', 'grille-cipherlab/']]
};

export function rangeText(bucket) {
  return bucket.max === null ? t('range.open', { min: bucket.min }) : t('range.closed', { min: bucket.min, max: bucket.max });
}

function cipherName(r, type) {
  if (type === 'adfgvx' && r.variant === 'adfgx') return t('cipher.adfgx');
  return t(`cipher.${type}`);
}

function noteText(note) {
  const params = { ...note.params };
  if (note.key === 'note.close') params.second = t(`cipher.${params.second}`);
  if (note.key === 'note.ignored') params.sample = params.sample.map((c) => t('note.ignoredChar', { c }));
  return t(note.key, params);
}

// 入力欄の下の文字数
export function updateInputCount(text) {
  $('inputCount').textContent = t('input.count', { letters: lettersOnly(text).length, min: MIN_LETTERS });
}

// 解析できない理由（errors）と、続けたうえでのお知らせ（notes）
export function showInputMessages(errors, notes) {
  const box = $('inputError');
  const msg = box.querySelector('.error-message');
  const textarea = $('cipherText');
  if (errors.length) {
    msg.textContent = errors.map((e) => t(e.key, e.params)).join(' ');
    box.classList.remove('hidden');
    textarea.setAttribute('aria-invalid', 'true');
  } else {
    msg.textContent = '';
    box.classList.add('hidden');
    textarea.removeAttribute('aria-invalid');
  }
  const list = $('inputNotes');
  list.replaceChildren(...notes.filter((n) => n.key === 'note.ignored' || n.key === 'note.fewLetters').map((n) => el('li', '', noteText(n))));
  list.classList.toggle('hidden', list.children.length === 0);
}

export function setStale(stale) {
  const note = $('staleNote');
  note.textContent = stale ? t('note.stale') : '';
  note.classList.toggle('hidden', !stale);
  $('mainResult').classList.toggle('is-stale', stale);
}

function renderMeasured(r) {
  const fill = $('confidenceLevel');
  if (r.method === 'rule') {
    const size = r.variant === 'adfgx' ? 5 : 6;
    $('measuredLabel').textContent = t('result.rule', { symbols: t(`symbols.${r.variant}`), size });
    $('confidenceText').textContent = '';
    $('measuredNote').textContent = '';
    fill.parentElement.classList.add('hidden');
    return;
  }
  fill.parentElement.classList.remove('hidden');
  const p = percent(r.measured.correct, r.measured.predicted);
  $('measuredLabel').textContent = t('result.measured', { range: rangeText(r.bucket) });
  $('confidenceText').textContent = t('result.measuredValue', { percent: p, correct: r.measured.correct, predicted: r.measured.predicted });
  $('measuredNote').textContent = t('result.measuredNote');
  fill.style.width = `${p}%`;
  fill.classList.toggle('level-high', p >= 90);
  fill.classList.toggle('level-mid', p >= 70 && p < 90);
  fill.classList.toggle('level-low', p < 70);
}

function renderOthers(r) {
  const box = $('otherPossibilities');
  box.replaceChildren();
  if (r.method !== 'model') return;
  box.append(el('h4', '', t('result.others')));
  const list = el('ol', 'possibility-list');
  r.ranking.slice(1, 4).forEach((type, i) => list.append(el('li', 'possibility-chip', t('result.rank', { rank: i + 2, name: t(`cipher.${type}`) }))));
  box.append(list);
}

function formatValue(f, v) {
  if (f.kind === 'bernoulli') return v ? t('evidence.yes') : t('evidence.no');
  return f.digits === 0 ? String(Math.round(v)) : v.toFixed(f.digits);
}

function formatTypical(f, v) {
  if (f.kind === 'bernoulli') return t('evidence.rate', { percent: Math.round(v * 100) });
  return f.digits === 0 ? v.toFixed(1) : v.toFixed(f.digits);
}

function renderEvidence(r) {
  const box = $('evidenceContent');
  box.replaceChildren();
  if (r.method === 'rule') {
    box.append(el('p', 'evidence-description', t('evidence.ruleBody')));
    return;
  }
  const first = t(`cipher.${r.winner}`);
  const second = t(`cipher.${r.second}`);
  if (r.decisive.length) {
    const group = el('div', 'evidence-group');
    group.append(el('h4', '', t('evidence.decisive', { first, second })));
    const list = el('ul', 'decisive-list');
    for (const id of r.decisive) {
      const li = el('li', '');
      li.append(el('strong', '', t(`feature.${id}`)), el('span', '', t('evidence.decisiveHelp', { help: t(`featureHelp.${id}`) })));
      list.append(li);
    }
    group.append(list);
    box.append(group);
  }
  const wrap = el('div', 'table-scroll');
  const table = el('table', 'evidence-table wide-table');
  table.append(el('caption', '', t('evidence.tableCaption')));
  const head = el('tr');
  for (const h of [t('evidence.colFeature'), t('evidence.colValue'), t('evidence.colPlain'), first, second]) {
    const th = el('th', '', h);
    th.scope = 'col';
    head.append(th);
  }
  const thead = el('thead');
  thead.append(head);
  const tbody = el('tbody');
  for (const f of r.features) {
    const tr = el('tr', r.decisive.includes(f.id) ? 'is-decisive' : '');
    const th = el('th', '', t(`feature.${f.id}`));
    th.scope = 'row';
    th.title = t(`featureHelp.${f.id}`);
    tr.append(th, el('td', 'num', formatValue(f, f.value)), el('td', 'num', formatTypical(f, f.plain)),
      el('td', 'num', formatTypical(f, f.winner)), el('td', 'num', formatTypical(f, f.second)));
    tbody.append(tr);
  }
  table.append(thead, tbody);
  wrap.append(table);
  box.append(wrap);
}

function renderLinks(r) {
  const box = $('toolLinks');
  const links = TOOL_LINKS[r.winner] || [];
  box.replaceChildren();
  box.classList.toggle('hidden', links.length === 0);
  if (!links.length) return;
  box.append(el('div', 'tool-header', t('links.title')));
  const list = el('ul', 'tool-list');
  for (const [key, path] of links) {
    const a = el('a', 'tool-link', t(key));
    a.href = BASE + path;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    const li = el('li');
    li.append(a);
    list.append(li);
  }
  box.append(list);
}

export function renderDetails(r) {
  const stats = $('basicStats');
  const items = [
    [t('stats.letters'), String(r.n)],
    [t('stats.ic'), r.values.ic.toFixed(4)],
    [t('stats.chi'), r.values.chiEnglish.toFixed(3)],
    [t('stats.distinct'), String(r.values.distinct)]
  ];
  stats.replaceChildren(...items.map(([label, value]) => {
    const d = el('div', 'stat-item');
    d.append(el('div', 'stat-label', label), el('div', 'stat-value', value));
    return d;
  }));

  drawFrequencyChart($('freqChart'), r.counts, r.n, r.english);
  const table = $('freqTable');
  const head = el('tr');
  for (const h of ['freq.colLetter', 'freq.colCount', 'freq.colPercent', 'freq.colEnglish']) {
    const th = el('th', '', t(h));
    th.scope = 'col';
    head.append(th);
  }
  const rows = r.counts.map((c, i) => {
    const tr = el('tr');
    const th = el('th', '', String.fromCharCode(65 + i));
    th.scope = 'row';
    tr.append(th, el('td', 'num', String(c)), el('td', 'num', ((c / r.n) * 100).toFixed(1)), el('td', 'num', (r.english[i] * 100).toFixed(1)));
    return tr;
  });
  const thead = el('thead');
  thead.append(head);
  const tbody = el('tbody');
  tbody.append(...rows);
  table.replaceChildren(thead, tbody);
  $('freqTableSummary').textContent = t('freq.table');

  drawPeriodChart($('periodChart'), r.keyLength.curve, r.keyLength.candidates, KEY_IC_THRESHOLD);
  const info = $('keyLengthInfo');
  info.replaceChildren();
  if (!r.keyLength.curve.length) {
    info.append(el('span', '', t('period.none')));
  } else {
    info.append(el('span', '', t('period.candidates', { threshold: KEY_IC_THRESHOLD, list: r.keyLength.candidates })));
    if (r.winner !== 'vigenere') info.append(el('span', 'muted', ` ${t('period.notVigenere')}`));
    if (r.bucket && r.keyStats) {
      const ks = r.keyStats;
      const params = { range: rangeText(r.bucket), top1: percent(ks.top1, ks.count), top3: percent(ks.top3, ks.count) };
      info.append(el('span', 'muted block', t('period.accuracy', params)));
    }
  }
  drawKasiskiChart($('kasiskiChart'), r.kasiski.byPeriod);
  $('kasiskiInfo').textContent = r.kasiski.repeats ? t('kasiski.summary', { repeats: r.kasiski.repeats }) : t('kasiski.none');
}

// 解析結果を描く
export function renderResult(r) {
  $('mainResult').classList.remove('hidden');
  $('winnerName').textContent = cipherName(r, r.winner);
  $('winnerDesc').textContent = t(r.winner === 'adfgvx' && r.variant === 'adfgx' ? 'desc.adfgx' : `desc.${r.winner}`);
  renderMeasured(r);
  const notes = $('resultNotes');
  notes.replaceChildren(...r.notes.filter((n) => n.key !== 'note.ignored' && n.key !== 'note.fewLetters').map((n) => el('li', '', noteText(n))));
  notes.classList.toggle('hidden', notes.children.length === 0);
  renderOthers(r);
  renderEvidence(r);
  renderLinks(r);
  renderDetails(r);
  document.querySelectorAll('.toggle-section').forEach((s) => s.classList.remove('hidden'));
  setStale(false);
}

// ヘルプの中の、特徴量の説明と長さ別の正答率の表（辞書とモデルから組み立てる）
export function renderHelpExtras(root, model = MODEL) {
  const dl = root.querySelector('#helpFeatures');
  if (dl) {
    dl.replaceChildren(...FEATURES.flatMap((f) => [el('dt', '', t(`feature.${f.id}`)), el('dd', '', t(`featureHelp.${f.id}`))]));
  }
  const table = root.querySelector('#helpAccuracy');
  if (table) {
    const head = el('tr');
    const corner = el('th', '', t('help.colCipher'));
    corner.scope = 'col';
    head.append(corner);
    for (const b of model.buckets) {
      const th = el('th', '', b.max === null ? t('help.bucketOpen', { min: b.min }) : t('help.bucketClosed', { min: b.min, max: b.max }));
      th.scope = 'col';
      head.append(th);
    }
    const thead = el('thead');
    thead.append(head);
    const tbody = el('tbody');
    for (const c of model.classes) {
      const tr = el('tr');
      const th = el('th', '', t(`cipher.${c}`));
      th.scope = 'row';
      tr.append(th);
      for (const b of model.buckets) {
        const e = model.evaluation[b.id];
        tr.append(el('td', 'num', `${percent(e.confusion[c][c], e.perClass)}%`));
      }
      tbody.append(tr);
    }
    table.replaceChildren(el('caption', '', t('help.accuracyCaption', { count: model.evaluation[model.buckets[0].id].perClass })), thead, tbody);
  }
}

export function setDetailsOpen(open) {
  $('detailsSection').classList.toggle('hidden', !open);
  const btn = $('toggleDetails');
  btn.setAttribute('aria-expanded', String(open));
  btn.textContent = open ? t('details.hide') : t('details.show');
}

export function clearResult() {
  $('mainResult').classList.add('hidden');
  document.querySelectorAll('.toggle-section').forEach((s) => s.classList.add('hidden'));
  setDetailsOpen(false);
  setStale(false);
  showInputMessages([], []);
}
