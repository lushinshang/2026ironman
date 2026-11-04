// shared/io-dropzone.js
function ioDropzoneHandleFile(file, onData, opts) {
  opts = opts || {};
  // 預設只收 .txt / .md（契約第 3 節）。不要改成 [] ——那會變成靜默全收。
  var accept = opts.accept || ['.txt', '.md'];
  var onError = opts.onError || function () {};

  function isAccepted(fileName) {
    if (accept.length === 0) return true;
    var lower = fileName.toLowerCase();
    for (var i = 0; i < accept.length; i++) {
      if (lower.indexOf(accept[i].toLowerCase(), lower.length - accept[i].length) !== -1) {
        return true;
      }
    }
    return false;
  }

  if (!isAccepted(file.name)) {
    onError('不支援的檔案類型：' + file.name);
    return;
  }

  if (opts.gate) {
    var gateResult = opts.gate(file);
    if (!gateResult.ok) {
      onError(gateResult.message);
      return;
    }
  }

  var reader = new FileReader();
  reader.onload = function () {
    onData(reader.result, file.name);
  };
  reader.onerror = function () {
    onError('讀取檔案失敗：' + file.name);
  };
  if (opts.mode === 'bytes') {
    reader.readAsArrayBuffer(file);
  } else {
    reader.readAsText(file);
  }
}

function setupDropZone(dropEl, onData, opts) {
  opts = opts || {};

  dropEl.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropEl.classList.add('dragover');
  });

  dropEl.addEventListener('dragleave', function () {
    dropEl.classList.remove('dragover');
  });

  dropEl.addEventListener('drop', function (e) {
    e.preventDefault();
    dropEl.classList.remove('dragover');
    var files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    if (opts.multiple === true) {
      if (opts.gateBatch) {
        var batchResult = opts.gateBatch(files);
        if (!batchResult.ok) {
          (opts.onError || function () {})(batchResult.message);
          return;
        }
      }
      var total = files.length;
      for (var i = 0; i < total; i++) {
        (function (idx) {
          var meta = { index: idx, total: total };
          var wrappedOnData = function (result, fileName) {
            onData(result, fileName, meta);
          };
          ioDropzoneHandleFile(files[idx], wrappedOnData, opts);
        })(i);
      }
    } else {
      ioDropzoneHandleFile(files[0], onData, opts);
    }
  });
}

function setupFilePicker(inputEl, onData, opts) {
  opts = opts || {};

  inputEl.addEventListener('change', function () {
    var files = inputEl.files;
    if (!files || files.length === 0) return;

    if (opts.multiple === true) {
      if (opts.gateBatch) {
        var batchResult = opts.gateBatch(files);
        if (!batchResult.ok) {
          (opts.onError || function () {})(batchResult.message);
          return;
        }
      }
      var total = files.length;
      for (var i = 0; i < total; i++) {
        (function (idx) {
          var meta = { index: idx, total: total };
          var wrappedOnData = function (result, fileName) {
            onData(result, fileName, meta);
          };
          ioDropzoneHandleFile(files[idx], wrappedOnData, opts);
        })(i);
      }
    } else {
      ioDropzoneHandleFile(files[0], onData, opts);
    }
  });
}

