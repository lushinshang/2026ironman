// shared/csv-decode.js
// CSV 位元組解碼與檔案大小閘門。所有門檻都以原始 File.size 的位元組計算。

function decodeCsvBytes(arrayBuffer) {
  var bytes = new Uint8Array(arrayBuffer);
  var hasUtf8Bom = bytes.length >= 3 &&
    bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;

  if (hasUtf8Bom) {
    return {
      text: new TextDecoder('utf-8').decode(arrayBuffer),
      encoding: 'utf-8',
      hadBom: true,
      confidence: 'bom'
    };
  }

  try {
    return {
      text: new TextDecoder('utf-8', { fatal: true }).decode(arrayBuffer),
      encoding: 'utf-8',
      hadBom: false,
      confidence: 'strict'
    };
  } catch (err) {
    return {
      text: new TextDecoder('big5').decode(arrayBuffer),
      encoding: 'big5',
      hadBom: false,
      confidence: 'fallback'
    };
  }
}

function checkCsvFileSize(byteLength) {
  // 1 MB = 1,048,576 bytes. 5 MB and 20 MB are accepted; only >20 MB rejects.
  var megabyte = 1024 * 1024;

  if (byteLength < 5 * megabyte) {
    return { ok: true, level: 'ok', message: '' };
  }
  if (byteLength <= 20 * megabyte) {
    return {
      ok: true,
      level: 'warn',
      message: '檔案較大，處理可能需要數秒。'
    };
  }
  return {
    ok: false,
    level: 'reject',
    message: '檔案超過 20 MB 上限，請縮小檔案後再試。'
  };
}
