// shared/io-zip.js
// Requires the fflate UMD asset to be bundled before this module.
if (typeof fflate === 'undefined' || !fflate ||
    typeof fflate.strToU8 !== 'function' || typeof fflate.zipSync !== 'function' ||
    typeof fflate.unzipSync !== 'function' || typeof fflate.strFromU8 !== 'function') {
  throw new Error('io-zip.js requires the fflate asset to be loaded first.');
}

function _ioZipDedupeName(name, usedNames) {
  if (!usedNames[name]) {
    usedNames[name] = 1;
    return name;
  }
  var dotIndex = name.lastIndexOf('.');
  var base = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  var ext = dotIndex > 0 ? name.slice(dotIndex) : '';
  var candidate;
  do {
    candidate = base + '_' + usedNames[name] + ext;
    usedNames[name] += 1;
  } while (usedNames[candidate]);
  usedNames[candidate] = 1;
  return candidate;
}

function createZipBlob(files) {
  var entries = {};
  var usedNames = {};

  files.forEach(function (file) {
    var name = _ioZipDedupeName(file.name, usedNames);
    if (file.bytes instanceof Uint8Array) {
      entries[name] = file.bytes;
    } else if (typeof file.text === 'string') {
      entries[name] = fflate.strToU8(file.text);
    } else if (file.bytes && file.bytes.buffer instanceof ArrayBuffer) {
      entries[name] = new Uint8Array(file.bytes.buffer, file.bytes.byteOffset, file.bytes.byteLength);
    } else {
      throw new Error('createZipBlob entry must provide either bytes (Uint8Array) or text (string)');
    }
  });

  return new Blob([fflate.zipSync(entries)], { type: 'application/zip' });
}

// 解開一個 zip（DOCX/PPTX/XLSX 都是 zip 容器）。
// bytesOrArrayBuffer: Uint8Array | ArrayBuffer
// → Object<string, Uint8Array>（entry 路徑 → 內容 bytes，例如 "docProps/core.xml"）
// 非 zip 格式（例如加密 Office 檔的 CFB/OLE 容器）會讓 fflate.unzipSync 直接丟出例外，
// 呼叫端要自己 try/catch，不能把「解不開」誤判成「沒有內容」。
function unzipToEntries(bytesOrArrayBuffer) {
  var bytes = (bytesOrArrayBuffer instanceof Uint8Array)
    ? bytesOrArrayBuffer
    : new Uint8Array(bytesOrArrayBuffer);
  return fflate.unzipSync(bytes);
}

// 把 unzipToEntries() 拿到的某個 entry（Uint8Array）解成 UTF-8 字串，
// 給 DOMParser 解析 docProps/*.xml 這類文字內容用。
function zipEntryToText(bytes) {
  return fflate.strFromU8(bytes);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createZipBlob: createZipBlob,
    unzipToEntries: unzipToEntries,
    zipEntryToText: zipEntryToText
  };
}

