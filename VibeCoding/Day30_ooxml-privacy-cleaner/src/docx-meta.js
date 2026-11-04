// Day30_ooxml-privacy-cleaner/src/docx-meta.js
//
// DOCX（OOXML）docProps 讀取與清除。只服務 Day30 這一題，不進 shared/——比照
// shared/PDF_CONTRACT.md 對 Day25 的裁定：只有一題用到的邏輯先留在題目自己的
// src/index.html（bundle 時會被內嵌進同一個 <script>），第三題（PPTX）重複時
// 才抽共用模組。
//
// 依賴 shared/io-zip.js 的 unzipToEntries()/zipEntryToText()，以及瀏覽器原生的
// DOMParser／XMLSerializer／TextEncoder（不是外部函式庫，是瀏覽器內建 API）。

var DOCX_NS = {
  cp: 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
  dc: 'http://purl.org/dc/elements/1.1/',
  dcterms: 'http://purl.org/dc/terms/',
  extProps: 'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties',
  vt: 'http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes',
  relsPkg: 'http://schemas.openxmlformats.org/package/2006/relationships',
  w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
};

function _docxFirstText(doc, ns, localName) {
  var els = doc.getElementsByTagNameNS(ns, localName);
  if (!els.length) return null;
  var text = els[0].textContent;
  return (text && text.length) ? text : null;
}

// 讀取 docProps/core.xml，回傳關鍵欄位；找不到檔案或欄位是空的都回傳 null，不拋錯誤
// （跟 shared/img-exif.js 的 readExifTags() 同一個容錯精神）。
function readDocxCoreProps(entries) {
  var result = {
    creator: null, lastModifiedBy: null, description: null,
    title: null, subject: null, keywords: null, category: null,
    created: null, modified: null
  };
  var bytes = entries['docProps/core.xml'];
  if (!bytes) return result;

  var doc = new DOMParser().parseFromString(zipEntryToText(bytes), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return result;

  result.creator = _docxFirstText(doc, DOCX_NS.dc, 'creator');
  result.lastModifiedBy = _docxFirstText(doc, DOCX_NS.cp, 'lastModifiedBy');
  result.description = _docxFirstText(doc, DOCX_NS.dc, 'description');
  result.title = _docxFirstText(doc, DOCX_NS.dc, 'title');
  result.subject = _docxFirstText(doc, DOCX_NS.dc, 'subject');
  result.keywords = _docxFirstText(doc, DOCX_NS.cp, 'keywords');
  result.category = _docxFirstText(doc, DOCX_NS.cp, 'category');
  result.created = _docxFirstText(doc, DOCX_NS.dcterms, 'created');
  result.modified = _docxFirstText(doc, DOCX_NS.dcterms, 'modified');
  return result;
}

// 讀取 docProps/app.xml，回傳 Company／TotalTime／TitlesOfParts（後者會列出
// 包含隱藏投影片/工作表在內的所有標題，DOCX 目前多半是章節標題，風險較低但
// 仍一併回傳供 UI 判斷是否要提示）。
function readDocxAppProps(entries) {
  var result = { company: null, totalTime: null, manager: null, template: null, hyperlinkBase: null, titlesOfParts: [] };
  var bytes = entries['docProps/app.xml'];
  if (!bytes) return result;

  var doc = new DOMParser().parseFromString(zipEntryToText(bytes), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return result;

  result.company = _docxFirstText(doc, DOCX_NS.extProps, 'Company');
  result.totalTime = _docxFirstText(doc, DOCX_NS.extProps, 'TotalTime');
  result.manager = _docxFirstText(doc, DOCX_NS.extProps, 'Manager');
  result.template = _docxFirstText(doc, DOCX_NS.extProps, 'Template');
  result.hyperlinkBase = _docxFirstText(doc, DOCX_NS.extProps, 'HyperlinkBase');

  var titlesEl = doc.getElementsByTagNameNS(DOCX_NS.extProps, 'TitlesOfParts')[0];
  if (titlesEl) {
    var vectorEl = titlesEl.getElementsByTagNameNS(DOCX_NS.vt, 'vector')[0];
    if (vectorEl) {
      var lpstrEls = vectorEl.getElementsByTagNameNS(DOCX_NS.vt, 'lpstr');
      for (var i = 0; i < lpstrEls.length; i++) {
        if (lpstrEls[i].textContent) result.titlesOfParts.push(lpstrEls[i].textContent);
      }
    }
  }
  return result;
}

function hasCustomProps(entries) {
  return !!entries['docProps/custom.xml'];
}

function hasThumbnail(entries) {
  // OPC 規格沒規定縮圖檔名一定叫 thumbnail.jpeg，但 Word／python-docx／LibreOffice
  // 目前實測都是這個路徑；用 _rels/.rels 的 relationship type 判斷比較穩，見
  // _findThumbnailPath()。
  return !!_findThumbnailPath(entries);
}

// 透過 _rels/.rels 裡 Type 含 "thumbnail" 的 Relationship 找出縮圖實際路徑，
// 不寫死檔名——縮圖的 Target 是相對路徑（例如 "docProps/thumbnail.jpeg"）。
function _findThumbnailPath(entries) {
  var relsBytes = entries['_rels/.rels'];
  if (!relsBytes) return null;
  var doc = new DOMParser().parseFromString(zipEntryToText(relsBytes), 'application/xml');
  var rels = doc.getElementsByTagNameNS(DOCX_NS.relsPkg, 'Relationship');
  for (var i = 0; i < rels.length; i++) {
    var type = rels[i].getAttribute('Type') || '';
    if (type.indexOf('thumbnail') !== -1) {
      var target = rels[i].getAttribute('Target') || '';
      return target.replace(/^\/+/, ''); // 去掉可能的開頭斜線，統一成 zip entry 路徑格式
    }
  }
  return null;
}

// 清空 docProps/core.xml 裡的敏感欄位文字內容（保留 XML 結構本身，不整段刪除——
// Word 開啟時仍預期這個 part 存在，跟 JPEG APP1 segment 可以整段拿掉不是同一種情況）。
// created/modified 時間戳不清（單純時間不算個資，跟作者/公司/描述性質不同），
// 若之後有需求再議。
function cleanDocxCoreProps(entries) {
  var bytes = entries['docProps/core.xml'];
  if (!bytes) return entries;

  var doc = new DOMParser().parseFromString(zipEntryToText(bytes), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return entries;

  var clearTargets = [
    [DOCX_NS.dc, 'creator'],
    [DOCX_NS.cp, 'lastModifiedBy'],
    [DOCX_NS.dc, 'description'],
    [DOCX_NS.dc, 'title'],
    [DOCX_NS.dc, 'subject'],
    [DOCX_NS.cp, 'keywords'],
    [DOCX_NS.cp, 'category']
  ];
  clearTargets.forEach(function (pair) {
    var els = doc.getElementsByTagNameNS(pair[0], pair[1]);
    for (var i = 0; i < els.length; i++) els[i].textContent = '';
  });

  var next = Object.assign({}, entries);
  next['docProps/core.xml'] = new TextEncoder().encode(new XMLSerializer().serializeToString(doc));
  return next;
}

// 清空 docProps/app.xml 的 Company／TotalTime／TitlesOfParts。
function cleanDocxAppProps(entries) {
  var bytes = entries['docProps/app.xml'];
  if (!bytes) return entries;

  var doc = new DOMParser().parseFromString(zipEntryToText(bytes), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return entries;

  ['Company', 'TotalTime', 'Manager', 'Template', 'HyperlinkBase'].forEach(function (name) {
    var els = doc.getElementsByTagNameNS(DOCX_NS.extProps, name);
    for (var i = 0; i < els.length; i++) els[i].textContent = '';
  });

  var titlesEl = doc.getElementsByTagNameNS(DOCX_NS.extProps, 'TitlesOfParts')[0];
  if (titlesEl) {
    var vectorEl = titlesEl.getElementsByTagNameNS(DOCX_NS.vt, 'vector')[0];
    if (vectorEl) {
      while (vectorEl.firstChild) vectorEl.removeChild(vectorEl.firstChild);
      vectorEl.setAttribute('size', '0');
    }
  }

  var next = Object.assign({}, entries);
  next['docProps/app.xml'] = new TextEncoder().encode(new XMLSerializer().serializeToString(doc));
  return next;
}

// 移除一個 zip entry，並同步清掉另外兩處會指向它的地方：
//   1. _rels/.rels 裡的 <Relationship Target="entryPath">
//   2. [Content_Types].xml 裡的 <Override PartName="/entryPath">（只有部分 part 有這個，
//      例如 docProps/custom.xml 有，docProps/thumbnail.jpeg 沒有——用 Default Extension
//      涵蓋，這個函式對兩種情況都正確處理：Override 不存在時單純是 no-op）
// 實測過：只刪 part 不刪 relationship 會讓檔案打不開；Override 沒清雖然不一定會讓 Word
// 打不開，但屬於不乾淨的殘留，一併處理。custom.xml／thumbnail 共用這個唯一入口，不各自寫一份。
// relsPath：這個 entry 的 relationship 定義在哪個 rels 檔。套件層級的 part（docProps 底下
// 那些）用 root 的 '_rels/.rels'（預設值）；word/ 底下的 part（例如 comments.xml/people.xml）
// 要傳 'word/_rels/document.xml.rels'——這個 rels 檔裡的 Target 是相對於 rels 檔所在目錄的
// 上一層（word/），不是相對於 zip 根目錄，所以要換算成完整路徑才能跟 entryPath 比對。
function _relsBaseDir(relsPath) {
  var idx = relsPath.indexOf('_rels/');
  return idx <= 0 ? '' : relsPath.slice(0, idx);
}

function removeZipEntryAndRelationship(entries, entryPath, relsPath) {
  relsPath = relsPath || '_rels/.rels';
  if (!entries[entryPath]) return entries;

  var next = Object.assign({}, entries);
  delete next[entryPath];

  var baseDir = _relsBaseDir(relsPath);
  var relsBytes = next[relsPath];
  if (relsBytes) {
    var doc = new DOMParser().parseFromString(zipEntryToText(relsBytes), 'application/xml');
    var rels = doc.getElementsByTagNameNS(DOCX_NS.relsPkg, 'Relationship');
    for (var i = rels.length - 1; i >= 0; i--) {
      var target = (rels[i].getAttribute('Target') || '').replace(/^\/+/, '');
      var resolved = baseDir + target;
      if (resolved === entryPath) {
        rels[i].parentNode.removeChild(rels[i]);
      }
    }
    next[relsPath] = new TextEncoder().encode(new XMLSerializer().serializeToString(doc));
  }

  var ctBytes = next['[Content_Types].xml'];
  if (ctBytes) {
    var ctDoc = new DOMParser().parseFromString(zipEntryToText(ctBytes), 'application/xml');
    var overrides = ctDoc.getElementsByTagName('Override');
    var wantedPartName = '/' + entryPath;
    for (var j = overrides.length - 1; j >= 0; j--) {
      if (overrides[j].getAttribute('PartName') === wantedPartName) {
        overrides[j].parentNode.removeChild(overrides[j]);
      }
    }
    next['[Content_Types].xml'] = new TextEncoder().encode(new XMLSerializer().serializeToString(ctDoc));
  }

  return next;
}

// --- 註解（word/comments.xml + word/people.xml） ---
//
// 跟 docProps 一樣視為「metadata」，清除範圍：整個 comments.xml/people.xml part、
// document.xml 裡的錨點（commentRangeStart/End/commentReference）、word/_rels/document.xml.rels
// 對應的 relationship、[Content_Types].xml 對應的 Override。people.xml 不一定存在
// （實測：python-docx 原生產生的 docx 都沒有這個檔案，Word 桌面版編輯過的常有），
// 兩種情況都要正確處理，不能假設一定有或一定沒有。

function scanDocxComments(entries) {
  var result = { count: 0, authors: [] };
  var bytes = entries['word/comments.xml'];
  if (!bytes) return result;

  var doc = new DOMParser().parseFromString(zipEntryToText(bytes), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return result;

  var comments = doc.getElementsByTagNameNS(DOCX_NS.w, 'comment');
  result.count = comments.length;
  var seen = {};
  for (var i = 0; i < comments.length; i++) {
    var author = comments[i].getAttribute('w:author');
    if (author && !seen[author]) {
      seen[author] = true;
      result.authors.push(author);
    }
  }
  return result;
}

function cleanDocxComments(entries) {
  if (!entries['word/comments.xml']) return entries;
  var next = entries;

  var docBytes = next['word/document.xml'];
  if (docBytes) {
    var doc = new DOMParser().parseFromString(zipEntryToText(docBytes), 'application/xml');
    if (!doc.getElementsByTagName('parsererror').length) {
      ['commentRangeStart', 'commentRangeEnd'].forEach(function (tag) {
        var els = doc.getElementsByTagNameNS(DOCX_NS.w, tag);
        for (var i = els.length - 1; i >= 0; i--) {
          if (els[i].parentNode) els[i].parentNode.removeChild(els[i]);
        }
      });
      // commentReference 包在專門放它的 <w:r> 裡（跟 comments.xml 自己的錨點 run 同一種
      // 樣板），拔掉整個 <w:r> 而不是只拔 <w:commentReference>，避免留下空殼 run。
      var refs = doc.getElementsByTagNameNS(DOCX_NS.w, 'commentReference');
      for (var j = refs.length - 1; j >= 0; j--) {
        var refEl = refs[j];
        var runEl = refEl.parentNode;
        if (runEl && runEl.localName === 'r' && runEl.parentNode) {
          runEl.parentNode.removeChild(runEl);
        } else if (refEl.parentNode) {
          refEl.parentNode.removeChild(refEl);
        }
      }
      var nextEntries = Object.assign({}, next);
      nextEntries['word/document.xml'] = new TextEncoder().encode(new XMLSerializer().serializeToString(doc));
      next = nextEntries;
    }
  }

  next = removeZipEntryAndRelationship(next, 'word/comments.xml', 'word/_rels/document.xml.rels');
  if (next['word/people.xml']) {
    next = removeZipEntryAndRelationship(next, 'word/people.xml', 'word/_rels/document.xml.rels');
  }

  return next;
}

// --- 追蹤修訂（word/document.xml 的 w:ins/w:del） ---
//
// 只偵測、不自動清除：w:ins/w:del 包的是文件實際內容（新增/刪除的句子），自動接受或
// 拒絕都會改變文件可見內容，超出「清 metadata」的範圍（規格書明定的邊界）。

function scanDocxTrackedChanges(entries) {
  var result = { insertions: [], deletions: [] };
  var bytes = entries['word/document.xml'];
  if (!bytes) return result;

  var doc = new DOMParser().parseFromString(zipEntryToText(bytes), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return result;

  var insEls = doc.getElementsByTagNameNS(DOCX_NS.w, 'ins');
  for (var i = 0; i < insEls.length; i++) {
    result.insertions.push({
      author: insEls[i].getAttribute('w:author'),
      date: insEls[i].getAttribute('w:date')
    });
  }
  var delEls = doc.getElementsByTagNameNS(DOCX_NS.w, 'del');
  for (var j = 0; j < delEls.length; j++) {
    result.deletions.push({
      author: delEls[j].getAttribute('w:author'),
      date: delEls[j].getAttribute('w:date')
    });
  }
  return result;
}

// --- 本機路徑超連結（word/_rels/document.xml.rels 的 External hyperlink） ---
//
// 清除動作只拆 <w:hyperlink> 包裝＋刪 relationship，不改寫可見文字——顯示文字是文件內容，
// 只偵測警示（跟追蹤修訂同一個判斷邏輯：metadata 才清，內容只提示）。

var _DOCX_LOCAL_PATH_TARGET_PATTERN = /^(file:\/\/|[a-zA-Z]:[\\\/]|\\\\|\.\.[\\\/])/i;
var _DOCX_LOCAL_PATH_TEXT_PATTERN = /^([a-zA-Z]:[\\\/]|\\\\|\.\.[\\\/]|file:\/\/)/i;

function scanDocxLocalPathLinks(entries) {
  var result = { relationshipHits: [], displayTextHits: [] };

  var relsBytes = entries['word/_rels/document.xml.rels'];
  if (relsBytes) {
    var relsDoc = new DOMParser().parseFromString(zipEntryToText(relsBytes), 'application/xml');
    if (!relsDoc.getElementsByTagName('parsererror').length) {
      var rels = relsDoc.getElementsByTagNameNS(DOCX_NS.relsPkg, 'Relationship');
      for (var i = 0; i < rels.length; i++) {
        var mode = rels[i].getAttribute('TargetMode');
        var target = rels[i].getAttribute('Target') || '';
        if (mode === 'External' && _DOCX_LOCAL_PATH_TARGET_PATTERN.test(target)) {
          result.relationshipHits.push({ id: rels[i].getAttribute('Id'), target: target });
        }
      }
    }
  }

  var docBytes = entries['word/document.xml'];
  if (docBytes) {
    var doc = new DOMParser().parseFromString(zipEntryToText(docBytes), 'application/xml');
    if (!doc.getElementsByTagName('parsererror').length) {
      var tEls = doc.getElementsByTagNameNS(DOCX_NS.w, 't');
      for (var j = 0; j < tEls.length; j++) {
        var text = tEls[j].textContent || '';
        if (_DOCX_LOCAL_PATH_TEXT_PATTERN.test(text)) {
          result.displayTextHits.push(text);
        }
      }
    }
  }

  return result;
}

function _docxHyperlinkRid(el) {
  var v = el.getAttributeNS(DOCX_NS.r, 'id');
  return v || el.getAttribute('r:id');
}

function cleanDocxLocalPathLinks(entries) {
  var scan = scanDocxLocalPathLinks(entries);
  if (!scan.relationshipHits.length) return entries;

  var idsToRemove = {};
  scan.relationshipHits.forEach(function (hit) { idsToRemove[hit.id] = true; });

  var next = Object.assign({}, entries);

  var docBytes = next['word/document.xml'];
  if (docBytes) {
    var doc = new DOMParser().parseFromString(zipEntryToText(docBytes), 'application/xml');
    if (!doc.getElementsByTagName('parsererror').length) {
      var hyperlinks = doc.getElementsByTagNameNS(DOCX_NS.w, 'hyperlink');
      for (var i = hyperlinks.length - 1; i >= 0; i--) {
        var linkEl = hyperlinks[i];
        var rId = _docxHyperlinkRid(linkEl);
        if (rId && idsToRemove[rId] && linkEl.parentNode) {
          var parent = linkEl.parentNode;
          while (linkEl.firstChild) {
            parent.insertBefore(linkEl.firstChild, linkEl);
          }
          parent.removeChild(linkEl);
        }
      }
      next['word/document.xml'] = new TextEncoder().encode(new XMLSerializer().serializeToString(doc));
    }
  }

  var relsBytes = next['word/_rels/document.xml.rels'];
  if (relsBytes) {
    var relsDoc = new DOMParser().parseFromString(zipEntryToText(relsBytes), 'application/xml');
    if (!relsDoc.getElementsByTagName('parsererror').length) {
      var rels = relsDoc.getElementsByTagNameNS(DOCX_NS.relsPkg, 'Relationship');
      for (var k = rels.length - 1; k >= 0; k--) {
        var id = rels[k].getAttribute('Id');
        if (idsToRemove[id]) rels[k].parentNode.removeChild(rels[k]);
      }
      next['word/_rels/document.xml.rels'] = new TextEncoder().encode(new XMLSerializer().serializeToString(relsDoc));
    }
  }

  return next;
}

// --- 加密偵測 ---
//
// 加密的 Office 檔是 CFB/OLE 容器不是 zip，fflate.unzipSync() 對這種輸入會直接同步丟出
// Error（實測訊息："invalid zip data"）。catch 到例外只能證明「不是合法 zip」，不能斷言
// 一定是密碼保護（單純壞掉的 zip 也會觸發同一個錯誤）——用 magic bytes 精準區分兩種情況，
// 避免對單純損毀的檔案誤判成「有密碼保護」。

var _CFB_MAGIC = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];

function isLikelyEncryptedOfficeFile(arrayBuffer) {
  if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer) || arrayBuffer.byteLength < 8) {
    return false;
  }
  var view = new Uint8Array(arrayBuffer, 0, 8);
  for (var i = 0; i < 8; i++) {
    if (view[i] !== _CFB_MAGIC[i]) return false;
  }
  return true;
}

// --- 檔案大小閘門 ---
//
// DOCX 的正常大小分佈跟 PDF/圖片完全不是同一個量級（實測調查：純文字 docx 約 12KB，
// 含內嵌物件平均約 557KB，托爾斯泰《戰爭與和平》全文存成 docx 也只有約 1.2MB）——
// 30MB 以上的 docx 已經是離群值，不能直接套用 shared/pdf-file-size.js 的 30/100MB
// 門檻。閘門刻意比 PDF/圖片更保守：unzipSync() 是同步全量解壓，瀏覽器 UI thread
// 對大檔案+多 entry 的敏感度比 Node benchmark 更高。
var DOCX_SIZE_WARN_BYTES = 15 * 1024 * 1024;   // 15MB
var DOCX_SIZE_REJECT_BYTES = 50 * 1024 * 1024; // 50MB

function checkDocxFileSize(bytes) {
  var size = Number(bytes);
  if (isNaN(size) || size < 0) {
    return { ok: false, level: 'reject', message: '無效的檔案大小' };
  }
  if (size > DOCX_SIZE_REJECT_BYTES) {
    return {
      ok: false,
      level: 'reject',
      message: '檔案大小（' + (size / (1024 * 1024)).toFixed(1) + 'MB）超過 50MB 上限。' +
        'docx 一般不會超過這個大小，若您確定檔案正常，請改用桌面版 Office 處理。'
    };
  }
  if (size > DOCX_SIZE_WARN_BYTES) {
    return {
      ok: true,
      level: 'warn',
      message: '檔案較大（' + (size / (1024 * 1024)).toFixed(1) + 'MB > 15MB），處理可能需要較長時間'
    };
  }
  return { ok: true, level: 'pass', message: '檔案大小符合標準' };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    readDocxCoreProps: readDocxCoreProps,
    readDocxAppProps: readDocxAppProps,
    hasCustomProps: hasCustomProps,
    hasThumbnail: hasThumbnail,
    cleanDocxCoreProps: cleanDocxCoreProps,
    cleanDocxAppProps: cleanDocxAppProps,
    removeZipEntryAndRelationship: removeZipEntryAndRelationship,
    _findThumbnailPath: _findThumbnailPath,
    scanDocxComments: scanDocxComments,
    cleanDocxComments: cleanDocxComments,
    scanDocxTrackedChanges: scanDocxTrackedChanges,
    scanDocxLocalPathLinks: scanDocxLocalPathLinks,
    cleanDocxLocalPathLinks: cleanDocxLocalPathLinks,
    isLikelyEncryptedOfficeFile: isLikelyEncryptedOfficeFile,
    checkDocxFileSize: checkDocxFileSize
  };
}
