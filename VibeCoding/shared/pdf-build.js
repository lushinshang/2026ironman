/**
 * VibeCoding/shared/pdf-build.js — Level 1d PDF 結構編輯與加解密模組
 * 依據 VibeCoding/shared/PDF_CONTRACT.md 實作
 * 封裝 @cantoo/pdf-lib (PDFLib) 與 fontkit
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var exports = factory();
    root.createPdfBuilder = exports.createPdfBuilder;
    root.mergePdfDocs = exports.mergePdfDocs;
    root.rotatePage = exports.rotatePage;
    root.deletePage = exports.deletePage;
    root.addPageNumbers = exports.addPageNumbers;
    root.addWatermarkText = exports.addWatermarkText;
    root.embedCjkFont = exports.embedCjkFont;
    root.encryptPdf = exports.encryptPdf;
    root.decryptPdf = exports.decryptPdf;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function getPdfLib() {
    if (typeof globalThis !== 'undefined' && globalThis.PDFLib) {
      return globalThis.PDFLib;
    }
    if (typeof window !== 'undefined' && window.PDFLib) {
      return window.PDFLib;
    }
    try {
      return require('./vendor/cantoo-pdf-lib.min.js');
    } catch (e) {
      try {
        return require('@cantoo/pdf-lib');
      } catch (err) {
        return null;
      }
    }
  }

  function getFontkit() {
    if (typeof globalThis !== 'undefined' && globalThis.fontkit) {
      return globalThis.fontkit;
    }
    if (typeof window !== 'undefined' && window.fontkit) {
      return window.fontkit;
    }
    try {
      return require('./vendor/fontkit.umd.min.js');
    } catch (e) {
      try {
        return require('@pdf-lib/fontkit');
      } catch (err) {
        return null;
      }
    }
  }

  /**
   * 建立空白 PDF 或載入多份來源 PDF 的 Builder
   * @param {Array<Uint8Array|ArrayBuffer>} [sourceBytesArray]
   * @returns {Promise<{ doc: PDFDocument, sourceDocs: Array<PDFDocument> }>}
   */
  function createPdfBuilder(sourceBytesArray) {
    var PDFLib = getPdfLib();
    if (!PDFLib) return Promise.reject(new Error('@cantoo/pdf-lib 尚未載入'));

    return new Promise(function (resolve, reject) {
      PDFLib.PDFDocument.create().then(function (newDoc) {
        var fk = getFontkit();
        if (fk) newDoc.registerFontkit(fk);

        if (!sourceBytesArray || sourceBytesArray.length === 0) {
          return resolve({ doc: newDoc, sourceDocs: [] });
        }

        var loadPromises = sourceBytesArray.map(function (bytes) {
          return PDFLib.PDFDocument.load(bytes);
        });

        Promise.all(loadPromises).then(function (loadedDocs) {
          resolve({ doc: newDoc, sourceDocs: loadedDocs });
        }).catch(reject);
      }).catch(reject);
    });
  }

  /**
   * 從多份來源 PDF 抽取指定頁組成新 PDF
   * @param {Array<PDFDocument|Uint8Array|ArrayBuffer>} sourceDocs
   * @param {Array<{ docIndex: number, pageIndex: number, rotation?: number }>} pageSelections
   * @returns {Promise<Uint8Array>}
   */
  function mergePdfDocs(sourceDocs, pageSelections) {
    var PDFLib = getPdfLib();
    if (!PDFLib) return Promise.reject(new Error('@cantoo/pdf-lib 尚未載入'));

    if (!sourceDocs || sourceDocs.length === 0) {
      return Promise.reject(new Error('未提供來源 PDF 文件'));
    }
    if (!pageSelections || pageSelections.length === 0) {
      return Promise.reject(new Error('未提供頁面選取清單'));
    }

    return new Promise(function (resolve, reject) {
      // Normalize source docs to PDFDocument instances
      var docPromises = sourceDocs.map(function (src) {
        if (src && typeof src.getPageCount === 'function') {
          return Promise.resolve(src);
        }
        return PDFLib.PDFDocument.load(src);
      });

      Promise.all(docPromises).then(function (loadedDocs) {
        PDFLib.PDFDocument.create().then(function (outDoc) {
          var fk = getFontkit();
          if (fk) outDoc.registerFontkit(fk);

          var copySequence = Promise.resolve();

          pageSelections.forEach(function (sel) {
            copySequence = copySequence.then(function () {
              var srcDoc = loadedDocs[sel.docIndex];
              if (!srcDoc) throw new Error('來源文檔索引超出範圍: ' + sel.docIndex);
              var totalP = srcDoc.getPageCount();
              if (sel.pageIndex < 0 || sel.pageIndex >= totalP) {
                throw new Error('頁碼索引超出範圍: ' + sel.pageIndex + ' (總頁數 ' + totalP + ')');
              }
              return outDoc.copyPages(srcDoc, [sel.pageIndex]).then(function (copiedPages) {
                var page = copiedPages[0];
                if (typeof sel.rotation === 'number' && sel.rotation !== 0) {
                  var curRot = page.getRotation().angle;
                  page.setRotation(PDFLib.degrees((curRot + sel.rotation) % 360));
                }
                outDoc.addPage(page);
              });
            });
          });

          copySequence.then(function () {
            return outDoc.save();
          }).then(function (pdfBytes) {
            resolve(pdfBytes);
          }).catch(reject);
        }).catch(reject);
      }).catch(reject);
    });
  }

  /**
   * 旋轉指定頁面
   * @param {PDFDocument} pdfDoc
   * @param {number} pageIndex (0-indexed)
   * @param {number} degrees (90 的倍數，正值順時針)
   */
  function rotatePage(pdfDoc, pageIndex, degrees) {
    var PDFLib = getPdfLib();
    if (!PDFLib) throw new Error('@cantoo/pdf-lib 尚未載入');

    var total = pdfDoc.getPageCount();
    if (pageIndex < 0 || pageIndex >= total) {
      throw new Error('頁碼超出範圍: ' + pageIndex + ' (總頁數: ' + total + ')');
    }
    var page = pdfDoc.getPage(pageIndex);
    var currentAngle = page.getRotation().angle;
    var newAngle = ((currentAngle + degrees) % 360 + 360) % 360;
    page.setRotation(PDFLib.degrees(newAngle));
  }

  /**
   * 刪除指定頁面
   * @param {PDFDocument} pdfDoc
   * @param {number} pageIndex (0-indexed)
   */
  function deletePage(pdfDoc, pageIndex) {
    var total = pdfDoc.getPageCount();
    if (pageIndex < 0 || pageIndex >= total) {
      throw new Error('頁碼超出範圍: ' + pageIndex + ' (總頁數: ' + total + ')');
    }
    pdfDoc.removePage(pageIndex);
  }

  /**
   * 為 PDF 添加頁碼
   * @param {PDFDocument} pdfDoc
   * @param {object} [opts]
   * @param {string} [opts.position='footer'] 'header' | 'footer'
   * @param {string} [opts.format='X/Y'] 'X' | 'X/Y'
   * @param {string} [opts.align='center'] 'left' | 'center' | 'right'
   * @param {Array<number>} [opts.pageRange] [startPage, endPage] (1-indexed)
   * @param {number} [opts.fontSize=10]
   * @returns {Promise<void>}
   */
  function addPageNumbers(pdfDoc, opts) {
    var PDFLib = getPdfLib();
    if (!PDFLib) return Promise.reject(new Error('@cantoo/pdf-lib 尚未載入'));

    opts = opts || {};
    var position = opts.position || 'footer';
    var format = opts.format || 'X/Y';
    var align = opts.align || 'center';
    var fontSize = opts.fontSize || 10;
    var totalPages = pdfDoc.getPageCount();

    var start = (opts.pageRange && opts.pageRange[0]) ? Math.max(1, opts.pageRange[0]) : 1;
    var end = (opts.pageRange && opts.pageRange[1]) ? Math.min(totalPages, opts.pageRange[1]) : totalPages;

    return pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica).then(function (font) {
      for (var p = start - 1; p < end; p++) {
        var page = pdfDoc.getPage(p);
        var pNum = p + 1;
        var text = (format === 'X/Y') ? (pNum + ' / ' + totalPages) : String(pNum);
        var textWidth = font.widthOfTextAtSize(text, fontSize);
        var textHeight = font.heightAtSize(fontSize);

        var size = page.getSize();
        var width = size.width;
        var height = size.height;

        var x = (width - textWidth) / 2;
        if (align === 'left') x = 30;
        else if (align === 'right') x = width - textWidth - 30;

        var y = 25;
        if (position === 'header') {
          y = height - 25 - textHeight;
        }

        page.drawText(text, {
          x: x,
          y: y,
          size: fontSize,
          font: font,
          color: PDFLib.rgb(0.2, 0.2, 0.2)
        });
      }
    });
  }

  /**
   * 嵌入 CJK 中文字型
   * @param {PDFDocument} pdfDoc
   * @param {Uint8Array|ArrayBuffer} fontBytes
   * @returns {Promise<PDFFont>}
   */
  function embedCjkFont(pdfDoc, fontBytes) {
    var fk = getFontkit();
    if (fk) pdfDoc.registerFontkit(fk);
    return pdfDoc.embedFont(fontBytes);
  }

  /**
   * 為 PDF 頁面繪製浮水印
   * @param {PDFDocument} pdfDoc
   * @param {string} text
   * @param {object} [opts]
   * @param {number} [opts.opacity=0.5]
   * @param {number} [opts.angle=45] (degrees)
   * @param {string} [opts.position='diagonal'] 'diagonal' | 'center' | 'top-left'
   * @param {PDFFont} [opts.font]
   * @param {number} [opts.fontSize=36]
   * @param {Array<number>} [opts.pageRange]
   * @returns {Promise<void>}
   */
  function addWatermarkText(pdfDoc, text, opts) {
    var PDFLib = getPdfLib();
    if (!PDFLib) return Promise.reject(new Error('@cantoo/pdf-lib 尚未載入'));

    opts = opts || {};
    var opacity = (typeof opts.opacity === 'number') ? opts.opacity : 0.5;
    var angle = (typeof opts.angle === 'number') ? opts.angle : 45;
    var position = opts.position || 'diagonal';
    var fontSize = opts.fontSize || 36;
    var totalPages = pdfDoc.getPageCount();

    var start = (opts.pageRange && opts.pageRange[0]) ? Math.max(1, opts.pageRange[0]) : 1;
    var end = (opts.pageRange && opts.pageRange[1]) ? Math.min(totalPages, opts.pageRange[1]) : totalPages;

    var fontPromise = opts.font ? Promise.resolve(opts.font) : pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

    return fontPromise.then(function (font) {
      for (var p = start - 1; p < end; p++) {
        var page = pdfDoc.getPage(p);
        var size = page.getSize();
        var width = size.width;
        var height = size.height;

        var textWidth = font.widthOfTextAtSize(text, fontSize);
        var textHeight = font.heightAtSize(fontSize);

        var x, y, rot;
        if (position === 'top-left') {
          x = 40;
          y = height - 60;
          rot = PDFLib.degrees(0);
        } else if (position === 'center') {
          x = (width - textWidth) / 2;
          y = (height - textHeight) / 2;
          rot = PDFLib.degrees(0);
        } else {
          // diagonal
          x = (width - textWidth) / 2;
          y = (height - textHeight) / 2;
          rot = PDFLib.degrees(angle);
        }

        page.drawText(text, {
          x: x,
          y: y,
          size: fontSize,
          font: font,
          color: PDFLib.rgb(0.8, 0.2, 0.2),
          opacity: opacity,
          rotate: rot
        });
      }
    });
  }

  /**
   * 對 PDF 設定密碼加密
   * @param {PDFDocument} pdfDoc
   * @param {object} opts
   * @param {string} opts.userPassword
   * @param {string} [opts.ownerPassword]
   * @param {object} [opts.permissions]
   */
  function encryptPdf(pdfDoc, opts) {
    if (!opts || !opts.userPassword) {
      throw new Error('未提供使用者密碼 (userPassword)');
    }
    if (typeof pdfDoc.encrypt !== 'function') {
      throw new Error('當前 PDFDocument 不支援 encrypt 功能（請確認使用 @cantoo/pdf-lib）');
    }
    pdfDoc.encrypt(opts);
  }

  /**
   * 解密 PDF 並載入為 PDFDocument
   * @param {Uint8Array|ArrayBuffer} bytes
   * @param {string} password
   * @returns {Promise<PDFDocument>}
   */
  function decryptPdf(bytes, password) {
    var PDFLib = getPdfLib();
    if (!PDFLib) return Promise.reject(new Error('@cantoo/pdf-lib 尚未載入'));

    return new Promise(function (resolve, reject) {
      PDFLib.PDFDocument.load(bytes, {
        password: password,
        ignoreEncryption: false
      }).then(function (doc) {
        var fk = getFontkit();
        if (fk) doc.registerFontkit(fk);
        resolve(doc);
      }).catch(function (err) {
        reject(new Error('密碼錯誤或解密失敗：' + (err && err.message ? err.message : err)));
      });
    });
  }

  return {
    createPdfBuilder: createPdfBuilder,
    mergePdfDocs: mergePdfDocs,
    rotatePage: rotatePage,
    deletePage: deletePage,
    addPageNumbers: addPageNumbers,
    addWatermarkText: addWatermarkText,
    embedCjkFont: embedCjkFont,
    encryptPdf: encryptPdf,
    decryptPdf: decryptPdf
  };
});
