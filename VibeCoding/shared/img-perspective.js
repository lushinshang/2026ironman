// shared/img-perspective.js

function solveHomography(srcQuad, dstQuad) {
  if (!srcQuad || srcQuad.length !== 4 || !dstQuad || dstQuad.length !== 4) {
    throw new Error('Both srcQuad and dstQuad must have 4 points [x, y]');
  }

  // 8x8 system: A * h = B
  var A = [];
  var B = [];

  for (var i = 0; i < 4; i++) {
    var x = srcQuad[i][0];
    var y = srcQuad[i][1];
    var u = dstQuad[i][0];
    var v = dstQuad[i][1];

    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    B.push(u);

    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    B.push(v);
  }

  // Gaussian elimination with partial pivoting
  var n = 8;
  for (var k = 0; k < n; k++) {
    // Find pivot
    var maxRow = k;
    var maxVal = Math.abs(A[k][k]);
    for (var r = k + 1; r < n; r++) {
      if (Math.abs(A[r][k]) > maxVal) {
        maxVal = Math.abs(A[r][k]);
        maxRow = r;
      }
    }

    if (maxVal < 1e-10) {
      throw new Error('Singular matrix: points may be collinear');
    }

    // Swap rows
    if (maxRow !== k) {
      var tmpA = A[k]; A[k] = A[maxRow]; A[maxRow] = tmpA;
      var tmpB = B[k]; B[k] = B[maxRow]; B[maxRow] = tmpB;
    }

    // Eliminate below
    for (var row = k + 1; row < n; row++) {
      var factor = A[row][k] / A[k][k];
      B[row] -= factor * B[k];
      for (var col = k; col < n; col++) {
        A[row][col] -= factor * A[k][col];
      }
    }
  }

  // Back substitution
  var h = new Array(8);
  for (var i8 = n - 1; i8 >= 0; i8--) {
    var sum = B[i8];
    for (var j = i8 + 1; j < n; j++) {
      sum -= A[i8][j] * h[j];
    }
    h[i8] = sum / A[i8][i8];
  }

  // Return row-major 3x3 matrix [h00, h01, h02, h10, h11, h12, h20, h21, 1]
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1.0];
}

function invertHomography(H) {
  var a = H[0], b = H[1], c = H[2];
  var d = H[3], e = H[4], f = H[5];
  var g = H[6], h = H[7], i = H[8];

  var A = (e * i - f * h);
  var B = -(d * i - f * g);
  var C = (d * h - e * g);
  var D = -(b * i - c * h);
  var E = (a * i - c * g);
  var F = -(a * h - b * g);
  var G = (b * f - c * e);
  var H_adj = -(a * f - c * d);
  var I = (a * e - b * d);

  var det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) {
    throw new Error('Matrix is not invertible');
  }

  var invDet = 1.0 / det;
  return [
    A * invDet, D * invDet, G * invDet,
    B * invDet, E * invDet, H_adj * invDet,
    C * invDet, F * invDet, I * invDet
  ];
}

function warpImageData(sourceImageData, inverseHomography, outWidth, outHeight) {
  if (!sourceImageData || !sourceImageData.data) {
    throw new Error('sourceImageData is required');
  }
  if (!inverseHomography || inverseHomography.length !== 9) {
    throw new Error('inverseHomography 3x3 matrix is required');
  }

  outWidth = Math.round(outWidth);
  outHeight = Math.round(outHeight);

  var srcW = sourceImageData.width;
  var srcH = sourceImageData.height;
  var srcData = sourceImageData.data;

  var outData;
  if (typeof ImageData !== 'undefined') {
    outData = new ImageData(outWidth, outHeight);
  } else {
    outData = {
      width: outWidth,
      height: outHeight,
      data: new Uint8ClampedArray(outWidth * outHeight * 4)
    };
  }

  var dstData = outData.data;

  var h0 = inverseHomography[0], h1 = inverseHomography[1], h2 = inverseHomography[2];
  var h3 = inverseHomography[3], h4 = inverseHomography[4], h5 = inverseHomography[5];
  var h6 = inverseHomography[6], h7 = inverseHomography[7], h8 = inverseHomography[8];

  var outIdx = 0;
  for (var y = 0; y < outHeight; y++) {
    for (var x = 0; x < outWidth; x++) {
      var w = h6 * x + h7 * y + h8;
      if (Math.abs(w) < 1e-10) {
        outIdx += 4;
        continue;
      }
      var invW = 1.0 / w;
      var srcX = (h0 * x + h1 * y + h2) * invW;
      var srcY = (h3 * x + h4 * y + h5) * invW;

      var x0 = Math.floor(srcX);
      var y0 = Math.floor(srcY);
      var x1 = x0 + 1;
      var y1 = y0 + 1;

      if (x0 >= 0 && x1 < srcW && y0 >= 0 && y1 < srcH) {
        var wx1 = srcX - x0;
        var wx0 = 1.0 - wx1;
        var wy1 = srcY - y0;
        var wy0 = 1.0 - wy1;

        var w00 = wx0 * wy0;
        var w01 = wx1 * wy0;
        var w10 = wx0 * wy1;
        var w11 = wx1 * wy1;

        var idx00 = (y0 * srcW + x0) * 4;
        var idx01 = (y0 * srcW + x1) * 4;
        var idx10 = (y1 * srcW + x0) * 4;
        var idx11 = (y1 * srcW + x1) * 4;

        dstData[outIdx]     = (srcData[idx00] * w00 + srcData[idx01] * w01 + srcData[idx10] * w10 + srcData[idx11] * w11);
        dstData[outIdx + 1] = (srcData[idx00 + 1] * w00 + srcData[idx01 + 1] * w01 + srcData[idx10 + 1] * w10 + srcData[idx11 + 1] * w11);
        dstData[outIdx + 2] = (srcData[idx00 + 2] * w00 + srcData[idx01 + 2] * w01 + srcData[idx10 + 2] * w10 + srcData[idx11 + 2] * w11);
        dstData[outIdx + 3] = (srcData[idx00 + 3] * w00 + srcData[idx01 + 3] * w01 + srcData[idx10 + 3] * w10 + srcData[idx11 + 3] * w11);
      } else if (x0 >= 0 && x0 < srcW && y0 >= 0 && y0 < srcH) {
        // Nearest neighbor fallback at boundary
        var idx = (y0 * srcW + x0) * 4;
        dstData[outIdx]     = srcData[idx];
        dstData[outIdx + 1] = srcData[idx + 1];
        dstData[outIdx + 2] = srcData[idx + 2];
        dstData[outIdx + 3] = srcData[idx + 3];
      }
      // Out of bounds remains 0 (transparent)

      outIdx += 4;
    }
  }

  return outData;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    solveHomography: solveHomography,
    invertHomography: invertHomography,
    warpImageData: warpImageData
  };
}
