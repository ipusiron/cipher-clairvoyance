// 読み込みの最初にテーマを当てる（ちらつきを防ぐ）。通常スクリプト
// 保存した選択 → OS の設定（prefers-color-scheme。style.css 側で当たる）の順。Storage が使えなくても動く
(function () {
  var theme = null;
  try {
    theme = window.localStorage.getItem('cipher-clairvoyance-theme');
  } catch (e) {
    theme = null;
  }
  if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
})();
