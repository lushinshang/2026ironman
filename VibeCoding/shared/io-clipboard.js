// shared/io-clipboard.js
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(function () {
      return true;
    }).catch(function () {
      return false;
    });
  }
  return new Promise(function (resolve) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(textarea);
    resolve(ok);
  });
}

function pasteImageFromClipboard() {
  if (!navigator.clipboard || !navigator.clipboard.read) {
    return Promise.resolve(null);
  }
  return navigator.clipboard.read().then(function (items) {
    if (!items || items.length === 0) return null;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item && item.types) {
        for (var t = 0; t < item.types.length; t++) {
          if (item.types[t].indexOf('image/') === 0) {
            return item.getType(item.types[t]);
          }
        }
      }
    }
    return null;
  }).catch(function () {
    return null;
  });
}

