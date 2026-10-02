// file:// で開いたとき、ブラウザーが ES modules を読み込めずツールが起動しなかったら、HTTP での開き方を案内する（通常スクリプト）
// （Chrome・Edge は file:// からのモジュールを止める。Firefox は読み込めるので、起動していれば案内は出さない）
// ツールが起動すると app.js が <html data-ready="true"> を付ける。load のときにそれがなければ起動に失敗している
window.addEventListener('load', function () {
  if (window.location.protocol !== 'file:') return;
  if (document.documentElement.getAttribute('data-ready') === 'true') return;
  var notice = document.getElementById('fileNotice');
  if (!notice) return;
  // 言語は ?lang=ja|en → 保存した選択 → ブラウザーの言語の順（i18n.js と同じ）。モジュールではないので、ここで決める
  var lang = new URLSearchParams(window.location.search).get('lang');
  if (lang !== 'ja' && lang !== 'en') {
    try {
      lang = window.localStorage.getItem('cipher-clairvoyance-lang');
    } catch (e) {
      lang = null;
    }
  }
  if (lang !== 'ja' && lang !== 'en') lang = /^ja\b/i.test(navigator.language || '') ? 'ja' : 'en';
  var parts = notice.querySelectorAll('[data-lang]');
  for (var i = 0; i < parts.length; i++) parts[i].hidden = parts[i].getAttribute('data-lang') !== lang;
  document.documentElement.lang = lang;
  notice.classList.remove('hidden');
});
