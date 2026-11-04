/**
 * VibeCoding/shared/pdf-decode.js — Level 1d PDF 解碼與渲染模組
 * 依據 VibeCoding/shared/PDF_CONTRACT.md 實作
 * 封裝 Mozilla pdf.js (pdfjsLib)
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var exports = factory();
    root.loadPdfFile = exports.loadPdfFile;
    root.getPageCount = exports.getPageCount;
    root.renderPageToCanvas = exports.renderPageToCanvas;
    root.extractPageText = exports.extractPageText;
    root.extractAllText = exports.extractAllText;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function getPdfJs() {
    if (typeof globalThis !== 'undefined' && globalThis.pdfjsLib) {
      return globalThis.pdfjsLib;
    }
    if (typeof window !== 'undefined' && window.pdfjsLib) {
      return window.pdfjsLib;
    }
    try {
      return require('pdfjs-dist/legacy/build/pdf.js');
    } catch (e) {
      try {
        return require('pdfjs-dist');
      } catch (err) {
        return null;
      }
    }
  }

  var workerBlobUrl = null;
  var workerPortInstance = null;
  function getInlinedWorkerSource() {
    // bundle.py 以 escape_mode: "json_string" 把 shared/vendor/pdf.worker.min.js
    // 內嵌成全域字串變數 `pdfjs_worker`（見各 Day19-25 的 bundle.json ASSET 定義）。
    // 這裡讀出該字串，供轉成 Blob URL 用；未經 bundle 的開發環境不存在此變數。
    if (typeof globalThis !== 'undefined' && typeof globalThis.pdfjs_worker === 'string') {
      return globalThis.pdfjs_worker;
    }
    if (typeof window !== 'undefined' && typeof window.pdfjs_worker === 'string') {
      return window.pdfjs_worker;
    }
    return null;
  }

  function ensureWorkerConfigured(pdfjs) {
    if (!pdfjs || !pdfjs.GlobalWorkerOptions) return;
    if (pdfjs.GlobalWorkerOptions.workerPort || pdfjs.GlobalWorkerOptions.workerSrc) return;

    if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined' &&
        typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      var workerSource = getInlinedWorkerSource();
      if (workerSource) {
        if (!workerBlobUrl) {
          var blob = new Blob([workerSource], { type: 'application/javascript' });
          workerBlobUrl = URL.createObjectURL(blob);
        }
        // 不能只設定 workerSrc：pdf.js 的 PDFWorker._initialize() 會先跑
        // isSameOrigin(window.location.href, workerSrc)，在 file:// 下頁面本身
        // 是 opaque origin（origin === "null"），一律判定為「非同源」，改用
        // importScripts() wrapper 包一層再開 Worker——這層 wrapper 在 file://
        // 下會直接觸發 Worker 的 error 事件並提早終止，最終還是掉回「fake worker」
        // （主執行緒同步解析），完全沒用到我們準備好的 Blob URL。
        // 直接自己 new Worker(blobUrl) 拿到 port，指定給 workerPort——
        // pdf.js 的 getDocument() 偵測到 workerPort 存在時會走 PDFWorker.fromPort()，
        // 完全跳過 isSameOrigin/CDN wrapper 那段邏輯，真正用 Blob URL 建立的 Worker。
        try {
          if (!workerPortInstance) {
            workerPortInstance = new Worker(workerBlobUrl);
          }
          pdfjs.GlobalWorkerOptions.workerPort = workerPortInstance;
          return;
        } catch (e) {
          // new Worker() 失敗（極少見），繼續往下走相對路徑 fallback
        }
      }
    }

    // Fallback：內嵌的 worker 原始碼字串不可得（例如未經 bundle.py 處理的開發環境），
    // 退回相對路徑，仰賴呼叫端自行提供 pdf.worker.min.js。
    pdfjs.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
  }

  /**
   * 載入 PDF 檔案（不修改原始 File / ArrayBuffer）
   * @param {File|Blob|ArrayBuffer|Uint8Array} file
   * @returns {Promise<PDFDocumentProxy>}
   */
  function loadPdfFile(file) {
    var pdfjs = getPdfJs();
    if (!pdfjs) {
      return Promise.reject(new Error('pdf.js (pdfjsLib) 尚未載入'));
    }
    ensureWorkerConfigured(pdfjs);

    return new Promise(function (resolve, reject) {
      if (!file) {
        return reject(new Error('未提供 PDF 檔案'));
      }

      function processBuffer(buffer) {
        // Clone array buffer to guarantee source immutability
        var copy;
        if (buffer instanceof ArrayBuffer) {
          copy = buffer.slice(0);
        } else if (buffer.buffer instanceof ArrayBuffer) {
          copy = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        } else {
          return reject(new Error('不支援的檔案格式'));
        }

        // Validate PDF magic bytes (%PDF-)
        var uint8 = new Uint8Array(copy);
        if (uint8.length < 5 ||
            uint8[0] !== 0x25 || uint8[1] !== 0x50 ||
            uint8[2] !== 0x44 || uint8[3] !== 0x46 || uint8[4] !== 0x2D) {
          return reject(new Error('無效的 PDF 檔案（檔頭未包含 %PDF- 標記）'));
        }

        var loadingTask = pdfjs.getDocument({
          data: uint8,
          cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
          cMapPacked: true
        });

        loadingTask.promise.then(function (pdfDoc) {
          resolve(pdfDoc);
        }).catch(function (err) {
          reject(new Error('PDF 解析失敗：' + (err && err.message ? err.message : err)));
        });
      }

      if (file instanceof ArrayBuffer || (file && file.buffer instanceof ArrayBuffer)) {
        processBuffer(file);
      } else if (typeof Blob !== 'undefined' && file instanceof Blob) {
        if (typeof file.arrayBuffer === 'function') {
          file.arrayBuffer().then(processBuffer).catch(reject);
        } else {
          var reader = new FileReader();
          reader.onload = function () { processBuffer(reader.result); };
          reader.onerror = function () { reject(new Error('讀取檔案失敗')); };
          reader.readAsArrayBuffer(file);
        }
      } else {
        reject(new Error('不支援的檔案輸入型態'));
      }
    });
  }

  /**
   * 取得 PDF 總頁數
   * @param {PDFDocumentProxy} pdfDoc
   * @returns {number}
   */
  function getPageCount(pdfDoc) {
    if (!pdfDoc || typeof pdfDoc.numPages !== 'number') {
      throw new Error('無效的 PDFDocument 物件');
    }
    return pdfDoc.numPages;
  }

  /**
   * 渲染指定頁面至 Canvas
   * @param {PDFDocumentProxy} pdfDoc
   * @param {number} pageNumber 頁碼 (1-indexed, 1 <= pageNumber <= totalPages)
   * @param {object} [opts]
   * @param {number} [opts.scale=1.5] 縮放倍率
   * @returns {Promise<{ canvas: HTMLCanvasElement, width: number, height: number }>}
   */
  function renderPageToCanvas(pdfDoc, pageNumber, opts) {
    return new Promise(function (resolve, reject) {
      if (!pdfDoc || typeof pdfDoc.getPage !== 'function') {
        return reject(new Error('無效的 PDFDocument 物件'));
      }
      var total = getPageCount(pdfDoc);
      var pageNum = Number(pageNumber);
      if (isNaN(pageNum) || pageNum < 1 || pageNum > total) {
        return reject(new Error('頁碼超出範圍 (請求頁碼: ' + pageNumber + ', 總頁數: ' + total + ')'));
      }

      var scale = (opts && typeof opts.scale === 'number' && opts.scale > 0) ? opts.scale : 1.5;

      pdfDoc.getPage(pageNum).then(function (page) {
        var viewport = page.getViewport({ scale: scale });
        var canvas;
        if (typeof document !== 'undefined' && document.createElement) {
          canvas = document.createElement('canvas');
        } else {
          // Node fallback
          return reject(new Error('DOM Canvas 環境不存在，渲染請於瀏覽器執行'));
        }

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        var ctx = canvas.getContext('2d');

        var renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };

        page.render(renderContext).promise.then(function () {
          resolve({
            canvas: canvas,
            width: canvas.width,
            height: canvas.height
          });
        }).catch(function (err) {
          reject(new Error('頁面渲染失敗：' + (err && err.message ? err.message : err)));
        });
      }).catch(reject);
    });
  }

  /**
   * 擷取指定頁面的純文字內容
   * @param {PDFDocumentProxy} pdfDoc
   * @param {number} pageNumber 頁碼 (1-indexed)
   * @returns {Promise<string>}
   */
  function extractPageText(pdfDoc, pageNumber) {
    return new Promise(function (resolve, reject) {
      if (!pdfDoc || typeof pdfDoc.getPage !== 'function') {
        return reject(new Error('無效的 PDFDocument 物件'));
      }
      var total = getPageCount(pdfDoc);
      var pageNum = Number(pageNumber);
      if (isNaN(pageNum) || pageNum < 1 || pageNum > total) {
        return reject(new Error('頁碼超出範圍 (請求頁碼: ' + pageNumber + ', 總頁數: ' + total + ')'));
      }

      pdfDoc.getPage(pageNum).then(function (page) {
        page.getTextContent().then(function (textContent) {
          if (!textContent || !textContent.items || textContent.items.length === 0) {
            return resolve('');
          }
          var lastY = null;
          var lines = [];
          var currentLine = [];

          textContent.items.forEach(function (item) {
            if (!item || typeof item.str !== 'string') return;
            var y = (item.transform && item.transform.length >= 6) ? item.transform[5] : null;
            if (lastY !== null && y !== null && Math.abs(y - lastY) > 5) {
              lines.push(currentLine.join(' '));
              currentLine = [];
            }
            currentLine.push(item.str);
            if (item.hasEOL) {
              lines.push(currentLine.join(' '));
              currentLine = [];
              lastY = null;
            } else {
              lastY = y;
            }
          });
          if (currentLine.length > 0) {
            lines.push(currentLine.join(' '));
          }
          resolve(lines.join('\n').trim());
        }).catch(reject);
      }).catch(reject);
    });
  }

  /**
   * 擷取 PDF 所有頁面文字
   * @param {PDFDocumentProxy} pdfDoc
   * @returns {Promise<Array<{ pageIndex: number, text: string }>>}
   */
  function extractAllText(pdfDoc) {
    var total = getPageCount(pdfDoc);
    var promises = [];
    for (var i = 1; i <= total; i++) {
      (function (pNum) {
        promises.push(
          extractPageText(pdfDoc, pNum).then(function (txt) {
            return { pageIndex: pNum, text: txt };
          })
        );
      })(i);
    }
    return Promise.all(promises);
  }

  return {
    loadPdfFile: loadPdfFile,
    getPageCount: getPageCount,
    renderPageToCanvas: renderPageToCanvas,
    extractPageText: extractPageText,
    extractAllText: extractAllText
  };
});
