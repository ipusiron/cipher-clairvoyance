// メインアプリケーション（イベントの登録と、モーダル・解析の流れ）

import { analyze, inspectInput } from './analysis.js';
import { renderResult, showInputMessages, updateInputCount, setStale, setDetailsOpen, clearResult, renderHelpExtras } from './ui.js';
import { CIPHER_SAMPLES } from './samples.js';
import { HELP_CONTENT } from './help-content.js';
import { t, getLanguage } from './messages.js';
import { initThemeToggle, refreshThemeButton } from './theme.js';
import { initialLanguage, useLanguage, saveLanguage } from './i18n.js';

const $ = (id) => document.getElementById(id);
let analyzedText = null;
let lastOpener = null;
let lastResult = null;
let lastInput = { errors: [], notes: [] };

// ボタンの有効・無効（空なら解析もクリアもできない）
function updateButtonStates() {
  const hasText = $('cipherText').value.trim().length > 0;
  $('btnAnalyze').disabled = !hasText;
  $('btnClear').disabled = !hasText;
}

function onInput() {
  const text = $('cipherText').value;
  updateButtonStates();
  updateInputCount(text);
  // 入力中は「解析できない理由」だけを消し、お知らせは解析のときに出す
  lastInput = { errors: [], notes: [] };
  showInputMessages([], []);
  if (analyzedText !== null) setStale(text !== analyzedText);
}

function announce(result) {
  $('srStatus').textContent = result.method === 'model'
    ? t('status.result', { name: t(`cipher.${result.winner}`), percent: Math.round((result.measured.correct / result.measured.predicted) * 100) })
    : t('status.rule', { name: t(`cipher.${result.variant}`) });
}

// 解析（ボタンと Ctrl＋Enter は同じ関数を通る）
function performAnalysis() {
  const text = $('cipherText').value;
  const input = inspectInput(text);
  lastInput = { errors: input.errors, notes: input.notes };
  showInputMessages(input.errors, input.notes);
  if (input.errors.length) return;
  const result = analyze(text);
  renderResult(result);
  analyzedText = text;
  lastResult = result;
  // 読み上げ用に、結果の要点を1文で知らせる
  announce(result);
}

function renderHelp() {
  const help = $('helpModal').querySelector('.help-content');
  help.innerHTML = HELP_CONTENT[getLanguage()];
  renderHelpExtras(help);
}

// 言語を切り替えたら、静的な文言・サンプル一覧・入力欄の下・結果・ヘルプを今の言語で描き直す
function applyLanguage(lang) {
  useLanguage(lang);
  initializeSampleList();
  updateInputCount($('cipherText').value);
  showInputMessages(lastInput.errors, lastInput.notes);
  refreshThemeButton($('btnTheme'));
  const detailsOpen = $('toggleDetails').getAttribute('aria-expanded') === 'true';
  if (lastResult) {
    renderResult(lastResult);
    announce(lastResult);
    setStale($('cipherText').value !== analyzedText);
  }
  setDetailsOpen(detailsOpen);
  if (!$('helpModal').classList.contains('hidden')) renderHelp();
}

// モーダル: 開いたら中へフォーカスを移し、Tab を中に閉じ込め、閉じたら開いたボタンへ戻す
function focusables(modal) {
  return [...modal.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')].filter((n) => !n.disabled && n.offsetParent !== null);
}

function openModal(modal, opener) {
  lastOpener = opener;
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  const first = focusables(modal)[0];
  if (first) first.focus();
}

function closeModal(modal) {
  modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
  if (lastOpener) lastOpener.focus();
  lastOpener = null;
}

function openModalElement() {
  return ['sampleModal', 'helpModal'].map($).find((m) => !m.classList.contains('hidden')) || null;
}

function trapTab(e) {
  const modal = openModalElement();
  if (!modal || e.key !== 'Tab') return;
  const list = focusables(modal);
  if (!list.length) return;
  const first = list[0];
  const last = list[list.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function paramText(sample) {
  const entries = Object.entries(sample.params);
  if (!entries.length) return t('sample.param.none');
  return entries.map(([k, v]) => t(`sample.param.${k}`, { value: v })).join(t('sample.param.sep'));
}

// サンプルの一覧（名前のボタンで読み込み、鍵は「鍵を見る」で表示を切り替える）
function initializeSampleList() {
  const list = $('sampleList');
  list.replaceChildren();
  for (const sample of CIPHER_SAMPLES) {
    const li = document.createElement('li');
    li.className = 'sample-item';
    const load = document.createElement('button');
    load.type = 'button';
    load.className = 'sample-load';
    const name = document.createElement('span');
    name.className = 'sample-name';
    name.textContent = t(`sample.name.${sample.id}`);
    const desc = document.createElement('span');
    desc.className = 'sample-desc';
    desc.textContent = t(`sample.desc.${sample.id}`, { expect: sample.expect ? t(`cipher.${sample.expect}`) : '' });
    load.append(name, desc);
    load.addEventListener('click', () => {
      $('cipherText').value = sample.ciphertext;
      closeModal($('sampleModal'));
      $('cipherText').focus();
      onInput();
    });
    const keyRow = document.createElement('div');
    keyRow.className = 'sample-key-row';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'btn small sample-key-toggle';
    toggle.textContent = t('sample.showKey');
    toggle.setAttribute('aria-pressed', 'false');
    const value = document.createElement('span');
    value.className = 'sample-key-value';
    value.textContent = paramText(sample);
    value.hidden = true;
    toggle.addEventListener('click', () => {
      const show = value.hidden;
      value.hidden = !show;
      toggle.setAttribute('aria-pressed', String(show));
      toggle.textContent = show ? t('sample.hideKey') : t('sample.showKey');
    });
    keyRow.append(toggle, value);
    li.append(load, keyRow);
    list.append(li);
  }
}

function init() {
  const textarea = $('cipherText');
  textarea.addEventListener('input', onInput);
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !$('btnAnalyze').disabled) {
      e.preventDefault();
      performAnalysis();
    }
  });
  $('btnAnalyze').addEventListener('click', performAnalysis);
  $('btnClear').addEventListener('click', () => {
    textarea.value = '';
    analyzedText = null;
    lastResult = null;
    clearResult();
    onInput();
    textarea.focus();
  });
  $('toggleDetails').addEventListener('click', () => {
    setDetailsOpen($('toggleDetails').getAttribute('aria-expanded') !== 'true');
  });

  applyLanguage(initialLanguage());
  $('btnLang').addEventListener('click', () => {
    const next = getLanguage() === 'ja' ? 'en' : 'ja';
    saveLanguage(next);
    applyLanguage(next);
  });
  $('btnSampleSelect').addEventListener('click', (e) => openModal($('sampleModal'), e.currentTarget));
  $('modalClose').addEventListener('click', () => closeModal($('sampleModal')));
  $('btnHelp').addEventListener('click', (e) => {
    renderHelp();
    openModal($('helpModal'), e.currentTarget);
  });
  $('helpModalClose').addEventListener('click', () => closeModal($('helpModal')));
  for (const id of ['sampleModal', 'helpModal']) {
    $(id).addEventListener('click', (e) => { if (e.target === $(id)) closeModal($(id)); });
  }
  document.addEventListener('keydown', (e) => {
    const modal = openModalElement();
    if (modal && e.key === 'Escape') { e.preventDefault(); closeModal(modal); }
    trapTab(e);
  });

  initThemeToggle($('btnTheme'));
  updateButtonStates();
  updateInputCount(textarea.value);
  document.documentElement.setAttribute('data-ready', 'true');
}

document.addEventListener('DOMContentLoaded', init);
