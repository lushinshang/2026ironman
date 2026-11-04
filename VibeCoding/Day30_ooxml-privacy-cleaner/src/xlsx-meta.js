// Day30_ooxml-privacy-cleaner/src/xlsx-meta.js
//
// XLSX（OOXML）特有隱私角落：pivot cache 原始資料殘留、隱藏工作表、外部連結本機路徑、
// 檔案大小閘門。docProps（core.xml/app.xml/custom.xml/thumbnail）那層跟 DOCX 完全同一套
// OPC 機制，直接呼叫 docx-meta.js 已匯出的 readDocxCoreProps/readDocxAppProps/
// cleanDocxCoreProps/cleanDocxAppProps/hasCustomProps/hasThumbnail/_findThumbnailPath/
// removeZipEntryAndRelationship/isLikelyEncryptedOfficeFile，不重寫一份——這些函式本來
// 就只操作 package-level 的 docProps/_rels/.rels/[Content_Types].xml，不含任何 word 專屬
// 邏輯，格式無關（研究筆記已用 XLSX 測資逐一驗證過）。比照 shared/PDF_CONTRACT.md 對
// Day25 的裁定，本檔仍只服務 Day30，不進 shared/；第三格式（PPTX）加入後才評估是否要把
// docx-meta.js 這幾個共用函式整組抽成 shared/ooxml-meta.js。
//
// 依賴：docx-meta.js（先載入，提供上述共用函式）、shared/io-zip.js 的 zipEntryToText()、
// 瀏覽器原生 DOMParser／XMLSerializer／TextEncoder。

var XLSX_NS = {
  main: 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
  relsPkg: 'http://schemas.openxmlformats.org/package/2006/relationships'
};

// --- Pivot Cache 資料殘留 ---
//
// 來源工作表刪除後，xl/pivotCache/pivotCacheDefinition*.xml（sharedItems，字串明文）與
// pivotCacheRecords*.xml（實際數值/索引）仍完整保留，這是實測確認的行為，不是推論
// （見 xlsx_structure_notes.md 第 1 節）。檔名是動態編號的，用正則掃描，不寫死。

var _XLSX_PIVOT_DEF_PATTERN = /^xl\/pivotCache\/pivotCacheDefinition(\d+)\.xml$/;

function scanXlsxPivotCaches(entries) {
  var result = { count: 0, caches: [] };
  Object.keys(entries).forEach(function (path) {
    var m = path.match(_XLSX_PIVOT_DEF_PATTERN);
    if (!m) return;
    var idx = m[1];
    var recordsPath = 'xl/pivotCache/pivotCacheRecords' + idx + '.xml';
    var doc = new DOMParser().parseFromString(zipEntryToText(entries[path]), 'application/xml');
    var sharedItemsPreview = [];
    if (!doc.getElementsByTagName('parsererror').length) {
      var sEls = doc.getElementsByTagNameNS(XLSX_NS.main, 's');
      for (var i = 0; i < sEls.length && sharedItemsPreview.length < 20; i++) {
        var v = sEls[i].getAttribute('v');
        if (v) sharedItemsPreview.push(v);
      }
    }
    result.caches.push({
      definitionPath: path,
      recordsPath: entries[recordsPath] ? recordsPath : null,
      sharedItemsPreview: sharedItemsPreview
    });
  });
  result.count = result.caches.length;
  return result;
}

// 偵測到 pivot cache 就整組移除（part + relationship + Content_Types Override +
// xl/workbook.xml 的 <pivotCaches> 節點）——pivot table 本身沒有 cache 會直接失效，
// 不是「清 metadata 不動內容」能兼顧的情況，UI 層要明確警示「將移除此檔案內的樞紐分析表」。
function cleanXlsxPivotCaches(entries) {
  var scan = scanXlsxPivotCaches(entries);
  if (!scan.count) return entries;

  var next = entries;
  scan.caches.forEach(function (cache) {
    var idx = cache.definitionPath.match(_XLSX_PIVOT_DEF_PATTERN)[1];
    var defRelsPath = 'xl/pivotCache/_rels/pivotCacheDefinition' + idx + '.xml.rels';
    if (cache.recordsPath && next[cache.recordsPath]) {
      next = removeZipEntryAndRelationship(next, cache.recordsPath, defRelsPath);
    }
    if (next[defRelsPath]) {
      var withoutRels = Object.assign({}, next);
      delete withoutRels[defRelsPath];
      next = withoutRels;
    }
    next = removeZipEntryAndRelationship(next, cache.definitionPath, 'xl/_rels/workbook.xml.rels');
  });

  var wbBytes = next['xl/workbook.xml'];
  if (wbBytes) {
    var doc = new DOMParser().parseFromString(zipEntryToText(wbBytes), 'application/xml');
    if (!doc.getElementsByTagName('parsererror').length) {
      var pivotCachesEls = doc.getElementsByTagNameNS(XLSX_NS.main, 'pivotCaches');
      for (var i = pivotCachesEls.length - 1; i >= 0; i--) {
        if (pivotCachesEls[i].parentNode) pivotCachesEls[i].parentNode.removeChild(pivotCachesEls[i]);
      }
      var nextEntries = Object.assign({}, next);
      nextEntries['xl/workbook.xml'] = new TextEncoder().encode(new XMLSerializer().serializeToString(doc));
      next = nextEntries;
    }
  }

  return next;
}

// --- 隱藏工作表 ---
//
// state="hidden"／"veryHidden" 只是 UI 顯示旗標，工作表名稱（xl/workbook.xml 的
// <sheet name="...">）與內容（對應 xl/worksheets/sheetN.xml）完全沒有被移除或混淆——
// 只偵測、不自動移除：移除隱藏工作表整個分頁是「改變文件內容」的操作，比照 DOCX
// 追蹤修訂的判準（規格書：內容變更只警示，不自動清除）。

function scanXlsxHiddenSheets(entries) {
  var result = [];
  var wbBytes = entries['xl/workbook.xml'];
  if (!wbBytes) return result;
  var doc = new DOMParser().parseFromString(zipEntryToText(wbBytes), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return result;
  var sheets = doc.getElementsByTagNameNS(XLSX_NS.main, 'sheet');
  for (var i = 0; i < sheets.length; i++) {
    var state = sheets[i].getAttribute('state');
    if (state === 'hidden' || state === 'veryHidden') {
      result.push({ name: sheets[i].getAttribute('name'), state: state });
    }
  }
  return result;
}

// --- 外部連結（xl/externalLinks/）本機路徑 ---
//
// 跟 DOCX 的 word/_rels/document.xml.rels 外部 hyperlink 同一套判斷（TargetMode="External"
// + file:// 開頭的 Target），但多一層：xl/_rels/workbook.xml.rels 只指到
// xl/externalLinks/externalLinkN.xml 本體，實際路徑存在
// xl/externalLinks/_rels/externalLinkN.xml.rels 裡。儲存格公式殘留的外部參照字串
// （例如 =[來源.xlsx]工作表1!A1，存在 xl/worksheets/sheetN.xml 的 <f> 元素）屬於文件內容，
// 不在這裡處理，只掃描/清除 externalLinks part 本身。

var _XLSX_EXTERNAL_LINK_PATTERN = /^xl\/externalLinks\/externalLink(\d+)\.xml$/;
var _XLSX_LOCAL_PATH_TARGET_PATTERN = /^(file:\/\/|[a-zA-Z]:[\\\/]|\\\\|\.\.[\\\/])/i;

function scanXlsxExternalLinks(entries) {
  var result = { relationshipHits: [] };
  Object.keys(entries).forEach(function (path) {
    var m = path.match(_XLSX_EXTERNAL_LINK_PATTERN);
    if (!m) return;
    var relsPath = 'xl/externalLinks/_rels/externalLink' + m[1] + '.xml.rels';
    var relsBytes = entries[relsPath];
    if (!relsBytes) return;
    var doc = new DOMParser().parseFromString(zipEntryToText(relsBytes), 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return;
    var rels = doc.getElementsByTagNameNS(XLSX_NS.relsPkg, 'Relationship');
    for (var i = 0; i < rels.length; i++) {
      var mode = rels[i].getAttribute('TargetMode');
      var target = rels[i].getAttribute('Target') || '';
      if (mode === 'External' && _XLSX_LOCAL_PATH_TARGET_PATTERN.test(target)) {
        result.relationshipHits.push({ id: rels[i].getAttribute('Id'), target: target, linkPath: path });
      }
    }
  });
  return result;
}

function cleanXlsxExternalLinks(entries) {
  var scan = scanXlsxExternalLinks(entries);
  if (!scan.relationshipHits.length) return entries;

  var linkPaths = {};
  scan.relationshipHits.forEach(function (hit) { linkPaths[hit.linkPath] = true; });

  // 找出 xl/_rels/workbook.xml.rels 裡指到即將刪除之 externalLink 的 Relationship ID
  var removedRids = {};
  var wbRelsBytes = entries['xl/_rels/workbook.xml.rels'];
  if (wbRelsBytes) {
    var relsDoc = new DOMParser().parseFromString(zipEntryToText(wbRelsBytes), 'application/xml');
    if (!relsDoc.getElementsByTagName('parsererror').length) {
      var rels = relsDoc.getElementsByTagNameNS(XLSX_NS.relsPkg, 'Relationship');
      for (var k = 0; k < rels.length; k++) {
        var target = (rels[k].getAttribute('Target') || '').replace(/^\/+/, '');
        var resolved = 'xl/' + target;
        if (linkPaths[resolved]) {
          var id = rels[k].getAttribute('Id');
          if (id) removedRids[id] = true;
        }
      }
    }
  }

  var next = entries;
  Object.keys(linkPaths).forEach(function (linkPath) {
    var m = linkPath.match(_XLSX_EXTERNAL_LINK_PATTERN);
    var relsPath = 'xl/externalLinks/_rels/externalLink' + m[1] + '.xml.rels';
    next = removeZipEntryAndRelationship(next, linkPath, 'xl/_rels/workbook.xml.rels');
    if (next[relsPath]) {
      var withoutRels = Object.assign({}, next);
      delete withoutRels[relsPath];
      next = withoutRels;
    }
  });

  var wbBytes = next['xl/workbook.xml'];
  if (wbBytes) {
    var doc = new DOMParser().parseFromString(zipEntryToText(wbBytes), 'application/xml');
    if (!doc.getElementsByTagName('parsererror').length) {
      var extRefsEls = doc.getElementsByTagNameNS(XLSX_NS.main, 'externalReferences');
      for (var i = extRefsEls.length - 1; i >= 0; i--) {
        var parentEl = extRefsEls[i];
        var refEls = parentEl.getElementsByTagNameNS(XLSX_NS.main, 'externalReference');
        for (var j = refEls.length - 1; j >= 0; j--) {
          var rid = refEls[j].getAttributeNS(XLSX_NS.r, 'id') || refEls[j].getAttribute('r:id');
          if (rid && removedRids[rid]) {
            parentEl.removeChild(refEls[j]);
          }
        }
        // 若該 externalReferences 底下所有 externalReference 皆已被移除，才拔除外層容器
        var remaining = parentEl.getElementsByTagNameNS(XLSX_NS.main, 'externalReference');
        if (remaining.length === 0 && parentEl.parentNode) {
          parentEl.parentNode.removeChild(parentEl);
        }
      }
      var nextEntries = Object.assign({}, next);
      nextEntries['xl/workbook.xml'] = new TextEncoder().encode(new XMLSerializer().serializeToString(doc));
      next = nextEntries;
    }
  }

  return next;
}

// --- 檔案大小閘門 ---
//
// XLSX 常態內含大量數值資料，不能套用 DOCX 的 15/50MB 門檻——研究實測 30 萬列 x 5 欄
// 的「正常但偏大」業務報表約 9.67MB，25MB 還有相當餘裕；80MB 已接近 SharePoint Online
// 上傳限制（10MB）的 8 倍，多半代表資料量極端或有異常（例如大量重複 pivot cache），
// 見 xlsx_structure_notes.md 第 5 節。

var XLSX_SIZE_WARN_BYTES = 25 * 1024 * 1024;   // 25MB
var XLSX_SIZE_REJECT_BYTES = 80 * 1024 * 1024; // 80MB

function checkXlsxFileSize(bytes) {
  var size = Number(bytes);
  if (isNaN(size) || size < 0) {
    return { ok: false, level: 'reject', message: '無效的檔案大小' };
  }
  if (size > XLSX_SIZE_REJECT_BYTES) {
    return {
      ok: false,
      level: 'reject',
      message: '檔案大小（' + (size / (1024 * 1024)).toFixed(1) + 'MB）超過 80MB 上限。' +
        'xlsx 正常業務報表不會到這個大小，若您確定檔案正常，請改用桌面版 Excel 處理。'
    };
  }
  if (size > XLSX_SIZE_WARN_BYTES) {
    return {
      ok: true,
      level: 'warn',
      message: '檔案較大（' + (size / (1024 * 1024)).toFixed(1) + 'MB > 25MB），處理可能需要較長時間'
    };
  }
  return { ok: true, level: 'pass', message: '檔案大小符合標準' };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    XLSX_NS: XLSX_NS,
    scanXlsxPivotCaches: scanXlsxPivotCaches,
    cleanXlsxPivotCaches: cleanXlsxPivotCaches,
    scanXlsxHiddenSheets: scanXlsxHiddenSheets,
    scanXlsxExternalLinks: scanXlsxExternalLinks,
    cleanXlsxExternalLinks: cleanXlsxExternalLinks,
    checkXlsxFileSize: checkXlsxFileSize
  };
}
