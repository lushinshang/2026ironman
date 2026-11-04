// Day30_ooxml-privacy-cleaner/src/pptx-meta.js
//
// PPTX（OOXML）特有隱私角落：圖片裁切前完整原圖殘留（燒進像素清除，比照 Day16
// screenshot-sanitizer「遮蔽必須燒進像素，不能只是視覺疊加層」的原則）、講者備忘稿、
// 隱藏投影片、檔案大小閘門。docProps（core.xml/app.xml/custom.xml/thumbnail）那層跟
// DOCX/XLSX 完全同一套 OPC 機制，直接呼叫 docx-meta.js 已匯出的函式，不重寫（格式無關，
// 見 pptx_structure_notes.md）。
//
// 依賴：docx-meta.js（removeZipEntryAndRelationship 等）、shared/io-zip.js 的
// zipEntryToText()、瀏覽器原生 DOMParser／XMLSerializer／TextEncoder／Image／canvas
// （圖片裁切清除需要實際解碼並重繪像素，這是本檔唯一用到 canvas 的地方）。

var PPTX_NS = {
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  p: 'http://schemas.openxmlformats.org/presentationml/2006/main',
  relsPkg: 'http://schemas.openxmlformats.org/package/2006/relationships',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
};

var _PPTX_SLIDE_PATTERN = /^ppt\/slides\/slide(\d+)\.xml$/;
var _PPTX_NOTES_SLIDE_PATTERN = /^ppt\/notesSlides\/notesSlide(\d+)\.xml$/;

function _pptxSlideRelsPath(slidePath) {
  var m = slidePath.match(_PPTX_SLIDE_PATTERN);
  return 'ppt/slides/_rels/slide' + m[1] + '.xml.rels';
}

// rels 檔的 Target 是相對於「rels 檔所屬 part 的所在目錄」（不是 _rels 目錄本身），
// 例如 ppt/slides/_rels/slide1.xml.rels 裡的 "../media/image1.png" 要相對於
// ppt/slides/ 解析，才會得到正確的 ppt/media/image1.png。
function _resolveRelativeTarget(baseDir, target) {
  if (!target) return '';
  if (target.charAt(0) === '/') return target.replace(/^\/+/, '');
  var baseParts = baseDir.split('/').filter(Boolean);
  target.split('/').forEach(function (part) {
    if (part === '..') baseParts.pop();
    else if (part && part !== '.') baseParts.push(part);
  });
  return baseParts.join('/');
}

function _pptxSlideRelMap(entries, slidePath) {
  var map = {};
  var relsBytes = entries[_pptxSlideRelsPath(slidePath)];
  if (!relsBytes) return map;
  var doc = new DOMParser().parseFromString(zipEntryToText(relsBytes), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return map;
  var rels = doc.getElementsByTagNameNS(PPTX_NS.relsPkg, 'Relationship');
  for (var i = 0; i < rels.length; i++) {
    map[rels[i].getAttribute('Id')] = _resolveRelativeTarget('ppt/slides', rels[i].getAttribute('Target') || '');
  }
  return map;
}

function _pptxBlipRid(el) {
  var v = el.getAttributeNS(PPTX_NS.r, 'embed');
  return v || el.getAttribute('r:embed');
}

// --- 圖片裁切：ppt/media/ 存的是裁切前完整原圖 ---
//
// <a:srcRect l="" t="" r="" b=""/>（單位：萬分之一，即 100000 = 100%）是純顯示層屬性，
// 底層 media part 永遠是裁切前的完整原圖。掃描結果回傳每一處裁切的 slide/media 對應與
// 裁切比例，供 UI 顯示與後續清除使用。

function scanPptxCroppedImages(entries) {
  var result = { count: 0, crops: [] };
  Object.keys(entries).sort().forEach(function (path) {
    if (!_PPTX_SLIDE_PATTERN.test(path)) return;
    var relMap = _pptxSlideRelMap(entries, path);
    var doc = new DOMParser().parseFromString(zipEntryToText(entries[path]), 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return;
    var blips = doc.getElementsByTagNameNS(PPTX_NS.a, 'blip');
    for (var j = 0; j < blips.length; j++) {
      var rId = _pptxBlipRid(blips[j]);
      if (!rId || !relMap[rId]) continue;
      var parent = blips[j].parentNode; // a:blipFill，srcRect 是它的直接子節點
      var srcRect = parent ? parent.getElementsByTagNameNS(PPTX_NS.a, 'srcRect')[0] : null;
      if (!srcRect) continue;
      var l = parseInt(srcRect.getAttribute('l') || '0', 10);
      var t = parseInt(srcRect.getAttribute('t') || '0', 10);
      var r = parseInt(srcRect.getAttribute('r') || '0', 10);
      var b = parseInt(srcRect.getAttribute('b') || '0', 10);
      if (!l && !t && !r && !b) continue;
      result.crops.push({ slidePath: path, mediaPath: relMap[rId], l: l, t: t, r: r, b: b });
    }
  });
  result.count = result.crops.length;
  return result;
}

var _PPTX_IMAGE_MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp' };

function _pptxMediaExt(path) {
  var m = path.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : '';
}

// 實際解碼圖片、依裁切比例只保留可見範圍重繪，回傳裁切後的位元組——這是真的「清除」
// （像素層面移除），不是只加一個警示文字。
function _pptxCropImageBytes(bytes, mime, l, t, r, b) {
  return new Promise(function (resolve, reject) {
    var blob = new Blob([bytes], { type: mime });
    var url = URL.createObjectURL(blob);
    var img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(url);
      var w = img.naturalWidth, h = img.naturalHeight;
      var cropLeft = Math.min(w - 1, Math.max(0, Math.round(w * l / 100000)));
      var cropTop = Math.min(h - 1, Math.max(0, Math.round(h * t / 100000)));
      var cropRight = Math.min(w - 1, Math.max(0, Math.round(w * r / 100000)));
      var cropBottom = Math.min(h - 1, Math.max(0, Math.round(h * b / 100000)));
      var visW = Math.max(1, w - cropLeft - cropRight);
      var visH = Math.max(1, h - cropTop - cropBottom);
      if (cropLeft + visW > w) visW = Math.max(1, w - cropLeft);
      if (cropTop + visH > h) visH = Math.max(1, h - cropTop);
      var canvas = document.createElement('canvas');
      canvas.width = visW;
      canvas.height = visH;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, cropLeft, cropTop, visW, visH, 0, 0, visW, visH);
      canvas.toBlob(function (outBlob) {
        if (!outBlob) { reject(new Error('canvas toBlob failed')); return; }
        outBlob.arrayBuffer().then(function (ab) { resolve(new Uint8Array(ab)); }, reject);
      }, mime);
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('image decode failed')); };
    img.src = url;
  });
}

// 清除是非同步的（圖片解碼/canvas 重繪本質上是非同步 API），呼叫端要用 await/.then()。
// 回傳 { entries, appliedMedia, skippedMedia }：
//   - appliedMedia：實際完成像素級裁切、srcRect 已移除的媒體檔路徑
//   - skippedMedia：同一媒體檔被多處引用但裁切規格不一致、裁切比例超出合理範圍
//     （<0 或 >100%）、或不是已知的點陣圖格式時，不自動處理，避免用單一裁切覆蓋掉
//     另一處合法用途的顯示，只回報供 UI 警示
function cleanPptxCroppedImages(entries) {
  var scan = scanPptxCroppedImages(entries);
  if (!scan.count) {
    return Promise.resolve({ entries: entries, appliedMedia: [], skippedMedia: [] });
  }

  // 依 mediaPath 分組，確認同一媒體檔的所有 crop 參數完全一致才自動切，
  // 若同一原圖被兩張投影片各切不同區域，不自動切（切了會造成另一張破圖）。
  var byMedia = {};
  scan.crops.forEach(function (c) {
    if (!byMedia[c.mediaPath]) byMedia[c.mediaPath] = [];
    byMedia[c.mediaPath].push(c);
  });

  var appliedMedia = [];
  var skippedMedia = [];
  var cropTasks = [];

  Object.keys(byMedia).forEach(function (mediaPath) {
    var crops = byMedia[mediaPath];
    var first = crops[0];
    var consistent = crops.every(function (c) {
      return c.l === first.l && c.t === first.t && c.r === first.r && c.b === first.b;
    });
    var inRange = [first.l, first.t, first.r, first.b].every(function (v) { return v >= 0 && v <= 100000; }) &&
      (first.l + first.r < 100000) && (first.t + first.b < 100000);
    var mime = _PPTX_IMAGE_MIME[_pptxMediaExt(mediaPath)];
    if (!consistent || !inRange || !mime || !entries[mediaPath]) {
      skippedMedia.push(mediaPath);
      return;
    }
    cropTasks.push(
      _pptxCropImageBytes(entries[mediaPath], mime, first.l, first.t, first.r, first.b)
        .then(function (bytes) { return { mediaPath: mediaPath, bytes: bytes }; })
        .catch(function () { skippedMedia.push(mediaPath); return null; })
    );
  });

  return Promise.all(cropTasks).then(function (results) {
    var next = Object.assign({}, entries);
    var appliedSet = {};
    results.filter(Boolean).forEach(function (res) {
      next[res.mediaPath] = res.bytes;
      appliedMedia.push(res.mediaPath);
      appliedSet[res.mediaPath] = true;
    });

    // 圖片本體已經是裁切後版本，slide XML 裡對應的 <a:srcRect> 要移除，否則渲染引擎
    // 會在已經裁切過的圖上再裁一次。只動處理過的媒體對應的 srcRect，跳過的維持原樣。
    if (appliedMedia.length) {
      var slidePaths = {};
      scan.crops.forEach(function (c) { if (appliedSet[c.mediaPath]) slidePaths[c.slidePath] = true; });
      Object.keys(slidePaths).forEach(function (slidePath) {
        var relMap = _pptxSlideRelMap(next, slidePath);
        var doc = new DOMParser().parseFromString(zipEntryToText(next[slidePath]), 'application/xml');
        if (doc.getElementsByTagName('parsererror').length) return;
        var blips = doc.getElementsByTagNameNS(PPTX_NS.a, 'blip');
        for (var j = 0; j < blips.length; j++) {
          var rId = _pptxBlipRid(blips[j]);
          if (!rId || !appliedSet[relMap[rId]]) continue;
          var parent = blips[j].parentNode;
          var srcRect = parent ? parent.getElementsByTagNameNS(PPTX_NS.a, 'srcRect')[0] : null;
          if (srcRect && srcRect.parentNode) srcRect.parentNode.removeChild(srcRect);
        }
        next[slidePath] = new TextEncoder().encode(new XMLSerializer().serializeToString(doc));
      });
    }

    return { entries: next, appliedMedia: appliedMedia, skippedMedia: skippedMedia };
  });
}

// --- 講者備忘稿（ppt/notesSlides/） ---
//
// 附加資訊、不是文件正文，跟 DOCX comments 同一種判斷：整組移除（part + 引用它的
// slide 對應 rels 裡的 relationship + Content_Types Override）。

function scanPptxSpeakerNotes(entries) {
  var result = { count: 0, notes: [] };
  Object.keys(entries).sort().forEach(function (path) {
    if (!_PPTX_NOTES_SLIDE_PATTERN.test(path)) return;
    var doc = new DOMParser().parseFromString(zipEntryToText(entries[path]), 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return;
    var tEls = doc.getElementsByTagNameNS(PPTX_NS.a, 't');
    var texts = [];
    for (var i = 0; i < tEls.length; i++) {
      if (tEls[i].textContent) texts.push(tEls[i].textContent);
    }
    if (texts.length) result.notes.push({ path: path, preview: texts.join(' ').slice(0, 80) });
  });
  result.count = result.notes.length;
  return result;
}

function cleanPptxSpeakerNotes(entries) {
  var scan = scanPptxSpeakerNotes(entries);
  if (!scan.count) return entries;

  var next = entries;
  scan.notes.forEach(function (note) {
    var m = note.path.match(_PPTX_NOTES_SLIDE_PATTERN);
    var idx = m[1];

    // 先在引用這份 notesSlide 的 slide 自己的 rels 裡移除對應 relationship
    // （notesSlide 的關聯定義在 slide 層級，不是套件層級，跟 DOCX word/comments.xml
    // 掛在 word/_rels/document.xml.rels 是同一種模式）。
    Object.keys(next).forEach(function (path) {
      if (!_PPTX_SLIDE_PATTERN.test(path)) return;
      var relsPath = _pptxSlideRelsPath(path);
      if (!next[relsPath]) return;
      var doc = new DOMParser().parseFromString(zipEntryToText(next[relsPath]), 'application/xml');
      if (doc.getElementsByTagName('parsererror').length) return;
      var rels = doc.getElementsByTagNameNS(PPTX_NS.relsPkg, 'Relationship');
      var changed = false;
      for (var i = rels.length - 1; i >= 0; i--) {
        var target = _resolveRelativeTarget('ppt/slides', rels[i].getAttribute('Target') || '');
        if (target === note.path) {
          rels[i].parentNode.removeChild(rels[i]);
          changed = true;
        }
      }
      if (changed) {
        var nextEntries = Object.assign({}, next);
        nextEntries[relsPath] = new TextEncoder().encode(new XMLSerializer().serializeToString(doc));
        next = nextEntries;
      }
    });

    // relsPath 傳套件層級的 rels 只是為了借用 removeZipEntryAndRelationship 順便清掉
    // Content_Types 的 Override（relationship 已經在上面手動清掉了，這裡不會重複找到）。
    next = removeZipEntryAndRelationship(next, note.path, '_rels/.rels');
    var notesRelsPath = 'ppt/notesSlides/_rels/notesSlide' + idx + '.xml.rels';
    if (next[notesRelsPath]) {
      var withoutRels = Object.assign({}, next);
      delete withoutRels[notesRelsPath];
      next = withoutRels;
    }
  });

  return next;
}

// --- 隱藏投影片 ---
//
// <p:sld show="0"> 只是顯示旗標，投影片本體內容完全沒有被移除。只偵測警示（跟 DOCX
// 追蹤修訂、XLSX 隱藏工作表同一個判準：改變文件內容的操作不自動處理）。

function scanPptxHiddenSlides(entries) {
  var result = [];
  Object.keys(entries).sort().forEach(function (path) {
    if (!_PPTX_SLIDE_PATTERN.test(path)) return;
    var doc = new DOMParser().parseFromString(zipEntryToText(entries[path]), 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return;
    var sldEls = doc.getElementsByTagNameNS(PPTX_NS.p, 'sld');
    if (!sldEls.length || sldEls[0].getAttribute('show') !== '0') return;
    var titleEls = doc.getElementsByTagNameNS(PPTX_NS.a, 't');
    result.push({ path: path, titlePreview: titleEls.length ? titleEls[0].textContent : null });
  });
  return result;
}

// --- 檔案大小閘門 ---
//
// PPTX 是三格式裡唯一常態內嵌大型媒體（尤其影片）的格式，門檻不能比照 DOCX（15/50MB）
// 或 XLSX（25/80MB）。研究實測：一般簡報平均 4-10MB，內嵌中等長度影片的合理上限約
// 100MB，見 pptx_structure_notes.md 第 5 節。

var PPTX_SIZE_WARN_BYTES = 20 * 1024 * 1024;   // 20MB
var PPTX_SIZE_REJECT_BYTES = 100 * 1024 * 1024; // 100MB

function checkPptxFileSize(bytes) {
  var size = Number(bytes);
  if (isNaN(size) || size < 0) {
    return { ok: false, level: 'reject', message: '無效的檔案大小' };
  }
  if (size > PPTX_SIZE_REJECT_BYTES) {
    return {
      ok: false,
      level: 'reject',
      message: '檔案大小（' + (size / (1024 * 1024)).toFixed(1) + 'MB）超過 100MB 上限。' +
        'pptx 一般簡報分享場景很少超過這個量級，若您確定檔案正常，請改用桌面版 PowerPoint 處理。'
    };
  }
  if (size > PPTX_SIZE_WARN_BYTES) {
    return {
      ok: true,
      level: 'warn',
      message: '檔案較大（' + (size / (1024 * 1024)).toFixed(1) + 'MB > 20MB），處理可能需要較長時間'
    };
  }
  return { ok: true, level: 'pass', message: '檔案大小符合標準' };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PPTX_NS: PPTX_NS,
    scanPptxCroppedImages: scanPptxCroppedImages,
    cleanPptxCroppedImages: cleanPptxCroppedImages,
    scanPptxSpeakerNotes: scanPptxSpeakerNotes,
    cleanPptxSpeakerNotes: cleanPptxSpeakerNotes,
    scanPptxHiddenSlides: scanPptxHiddenSlides,
    checkPptxFileSize: checkPptxFileSize
  };
}
