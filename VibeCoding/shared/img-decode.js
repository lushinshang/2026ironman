// shared/img-decode.js

// Tiny 2x1 real JPEG (EXIF Orientation=6, distinct width/height so a swap
// is observable) used to self-test whether this browser's
// createImageBitmap({imageOrientation:'none'}) actually returns the raw,
// un-rotated pixels. Verified against real browsers (2026-08): Chromium 141,
// Firefox 142 and WebKit 26 all ACCEPT the option without error but SILENTLY
// IGNORE it and still auto-apply EXIF rotation (bitmap comes back rotated,
// same as calling createImageBitmap() with no options at all). Because
// feature-detecting the option's mere existence would be wrong on every
// current engine, this probe measures actual behavior instead.
var IMG_DECODE_ORIENTATION_PROBE_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAYAAAAAAAD/2wBD' +
  'AAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYU' +
  'GBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU' +
  'FBQUFBQUFBQUFBQUFBT/wAARCAABAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQF' +
  'BgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAk' +
  'M2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWG' +
  'h4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx' +
  '8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQA' +
  'AQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5' +
  'OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmq' +
  'srO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDo' +
  'vBn/ACJ+hf8AXhB/6LWiiiv4mr/xZ+r/ADP4J4p/5H+P/wCv1X/0uR//2Q==';

// Memoized (module-scope) detection result: true if
// createImageBitmap(blob, {imageOrientation:'none'}) genuinely returns
// un-rotated pixels on this browser; false if it silently auto-rotates
// anyway (current behavior on all major engines as of 2026-08); null if not
// yet tested. Cached as a Promise so concurrent loadImageFile() calls share
// one probe decode instead of racing multiple probes.
var _imgDecodeRawBitmapSupportPromise = null;

function _imgDecodeDetectRawBitmapSupport() {
  if (_imgDecodeRawBitmapSupportPromise) {
    return _imgDecodeRawBitmapSupportPromise;
  }
  if (typeof createImageBitmap !== 'function') {
    _imgDecodeRawBitmapSupportPromise = Promise.resolve(false);
    return _imgDecodeRawBitmapSupportPromise;
  }
  _imgDecodeRawBitmapSupportPromise = Promise.resolve().then(function () {
    var binary = atob(IMG_DECODE_ORIENTATION_PROBE_JPEG_BASE64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    var probeBlob = new Blob([bytes], { type: 'image/jpeg' });
    return createImageBitmap(probeBlob, { imageOrientation: 'none' }).then(function (bmp) {
      // Raw (un-rotated) probe is 2 wide x 1 tall. If 'none' were honored,
      // the bitmap must still be 2x1. If the browser rotated it anyway
      // (per Orientation=6), it comes back 1x2.
      var supported = (bmp.width === 2 && bmp.height === 1);
      if (typeof bmp.close === 'function') {
        bmp.close();
      }
      return supported;
    }).catch(function () {
      return false;
    });
  }).catch(function () {
    return false;
  });
  return _imgDecodeRawBitmapSupportPromise;
}

function loadImageFile(file, opts) {
  opts = opts || {};
  return new Promise(function (resolve, reject) {
    if (!file) {
      return reject(new Error('No file provided'));
    }

    var mimeType = file.type || 'image/jpeg';
    var reader = new FileReader();

    reader.onerror = function () {
      reject(new Error('Failed to read file'));
    };

    reader.onload = function () {
      var arrayBuffer = reader.result;
      var orientation = 1;
      try {
        if (typeof readExifTags === 'function') {
          var exif = readExifTags(arrayBuffer);
          if (exif && exif.orientation) {
            orientation = exif.orientation;
          }
        }
      } catch (e) {
        orientation = 1;
      }

      var blob = new Blob([arrayBuffer], { type: mimeType });

      // drawSource: draws either an ImageBitmap (unrotated raw pixels, when
      // createImageBitmap({imageOrientation:'none'}) is available) or a plain
      // <img> element (browsers auto-apply EXIF orientation when decoding to
      // <img>, so in that fallback path we must NOT re-apply orientation
      // ourselves - ctxOrientation is forced to 1 for that case).
      function drawSource(source, ctxOrientation, cleanup) {
        var origW = source.naturalWidth || source.width;
        var origH = source.naturalHeight || source.height;
        var orientation = ctxOrientation;

        var isSwapped = (orientation >= 5 && orientation <= 8);
        var rotatedW = isSwapped ? origH : origW;
        var rotatedH = isSwapped ? origW : origH;

        var targetW = rotatedW;
        var targetH = rotatedH;

        if (opts.maxDimension && opts.maxDimension > 0) {
          var maxSide = Math.max(rotatedW, rotatedH);
          if (maxSide > opts.maxDimension) {
            var scale = opts.maxDimension / maxSide;
            targetW = Math.max(1, Math.round(rotatedW * scale));
            targetH = Math.max(1, Math.round(rotatedH * scale));
          }
        }

        var canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        var ctx = canvas.getContext('2d');

        var scaleX = targetW / rotatedW;
        var scaleY = targetH / rotatedH;

        ctx.save();
        ctx.scale(scaleX, scaleY);

        switch (orientation) {
          case 2: // Horizontal flip
            ctx.translate(rotatedW, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(source, 0, 0);
            break;
          case 3: // 180 rotate
            ctx.translate(rotatedW, rotatedH);
            ctx.rotate(Math.PI);
            ctx.drawImage(source, 0, 0);
            break;
          case 4: // Vertical flip
            ctx.translate(0, rotatedH);
            ctx.scale(1, -1);
            ctx.drawImage(source, 0, 0);
            break;
          case 5: // Transpose
            ctx.rotate(0.5 * Math.PI);
            ctx.scale(1, -1);
            ctx.drawImage(source, 0, 0);
            break;
          case 6: // 90 CW rotate
            ctx.translate(rotatedW, 0);
            ctx.rotate(0.5 * Math.PI);
            ctx.drawImage(source, 0, 0);
            break;
          case 7: // Transverse
            ctx.translate(rotatedW, rotatedH);
            ctx.rotate(0.5 * Math.PI);
            ctx.scale(1, -1);
            ctx.drawImage(source, 0, 0);
            break;
          case 8: // 270 CW (90 CCW) rotate
            ctx.translate(0, rotatedH);
            ctx.rotate(-0.5 * Math.PI);
            ctx.drawImage(source, 0, 0);
            break;
          default: // 1 or others (Normal)
            ctx.drawImage(source, 0, 0);
            break;
        }

        ctx.restore();

        if (cleanup) {
          cleanup();
        }

        resolve({
          canvas: canvas,
          width: targetW,
          height: targetH,
          mimeType: mimeType,
          orientationApplied: orientation
        });
      }

      // Fallback path: decode via <img> element. Browsers auto-apply EXIF
      // orientation when decoding JPEG into an <img> (CSS image-orientation
      // default is 'from-image'), so naturalWidth/naturalHeight and the
      // painted pixels are ALREADY orientation-corrected. Passing the real
      // EXIF orientation into drawSource here would double-apply the
      // transform - so this path always draws with ctxOrientation = 1.
      function loadViaImgElement() {
        var blobUrl = URL.createObjectURL(blob);
        var img = new Image();

        img.onerror = function () {
          URL.revokeObjectURL(blobUrl);
          reject(new Error('Failed to load image element'));
        };

        img.onload = function () {
          drawSource(img, 1, function () {
            URL.revokeObjectURL(blobUrl);
          });
        };

        img.src = blobUrl;
      }

      if (typeof createImageBitmap === 'function') {
        _imgDecodeDetectRawBitmapSupport().then(function (rawBitmapSupported) {
          if (!rawBitmapSupported) {
            // This browser accepts {imageOrientation:'none'} but ignores it
            // (auto-rotates anyway) - decoding via createImageBitmap here
            // would double-apply orientation just like the old <img> bug.
            // Fall back to the <img> path, which is known-correct for
            // browser-auto-rotated sources (ctxOrientation forced to 1).
            loadViaImgElement();
            return;
          }
          createImageBitmap(blob, { imageOrientation: 'none' }).then(function (bitmap) {
            drawSource(bitmap, orientation, function () {
              if (typeof bitmap.close === 'function') {
                bitmap.close();
              }
            });
          }).catch(function () {
            // Failed to decode this specific file - fall back to <img>.
            loadViaImgElement();
          });
        }).catch(function () {
          loadViaImgElement();
        });
      } else {
        loadViaImgElement();
      }
    };

    reader.readAsArrayBuffer(file);
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadImageFile: loadImageFile
  };
}
