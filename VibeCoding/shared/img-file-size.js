// shared/img-file-size.js

function checkImageFileSize(byteLength) {
  var bytes = Number(byteLength) || 0;
  var MB = 1024 * 1024;

  if (bytes <= 30 * MB) {
    return {
      ok: true,
      level: 'ok',
      message: '檔案大小正常'
    };
  } else if (bytes <= 80 * MB) {
    return {
      ok: true,
      level: 'warn',
      message: '檔案較大（' + (bytes / MB).toFixed(1) + 'MB），處理可能需要數秒'
    };
  } else {
    return {
      ok: false,
      level: 'reject',
      message: '檔案超過 80MB 上限（' + (bytes / MB).toFixed(1) + 'MB），已拒絕載入'
    };
  }
}

function checkBatchSize(totalByteLength, fileCount) {
  var bytes = Number(totalByteLength) || 0;
  var count = Number(fileCount) || 0;
  var MB = 1024 * 1024;

  if (bytes <= 200 * MB) {
    return {
      ok: true,
      level: 'ok',
      message: '批次大小正常（共 ' + count + ' 檔，' + (bytes / MB).toFixed(1) + 'MB）'
    };
  } else if (bytes <= 500 * MB) {
    return {
      ok: true,
      level: 'warn',
      message: '批次較大（共 ' + count + ' 檔，' + (bytes / MB).toFixed(1) + 'MB），批次處理可能需要較長時間'
    };
  } else {
    return {
      ok: false,
      level: 'reject',
      message: '批次總量超過 500MB 上限（' + (bytes / MB).toFixed(1) + 'MB），已拒絕整批載入'
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    checkImageFileSize: checkImageFileSize,
    checkBatchSize: checkBatchSize
  };
}
