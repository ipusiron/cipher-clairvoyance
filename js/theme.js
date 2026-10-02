// ライト／ダークの切り替え。選んだテーマは保存する（保存できない環境でも切り替えはできる）

import { t } from './messages.js';

export const THEME_KEY = 'cipher-clairvoyance-theme';

export function currentTheme() {
  const set = document.documentElement.getAttribute('data-theme');
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function refreshThemeButton(button) {
  const dark = currentTheme() === 'dark';
  button.textContent = dark ? '☀️' : '🌙';
  const label = t(dark ? 'theme.toLight' : 'theme.toDark');
  button.setAttribute('aria-label', label);
  button.title = label;
}

export function initThemeToggle(button) {
  refreshThemeButton(button);
  button.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch (e) {
      // 保存できなくても、このページを開いているあいだは切り替わる
    }
    refreshThemeButton(button);
  });
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => refreshThemeButton(button));
  }
}
