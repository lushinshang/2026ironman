// shared/io-download.js
function downloadFile(filename, content, mime) {
  if (mime === undefined) mime = 'text/plain;charset=utf-8';
  var blob = new Blob([content], { type: mime });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 0);
}
