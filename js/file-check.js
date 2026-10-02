// file:// で開いたとき、ブラウザーが ES modules を読み込めずツールが起動しなかったら、HTTP での開き方を案内する（通常スクリプト）
// （Chrome・Edge は file:// からのモジュールを止める。Firefox は読み込めるので、起動していれば案内は出さない）
// ツールが起動すると app.js が <html data-ready="true"> を付ける。load のときにそれがなければ起動に失敗している
window.addEventListener('load', function () {
  if (window.location.protocol !== 'file:') return;
  if (document.documentElement.getAttribute('data-ready') === 'true') return;
  var notice = document.getElementById('fileNotice');
  if (notice) notice.classList.remove('hidden');
});
