// shared/img-exif.js

// 共用的 TIFF/EXIF IFD 解析器：輸入一段從 TIFF byte-order marker 開始的 DataView
// （不論這段資料原本是嵌在 JPEG 的 APP1、PNG 的 eXIf chunk、還是 WebP 的 EXIF chunk），
// 解析出 IFD0／Exif SubIFD／GPS IFD 三張表，回傳跟 readExifTags() 同樣形狀的欄位。
// 錯誤不外拋，回傳目前已解析到的部分結果（container 格式各自的呼叫端沿用這個容錯行為）。
function _parseTiffTags(view) {
  var result = {
    orientation: null,
    dateTimeOriginal: null,
    make: null,
    model: null,
    gpsLatitude: null,
    gpsLongitude: null,
    hasGPS: false
  };

  try {
    var tiffLen = view.byteLength;
    if (tiffLen < 8) return result;

    var byteOrder = view.getUint16(0, false);
    var littleEndian = false;
    if (byteOrder === 0x4949) {
      littleEndian = true;
    } else if (byteOrder === 0x4D4D) {
      littleEndian = false;
    } else {
      return result;
    }

    if (view.getUint16(2, littleEndian) !== 0x002A) {
      return result;
    }

    var ifd0Offset = view.getUint32(4, littleEndian);
    if (ifd0Offset >= tiffLen) return result;

    function getStringValue(offsetVal, count) {
      var str = '';
      for (var i = 0; i < count; i++) {
        if (offsetVal + i >= tiffLen) break;
        var code = view.getUint8(offsetVal + i);
        if (code === 0) break; // null-terminated
        str += String.fromCharCode(code);
      }
      return str.trim();
    }

    function getRationalValue(offsetVal) {
      if (offsetVal + 8 > tiffLen) return 0;
      var num = view.getUint32(offsetVal, littleEndian);
      var den = view.getUint32(offsetVal + 4, littleEndian);
      if (den === 0) return 0;
      return num / den;
    }

    var exifSubIFDOffset = null;
    var gpsIFDOffset = null;

    // Read IFD0
    if (ifd0Offset + 2 <= tiffLen) {
      var numEntries0 = view.getUint16(ifd0Offset, littleEndian);
      var entryOffset = ifd0Offset + 2;

      for (var e = 0; e < numEntries0 && entryOffset + 12 <= tiffLen; e++, entryOffset += 12) {
        var tag = view.getUint16(entryOffset, littleEndian);
        var count = view.getUint32(entryOffset + 4, littleEndian);
        var valOrOffset = entryOffset + 8;
        var valOffset = view.getUint32(valOrOffset, littleEndian);

        if (tag === 0x0112) { // Orientation
          result.orientation = view.getUint16(valOrOffset, littleEndian);
        } else if (tag === 0x010F) { // Make
          var strOffset = (count <= 4) ? valOrOffset : valOffset;
          result.make = getStringValue(strOffset, count);
        } else if (tag === 0x0110) { // Model
          var strOffset = (count <= 4) ? valOrOffset : valOffset;
          result.model = getStringValue(strOffset, count);
        } else if (tag === 0x8769) { // ExifIFDPointer
          exifSubIFDOffset = valOffset;
        } else if (tag === 0x8825) { // GPSInfoIFDPointer
          gpsIFDOffset = valOffset;
        }
      }
    }

    // Read Exif SubIFD
    if (exifSubIFDOffset !== null && exifSubIFDOffset + 2 <= tiffLen) {
      var numSubEntries = view.getUint16(exifSubIFDOffset, littleEndian);
      var subEntryOffset = exifSubIFDOffset + 2;

      for (var se = 0; se < numSubEntries && subEntryOffset + 12 <= tiffLen; se++, subEntryOffset += 12) {
        var subTag = view.getUint16(subEntryOffset, littleEndian);
        var subCount = view.getUint32(subEntryOffset + 4, littleEndian);
        var subValOrOffset = subEntryOffset + 8;
        var subValOffset = view.getUint32(subValOrOffset, littleEndian);

        if (subTag === 0x9003) { // DateTimeOriginal
          var dateOffset = (subCount <= 4) ? subValOrOffset : subValOffset;
          result.dateTimeOriginal = getStringValue(dateOffset, subCount);
        }
      }
    }

    // Read GPS IFD
    if (gpsIFDOffset !== null && gpsIFDOffset + 2 <= tiffLen) {
      var numGpsEntries = view.getUint16(gpsIFDOffset, littleEndian);
      var gpsEntryOffset = gpsIFDOffset + 2;

      var latRef = null;
      var latDeg = null, latMin = null, latSec = null;
      var lonRef = null;
      var lonDeg = null, lonMin = null, lonSec = null;

      for (var ge = 0; ge < numGpsEntries && gpsEntryOffset + 12 <= tiffLen; ge++, gpsEntryOffset += 12) {
        var gTag = view.getUint16(gpsEntryOffset, littleEndian);
        var gCount = view.getUint32(gpsEntryOffset + 4, littleEndian);
        var gValOrOffset = gpsEntryOffset + 8;
        var gValOffset = view.getUint32(gValOrOffset, littleEndian);

        if (gTag === 0x0001) { // GPSLatitudeRef ('N' or 'S')
          latRef = String.fromCharCode(view.getUint8(gValOrOffset)).toUpperCase();
        } else if (gTag === 0x0002 && gCount === 3) { // GPSLatitude (3 rationals)
          var ratOffset = gValOffset;
          latDeg = getRationalValue(ratOffset);
          latMin = getRationalValue(ratOffset + 8);
          latSec = getRationalValue(ratOffset + 16);
        } else if (gTag === 0x0003) { // GPSLongitudeRef ('E' or 'W')
          lonRef = String.fromCharCode(view.getUint8(gValOrOffset)).toUpperCase();
        } else if (gTag === 0x0004 && gCount === 3) { // GPSLongitude (3 rationals)
          var ratOffsetLon = gValOffset;
          lonDeg = getRationalValue(ratOffsetLon);
          lonMin = getRationalValue(ratOffsetLon + 8);
          lonSec = getRationalValue(ratOffsetLon + 16);
        }
      }

      if (latDeg !== null && latMin !== null && latSec !== null) {
        var latVal = latDeg + (latMin / 60) + (latSec / 3600);
        if (latRef === 'S') latVal = -latVal;
        result.gpsLatitude = latVal;
      }
      if (lonDeg !== null && lonMin !== null && lonSec !== null) {
        var lonVal = lonDeg + (lonMin / 60) + (lonSec / 3600);
        if (lonRef === 'W') lonVal = -lonVal;
        result.gpsLongitude = lonVal;
      }

      if (result.gpsLatitude !== null && result.gpsLongitude !== null) {
        result.hasGPS = true;
      }
    }

  } catch (err) {
    // Non-fatal error during parsing, return whatever was parsed so far
  }

  return result;
}

// PNG chunk 序列走訪器：從第 8 byte（PNG 簽章之後）開始，每個 chunk 是
// 4 bytes 長度 + 4 bytes chunk type + data + 4 bytes CRC32。對每個 chunk
// 呼叫 callback(type, chunkStart, dataStart, dataLength, chunkEnd)；
// 遇到 IEND 或資料被截斷就停止。
function _pngChunkWalker(dataView, callback) {
  var length = dataView.byteLength;
  if (length < 8) return;
  var offset = 8;
  while (offset + 8 <= length) {
    var dataLength = dataView.getUint32(offset, false);
    var typeStart = offset + 4;
    var dataStart = typeStart + 4;
    var chunkEnd = dataStart + dataLength + 4; // + CRC32
    if (dataLength < 0 || chunkEnd > length) break; // malformed / truncated
    var type = String.fromCharCode(
      dataView.getUint8(typeStart),
      dataView.getUint8(typeStart + 1),
      dataView.getUint8(typeStart + 2),
      dataView.getUint8(typeStart + 3)
    );
    callback(type, offset, dataStart, dataLength, chunkEnd);
    if (type === 'IEND') break;
    offset = chunkEnd;
  }
}

function _isPng(dataView) {
  return dataView.byteLength >= 8 &&
    dataView.getUint32(0, false) === 0x89504E47 &&
    dataView.getUint32(4, false) === 0x0D0A1A0A;
}

// 讀取 PNG 的 eXIf chunk（完整 EXIF/TIFF blob）與 iTXt 裡 keyword 為
// XML:com.adobe.xmp 的 XMP 標記，回傳跟 JPEG 分支相同形狀的欄位。
function _readPngExifTags(dataView, result) {
  var exifView = null;

  _pngChunkWalker(dataView, function (type, chunkStart, dataStart, dataLength, chunkEnd) {
    if (type === 'eXIf' && !exifView && dataLength >= 8) {
      exifView = new DataView(dataView.buffer, dataView.byteOffset + dataStart, dataLength);
    } else if (type === 'iTXt') {
      var keyword = '';
      var limit = dataStart + dataLength;
      for (var i = dataStart; i < limit; i++) {
        var code = dataView.getUint8(i);
        if (code === 0) break; // keyword 是 null-terminated
        keyword += String.fromCharCode(code);
      }
      if (keyword === 'XML:com.adobe.xmp') {
        result.hasXMP = true;
      }
    }
  });

  if (exifView) {
    var tiffTags = _parseTiffTags(exifView);
    result.orientation = tiffTags.orientation;
    result.dateTimeOriginal = tiffTags.dateTimeOriginal;
    result.make = tiffTags.make;
    result.model = tiffTags.model;
    result.gpsLatitude = tiffTags.gpsLatitude;
    result.gpsLongitude = tiffTags.gpsLongitude;
    result.hasGPS = tiffTags.hasGPS;
  }

  return result;
}

// WebP（RIFF 容器）chunk 序列走訪器：從第 12 byte（RIFF header 8 bytes + "WEBP" 4 bytes
// 之後）開始，每個 chunk 是 4 bytes FourCC + 4 bytes little-endian 長度 + data，長度為奇數
// 時補 1 byte padding。對每個 chunk 呼叫 callback(fourcc, chunkStart, dataStart, dataLength, chunkEnd)。
function _riffChunkWalker(dataView, callback) {
  var length = dataView.byteLength;
  if (length < 12) return;
  var offset = 12;
  while (offset + 8 <= length) {
    var dataLength = dataView.getUint32(offset + 4, true); // RIFF chunk size 是 little-endian
    var dataStart = offset + 8;
    var dataEnd = dataStart + dataLength;
    var chunkEnd = dataEnd + (dataLength % 2 === 1 ? 1 : 0); // 奇數長度補 1 byte padding
    if (dataLength < 0 || chunkEnd > length) break; // malformed / truncated
    var fourcc = String.fromCharCode(
      dataView.getUint8(offset),
      dataView.getUint8(offset + 1),
      dataView.getUint8(offset + 2),
      dataView.getUint8(offset + 3)
    );
    callback(fourcc, offset, dataStart, dataLength, chunkEnd);
    offset = chunkEnd;
  }
}

function _isWebp(dataView) {
  return dataView.byteLength >= 12 &&
    dataView.getUint32(0, false) === 0x52494646 && // "RIFF"
    dataView.getUint32(8, false) === 0x57454250;    // "WEBP"
}

// readExifTags()/stripMetadataSegments() 目前認得的格式：JPEG／PNG／WebP。
// 呼叫端（例如 Day15）用這個判斷要不要把某個檔案當「支援清除」處理，
// 避免各自重複寫一份 magic bytes 判斷邏輯。
function isSupportedImageFormat(arrayBuffer) {
  if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer) || arrayBuffer.byteLength < 4) {
    return false;
  }
  var dataView = new DataView(arrayBuffer);
  if (_isPng(dataView) || _isWebp(dataView)) {
    return true;
  }
  return dataView.byteLength >= 2 && dataView.getUint16(0, false) === 0xFFD8;
}

// 讀取 WebP 的 EXIF chunk（完整 EXIF/TIFF blob）與 XMP chunk（FourCC 為 "XMP "，
// 含尾端空白），回傳跟 JPEG/PNG 分支相同形狀的欄位。
function _readWebpExifTags(dataView, result) {
  var exifView = null;

  _riffChunkWalker(dataView, function (fourcc, chunkStart, dataStart, dataLength, chunkEnd) {
    if (fourcc === 'EXIF' && !exifView && dataLength >= 8) {
      exifView = new DataView(dataView.buffer, dataView.byteOffset + dataStart, dataLength);
    } else if (fourcc === 'XMP ') {
      result.hasXMP = true;
    }
  });

  if (exifView) {
    var tiffTags = _parseTiffTags(exifView);
    result.orientation = tiffTags.orientation;
    result.dateTimeOriginal = tiffTags.dateTimeOriginal;
    result.make = tiffTags.make;
    result.model = tiffTags.model;
    result.gpsLatitude = tiffTags.gpsLatitude;
    result.gpsLongitude = tiffTags.gpsLongitude;
    result.hasGPS = tiffTags.hasGPS;
  }

  return result;
}

function readExifTags(arrayBuffer) {
  var result = {
    orientation: null,
    dateTimeOriginal: null,
    make: null,
    model: null,
    gpsLatitude: null,
    gpsLongitude: null,
    hasGPS: false,
    hasXMP: false
  };

  if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer) || arrayBuffer.byteLength < 4) {
    return result;
  }

  var dataView = new DataView(arrayBuffer);

  if (_isPng(dataView)) {
    return _readPngExifTags(dataView, result);
  }

  if (_isWebp(dataView)) {
    return _readWebpExifTags(dataView, result);
  }

  // Check JPEG SOI (0xFFD8)
  if (dataView.getUint16(0, false) !== 0xFFD8) {
    return result;
  }

  var offset = 2;
  var length = arrayBuffer.byteLength;
  var exifDataView = null;
  var tiffHeaderOffset = 0;

  while (offset + 4 <= length) {
    if (dataView.getUint8(offset) !== 0xFF) {
      break;
    }
    var marker = dataView.getUint8(offset + 1);
    // Ignore fill bytes 0xFF
    if (marker === 0xFF) {
      offset += 1;
      continue;
    }
    // Standalone markers without length: SOI(0xD8), EOI(0xD9), RST0-7(0xD0-0xD7), TEM(0x01)
    if (marker === 0xD8 || marker === 0xD9 || (marker >= 0xD0 && marker <= 0xD7) || marker === 0x01) {
      offset += 2;
      continue;
    }

    var segmentLength = dataView.getUint16(offset + 2, false);
    if (segmentLength < 2 || offset + 2 + segmentLength > length) {
      break;
    }

    // Check APP1 (0xE1)
    if (marker === 0xE1 && segmentLength >= 8) {
      // Check for Exif\0\0 header: 0x45, 0x78, 0x69, 0x66, 0x00, 0x00
      var isExif = dataView.getUint8(offset + 4) === 0x45 &&
                   dataView.getUint8(offset + 5) === 0x78 &&
                   dataView.getUint8(offset + 6) === 0x69 &&
                   dataView.getUint8(offset + 7) === 0x66 &&
                   dataView.getUint8(offset + 8) === 0x00 &&
                   dataView.getUint8(offset + 9) === 0x00;

      if (isExif && !exifDataView) {
        tiffHeaderOffset = offset + 10;
        var tiffLength = segmentLength - 8;
        if (tiffHeaderOffset + tiffLength <= length && tiffLength >= 8) {
          exifDataView = new DataView(arrayBuffer, tiffHeaderOffset, tiffLength);
        }
      }

      // Check for XMP: http://ns.adobe.com/xap/1.0/
      var xmpSignature = 'http://ns.adobe.com/xap/1.0/';
      if (segmentLength >= 4 + xmpSignature.length) {
        var matchXMP = true;
        for (var i = 0; i < xmpSignature.length; i++) {
          if (dataView.getUint8(offset + 4 + i) !== xmpSignature.charCodeAt(i)) {
            matchXMP = false;
            break;
          }
        }
        if (matchXMP) {
          result.hasXMP = true;
        }
      }
    }

    // SOS (Start of Scan 0xDA) marks beginning of image data, segments end here
    if (marker === 0xDA) {
      break;
    }

    offset += 2 + segmentLength;
  }

  if (!exifDataView) {
    return result;
  }

  var tiffTags = _parseTiffTags(exifDataView);
  result.orientation = tiffTags.orientation;
  result.dateTimeOriginal = tiffTags.dateTimeOriginal;
  result.make = tiffTags.make;
  result.model = tiffTags.model;
  result.gpsLatitude = tiffTags.gpsLatitude;
  result.gpsLongitude = tiffTags.gpsLongitude;
  result.hasGPS = tiffTags.hasGPS;

  return result;
}

// 移除 PNG 的 eXIf chunk 與 XMP iTXt chunk，其餘 chunk（含各自的 CRC32）原樣保留、
// 不重算、不重組——因為是整個 chunk 跳過而非修改內容，其餘 chunk 的 CRC32 本來就沒變。
function _stripPngMetadata(arrayBuffer, dataView) {
  var length = arrayBuffer.byteLength;
  var keptChunks = [];
  var lastKeptEnd = 8; // Keep PNG signature (first 8 bytes)
  var modified = false;

  _pngChunkWalker(dataView, function (type, chunkStart, dataStart, dataLength, chunkEnd) {
    var isXmpText = false;
    if (type === 'iTXt') {
      var keyword = '';
      var limit = dataStart + dataLength;
      for (var i = dataStart; i < limit; i++) {
        var code = dataView.getUint8(i);
        if (code === 0) break;
        keyword += String.fromCharCode(code);
      }
      isXmpText = (keyword === 'XML:com.adobe.xmp');
    }

    if (type === 'eXIf' || isXmpText) {
      modified = true;
      if (chunkStart > lastKeptEnd) {
        keptChunks.push(new Uint8Array(arrayBuffer, lastKeptEnd, chunkStart - lastKeptEnd));
      }
      lastKeptEnd = chunkEnd;
    }
  });

  if (!modified) {
    return arrayBuffer;
  }

  if (lastKeptEnd < length) {
    keptChunks.push(new Uint8Array(arrayBuffer, lastKeptEnd, length - lastKeptEnd));
  }

  var totalLength = 8; // PNG signature
  for (var c = 0; c < keptChunks.length; c++) {
    totalLength += keptChunks[c].byteLength;
  }

  var newBuffer = new ArrayBuffer(totalLength);
  var outView = new Uint8Array(newBuffer);
  outView.set(new Uint8Array(arrayBuffer, 0, 8), 0); // copy PNG signature

  var currentPos = 8;
  for (var k = 0; k < keptChunks.length; k++) {
    outView.set(keptChunks[k], currentPos);
    currentPos += keptChunks[k].byteLength;
  }

  return newBuffer;
}

// WebP VP8X chunk 的 flags byte（chunk data 的第 1 個 byte）裡，bit3 是 Exif 存在旗標
// （0x08），bit2 是 XMP 存在旗標（0x04）。移除 EXIF/XMP chunk 後，若還留著 VP8X（它同時
// 帶 canvas 尺寸與 Alpha/Animation 旗標，這兩者本次不動，所以整個 VP8X chunk 不能刪），
// 就要把這兩個旗標位元清掉，否則解碼器會依照旗標去找一個已經不存在的 chunk。
var _WEBP_VP8X_EXIF_XMP_MASK = 0x08 | 0x04;

function _stripWebpMetadata(arrayBuffer, dataView) {
  var length = arrayBuffer.byteLength;
  var pieces = [];
  var lastKeptEnd = 12; // after "RIFF" + size(4) + "WEBP"
  var metadataRemoved = false;
  var vp8xFlagsPieceIndex = null;

  _riffChunkWalker(dataView, function (fourcc, chunkStart, dataStart, dataLength, chunkEnd) {
    if (fourcc === 'VP8X' && dataLength >= 1) {
      // 把 flags byte 切成獨立一塊，方便之後直接覆寫，不用另外算它在輸出 buffer 裡的位移
      if (dataStart > lastKeptEnd) {
        pieces.push(new Uint8Array(arrayBuffer, lastKeptEnd, dataStart - lastKeptEnd));
      }
      vp8xFlagsPieceIndex = pieces.length;
      pieces.push(new Uint8Array([dataView.getUint8(dataStart)]));
      lastKeptEnd = dataStart + 1;
      return;
    }
    if (fourcc === 'EXIF' || fourcc === 'XMP ') {
      metadataRemoved = true;
      if (chunkStart > lastKeptEnd) {
        pieces.push(new Uint8Array(arrayBuffer, lastKeptEnd, chunkStart - lastKeptEnd));
      }
      lastKeptEnd = chunkEnd;
    }
  });

  if (!metadataRemoved) {
    return arrayBuffer;
  }

  if (lastKeptEnd < length) {
    pieces.push(new Uint8Array(arrayBuffer, lastKeptEnd, length - lastKeptEnd));
  }

  if (vp8xFlagsPieceIndex !== null) {
    pieces[vp8xFlagsPieceIndex] = new Uint8Array([
      pieces[vp8xFlagsPieceIndex][0] & ~_WEBP_VP8X_EXIF_XMP_MASK
    ]);
  }

  var bodyLength = 4; // "WEBP"
  for (var c = 0; c < pieces.length; c++) {
    bodyLength += pieces[c].byteLength;
  }

  var newBuffer = new ArrayBuffer(8 + bodyLength);
  var outView = new Uint8Array(newBuffer);
  var outDataView = new DataView(newBuffer);
  outView[0] = 0x52; outView[1] = 0x49; outView[2] = 0x46; outView[3] = 0x46; // "RIFF"
  outDataView.setUint32(4, bodyLength, true); // RIFF size field 是 little-endian
  outView[8] = 0x57; outView[9] = 0x45; outView[10] = 0x42; outView[11] = 0x50; // "WEBP"

  var currentPos = 12;
  for (var k = 0; k < pieces.length; k++) {
    outView.set(pieces[k], currentPos);
    currentPos += pieces[k].byteLength;
  }

  return newBuffer;
}

function stripMetadataSegments(arrayBuffer) {
  if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer) || arrayBuffer.byteLength < 4) {
    return arrayBuffer;
  }

  var dataView = new DataView(arrayBuffer);

  if (_isPng(dataView)) {
    return _stripPngMetadata(arrayBuffer, dataView);
  }

  if (_isWebp(dataView)) {
    return _stripWebpMetadata(arrayBuffer, dataView);
  }

  // If not JPEG SOI (0xFFD8), return as-is
  if (dataView.getUint16(0, false) !== 0xFFD8) {
    return arrayBuffer;
  }

  var length = arrayBuffer.byteLength;
  var offset = 2;
  var keptChunks = [];
  var lastKeptEnd = 2; // Keep SOI (first 2 bytes)
  var modified = false;

  var xmpSignature = 'http://ns.adobe.com/xap/1.0/';

  // Entropy-coded scan data (after SOS) uses byte stuffing: any literal
  // 0xFF byte inside the compressed data is followed by 0x00, and restart
  // markers (0xD0-0xD7) are also legal inside the stream. A 0xFF followed by
  // anything else is the real start of the next marker segment. Real-world
  // JPEGs (esp. from iPhones) can have a second, fully-formed JPEG
  // (SOI...EOI, with its own APP1 Exif/XMP segments) appended after the
  // primary image's entropy data - this walks past the entropy data without
  // touching it, so the main marker-scanning loop can continue into
  // whatever segments follow, including nested JPEG structures.
  function findEntropyDataEnd(startOffset) {
    var p = startOffset;
    while (p < length) {
      if (dataView.getUint8(p) === 0xFF) {
        if (p + 1 >= length) {
          return length;
        }
        var nextByte = dataView.getUint8(p + 1);
        if (nextByte === 0x00 || (nextByte >= 0xD0 && nextByte <= 0xD7)) {
          // Stuffed literal 0xFF, or a restart marker: still scan data.
          p += 2;
          continue;
        }
        if (nextByte === 0xFF) {
          // Fill byte before the real marker; keep looking.
          p += 1;
          continue;
        }
        // Real marker segment starts here.
        return p;
      }
      p += 1;
    }
    return length;
  }

  while (offset + 4 <= length) {
    if (dataView.getUint8(offset) !== 0xFF) {
      break;
    }
    var marker = dataView.getUint8(offset + 1);
    if (marker === 0xFF) {
      offset += 1;
      continue;
    }
    if (marker === 0xD8 || marker === 0xD9 || (marker >= 0xD0 && marker <= 0xD7) || marker === 0x01) {
      offset += 2;
      continue;
    }

    var segmentLength = dataView.getUint16(offset + 2, false);
    if (segmentLength < 2 || offset + 2 + segmentLength > length) {
      break;
    }

    var shouldStrip = false;

    // Check APP1 (0xE1)
    if (marker === 0xE1 && segmentLength >= 8) {
      // Exif check
      var isExif = dataView.getUint8(offset + 4) === 0x45 &&
                   dataView.getUint8(offset + 5) === 0x78 &&
                   dataView.getUint8(offset + 6) === 0x69 &&
                   dataView.getUint8(offset + 7) === 0x66 &&
                   dataView.getUint8(offset + 8) === 0x00 &&
                   dataView.getUint8(offset + 9) === 0x00;

      if (isExif) {
        shouldStrip = true;
      }

      // XMP check
      if (!shouldStrip && segmentLength >= 4 + xmpSignature.length) {
        var matchXMP = true;
        for (var i = 0; i < xmpSignature.length; i++) {
          if (dataView.getUint8(offset + 4 + i) !== xmpSignature.charCodeAt(i)) {
            matchXMP = false;
            break;
          }
        }
        if (matchXMP) {
          shouldStrip = true;
        }
      }
    }

    if (shouldStrip) {
      modified = true;
      if (offset > lastKeptEnd) {
        keptChunks.push(new Uint8Array(arrayBuffer, lastKeptEnd, offset - lastKeptEnd));
      }
      lastKeptEnd = offset + 2 + segmentLength;
    }

    // SOS: entropy-coded data follows. Skip over it (without touching it)
    // using byte-stuffing rules, then keep scanning for more marker
    // segments - there may be a nested second JPEG structure appended
    // after this one's entropy data (e.g. iPhone embedded preview images).
    if (marker === 0xDA) {
      offset = findEntropyDataEnd(offset + 2 + segmentLength);
      continue;
    }

    offset += 2 + segmentLength;
  }

  if (!modified) {
    return arrayBuffer;
  }

  if (lastKeptEnd < length) {
    keptChunks.push(new Uint8Array(arrayBuffer, lastKeptEnd, length - lastKeptEnd));
  }

  // Prepend SOI chunk if not included
  var totalLength = 2; // for SOI
  for (var c = 0; c < keptChunks.length; c++) {
    totalLength += keptChunks[c].byteLength;
  }

  var newBuffer = new ArrayBuffer(totalLength);
  var outView = new Uint8Array(newBuffer);
  outView[0] = 0xFF;
  outView[1] = 0xD8;

  var currentPos = 2;
  for (var k = 0; k < keptChunks.length; k++) {
    outView.set(keptChunks[k], currentPos);
    currentPos += keptChunks[k].byteLength;
  }

  return newBuffer;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    readExifTags: readExifTags,
    stripMetadataSegments: stripMetadataSegments,
    isSupportedImageFormat: isSupportedImageFormat,
    // 內部函式：僅供測資驗證腳本使用，正式呼叫端一律走上面兩個公開函式
    _parseTiffTags: _parseTiffTags,
    _pngChunkWalker: _pngChunkWalker,
    _isPng: _isPng,
    _readPngExifTags: _readPngExifTags,
    _stripPngMetadata: _stripPngMetadata,
    _riffChunkWalker: _riffChunkWalker,
    _isWebp: _isWebp,
    _readWebpExifTags: _readWebpExifTags,
    _stripWebpMetadata: _stripWebpMetadata
  };
}
