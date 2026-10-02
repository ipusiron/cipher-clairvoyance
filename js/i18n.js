// 画面の言語（日本語・英語）を決めて、index.html の静的な文言を差し替える
// 初期の言語＝?lang=ja|en → 保存した選択 → ブラウザーの言語（日本語以外は英語）の順。Storage が使えなくても動く
// data-i18n="キー" は textContent を、data-i18n-attr="属性:キー;属性:キー" は属性を差し替える

import { setLanguage, getLanguage, t, LANGUAGES } from './messages.js';

export const LANG_KEY = 'cipher-clairvoyance-lang';

export function detectLanguage(search, stored, navigatorLanguage) {
  const q = new URLSearchParams(search || '').get('lang');
  if (LANGUAGES.includes(q)) return q;
  if (LANGUAGES.includes(stored)) return stored;
  return /^ja\b/i.test(navigatorLanguage || '') ? 'ja' : 'en';
}

function readStored() {
  try {
    return window.localStorage.getItem(LANG_KEY);
  } catch (e) {
    return null;
  }
}

export function initialLanguage() {
  return detectLanguage(window.location.search, readStored(), navigator.language);
}

export function saveLanguage(lang) {
  try {
    window.localStorage.setItem(LANG_KEY, lang);
  } catch (e) {
    // 保存できなくても、このページを開いているあいだは切り替わる
  }
}

export function applyStaticText(root = document) {
  for (const node of root.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
  for (const node of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of node.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':');
      if (attr && key) node.setAttribute(attr.trim(), t(key.trim()));
    }
  }
  document.documentElement.lang = getLanguage();
  document.title = t('ui.title');
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', t('ui.metaDescription'));
}

export function useLanguage(lang) {
  setLanguage(lang);
  applyStaticText();
  return getLanguage();
}
