/**
 * VibeCoding/shared/pdf-file-size.js — Level 1d PDF 檔案容量防禦閘門
 * 依據 VibeCoding/shared/PDF_CONTRACT.md 第 5 節實作
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var exports = factory();
    root.checkPdfFileSize = exports.checkPdfFileSize;
    root.checkPdfBatchSize = exports.checkPdfBatchSize;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SINGLE_WARN_BYTES = 30 * 1024 * 1024;    // 30MB
  var SINGLE_REJECT_BYTES = 100 * 1024 * 1024; // 100MB

  var BATCH_WARN_BYTES = 150 * 1024 * 1024;    // 150MB
  var BATCH_REJECT_BYTES = 400 * 1024 * 1024;  // 400MB

  /**
   * 檢查單一 PDF 檔案大小
   * @param {number} bytes
   * @returns {{ ok: boolean, level: 'pass'|'warn'|'reject', message: string }}
   */
  function checkPdfFileSize(bytes) {
    var size = Number(bytes);
    if (isNaN(size) || size < 0) {
      return { ok: false, level: 'reject', message: '無效的檔案大小' };
    }

    if (size > SINGLE_REJECT_BYTES) {
      return {
        ok: false,
        level: 'reject',
        message: '檔案大小 (' + (size / (1024 * 1024)).toFixed(1) + 'MB) 超過 100MB 上限，為防止瀏覽器崩潰已拒絕處理'
      };
    }

    if (size > SINGLE_WARN_BYTES) {
      return {
        ok: true,
        level: 'warn',
        message: '檔案較大 (' + (size / (1024 * 1024)).toFixed(1) + 'MB > 30MB)，載入與渲染可能需要較長時間'
      };
    }

    return {
      ok: true,
      level: 'pass',
      message: '檔案大小符合標準'
    };
  }

  /**
   * 檢查多個 PDF 批次總大小
   * @param {number} totalBytes
   * @param {number} [count=1]
   * @returns {{ ok: boolean, level: 'pass'|'warn'|'reject', message: string }}
   */
  function checkPdfBatchSize(totalBytes, count) {
    var size = Number(totalBytes);
    if (isNaN(size) || size < 0) {
      return { ok: false, level: 'reject', message: '無效的批次大小' };
    }

    if (size > BATCH_REJECT_BYTES) {
      return {
        ok: false,
        level: 'reject',
        message: '批次總量 (' + (size / (1024 * 1024)).toFixed(1) + 'MB) 超過 400MB 上限，已拒絕處理'
      };
    }

    if (size > BATCH_WARN_BYTES) {
      return {
        ok: true,
        level: 'warn',
        message: '批次總量較大 (' + (size / (1024 * 1024)).toFixed(1) + 'MB > 150MB)，處理時間可能較長'
      };
    }

    return {
      ok: true,
      level: 'pass',
      message: '批次總量符合標準'
    };
  }

  return {
    checkPdfFileSize: checkPdfFileSize,
    checkPdfBatchSize: checkPdfBatchSize
  };
});
