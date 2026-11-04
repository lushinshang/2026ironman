// shared/img-canvas.js

function resizeCanvas(sourceCanvas, opts) {
  opts = opts || {};
  if (!sourceCanvas) {
    throw new Error('sourceCanvas is required');
  }

  var srcW = sourceCanvas.width;
  var srcH = sourceCanvas.height;
  var maxLongEdge = opts.maxLongEdge;
  var allowUpscale = opts.allowUpscale === true;

  var targetW = srcW;
  var targetH = srcH;

  if (maxLongEdge && maxLongEdge > 0) {
    var longEdge = Math.max(srcW, srcH);
    if (longEdge > maxLongEdge || (longEdge < maxLongEdge && allowUpscale)) {
      var scale = maxLongEdge / longEdge;
      targetW = Math.max(1, Math.round(srcW * scale));
      targetH = Math.max(1, Math.round(srcH * scale));
    }
  }

  var outCanvas = document.createElement('canvas');
  outCanvas.width = targetW;
  outCanvas.height = targetH;
  var ctx = outCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, 0, 0, targetW, targetH);

  return outCanvas;
}

function canvasToBlob(canvas, mimeType, quality) {
  mimeType = mimeType || 'image/jpeg';
  if (quality === undefined) {
    quality = 0.92;
  }

  return new Promise(function (resolve, reject) {
    if (!canvas || typeof canvas.toBlob !== 'function') {
      return reject(new Error('Invalid canvas'));
    }
    canvas.toBlob(function (blob) {
      if (!blob) {
        return reject(new Error('canvas.toBlob returned null'));
      }
      resolve(blob);
    }, mimeType, quality);
  });
}

function compressToTargetSize(canvas, opts) {
  opts = opts || {};
  var targetBytes = opts.targetBytes;
  var mimeType = opts.mimeType || 'image/jpeg';
  var maxIterations = opts.maxIterations || 8;

  if (!canvas) {
    return Promise.reject(new Error('Canvas is required'));
  }
  if (!targetBytes || targetBytes <= 0) {
    return Promise.reject(new Error('targetBytes must be positive'));
  }
  if (mimeType === 'image/png') {
    return Promise.reject(new Error('PNG 不支援目標容量壓縮'));
  }

  return new Promise(function (resolve, reject) {
    var currentCanvas = canvas;
    var dimensionRounds = 0;
    var maxDimensionRounds = 3;
    var totalIterations = 0;
    var bestBlob = null;
    var bestQuality = 0.5;

    function runRound() {
      var low = 0.1;
      var high = 0.95;
      var roundBestBlob = null;
      var roundBestQuality = low;
      var roundIter = 0;

      function binaryStep() {
        if (roundIter >= maxIterations || (high - low) < 0.02) {
          if (roundBestBlob && roundBestBlob.size <= targetBytes) {
            return resolve({
              blob: roundBestBlob,
              quality: roundBestQuality,
              achieved: true,
              iterations: totalIterations
            });
          }

          // If not achieved in this round, check if we can reduce dimensions
          if (dimensionRounds < maxDimensionRounds) {
            dimensionRounds++;
            var curLongEdge = Math.max(currentCanvas.width, currentCanvas.height);
            var newLongEdge = Math.max(32, Math.round(curLongEdge * 0.7));
            currentCanvas = resizeCanvas(currentCanvas, { maxLongEdge: newLongEdge, allowUpscale: false });
            return runRound();
          } else {
            // Failed after all rounds, return closest blob
            return resolve({
              blob: bestBlob || roundBestBlob,
              quality: bestQuality || roundBestQuality,
              achieved: false,
              iterations: totalIterations
            });
          }
        }

        var mid = (low + high) / 2;
        roundIter++;
        totalIterations++;

        canvasToBlob(currentCanvas, mimeType, mid).then(function (blob) {
          if (!bestBlob || Math.abs(blob.size - targetBytes) < Math.abs(bestBlob.size - targetBytes) || blob.size <= targetBytes) {
            bestBlob = blob;
            bestQuality = mid;
          }

          if (blob.size <= targetBytes) {
            roundBestBlob = blob;
            roundBestQuality = mid;
            // Can try higher quality
            low = mid;
          } else {
            // Oversized, need lower quality
            high = mid;
          }
          binaryStep();
        }).catch(reject);
      }

      binaryStep();
    }

    runRound();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    resizeCanvas: resizeCanvas,
    canvasToBlob: canvasToBlob,
    compressToTargetSize: compressToTargetSize
  };
}
