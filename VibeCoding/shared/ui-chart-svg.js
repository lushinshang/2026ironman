// shared/ui-chart-svg.js — 手寫 SVG 圖表模組（Bar／Line／Pie），不依賴任何 library、不碰 DOM。
// 由 Day12（csv-pivot-dashboard 下篇）建立，見 CSV_CONTRACT.md 第 6.2 節。
// 對外介面：renderBarChart(series, opts) / renderLineChart(series, opts) / renderPieChart(series, opts)
// series: { label: string, value: number }[]（value 必為有限數，呼叫端負責過濾）
// opts:   { width, height, valueFormat, maxPieSlices, title } 皆選填

// ---------- B1 座標映射常數 ----------

var CHART_PAD = { top: 24, right: 24, bottom: 72, left: 72 };
var CHART_DEFAULT_WIDTH = 800;
var CHART_DEFAULT_HEIGHT = 400;
var CHART_FONT_SIZE = 12;

// ---------- B4 色盤（Okabe–Ito 色盲友善色盤 7 色 + 1 補色，共 8 色；灰色不進循環） ----------

var CHART_COLORS = [
  '#0072B2', '#E69F00', '#009E73', '#CC79A7',
  '#56B4E9', '#D55E00', '#F0E442', '#7F3C8D'
];
var CHART_GRAY = '#999999';
var CHART_PRIMARY = '#0072B2'; // Bar/Line 只有一個 Measure，全部同色

// ---------- B2 軸刻度取整（Heckbert nice numbers） ----------

function niceNum(x, round) {
  var exp = Math.floor(Math.log10(x));
  var f = x / Math.pow(10, exp);
  var nf;
  if (round) {
    nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  } else {
    nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  }
  return nf * Math.pow(10, exp);
}

function niceScale(dataMin, dataMax, n) {
  n = n || 5;
  var range = niceNum(dataMax - dataMin, false);
  var step = niceNum(range / (n - 1), true);
  var niceMin = Math.floor(dataMin / step) * step;
  var niceMax = Math.ceil(dataMax / step) * step;
  var count = Math.round((niceMax - niceMin) / step);
  var ticks = [];
  for (var i = 0; i <= count; i++) {
    ticks.push(Number((niceMin + i * step).toFixed(10)));
  }
  return ticks;
}

function safeRange(mn, mx) {
  if (mx - mn === 0) {
    return [mn - 1, mx + 1];
  }
  return [mn, mx];
}

function formatTick(v, decimals) {
  return new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(v);
}

// ---------- B3 標籤重疊（截斷／旋轉／抽稀決策鏈，fontSize 固定 12） ----------

function estimateCharWidth(ch) {
  return ch.codePointAt(0) > 0x2E80 ? 12 : 7.2;
}

function estimateLabelWidth(text) {
  var chars = Array.from(String(text));
  var w = 0;
  for (var i = 0; i < chars.length; i++) w += estimateCharWidth(chars[i]);
  return w;
}

function truncateLabel(label) {
  var text = String(label);
  var chars = Array.from(text);
  if (chars.length > 12) {
    return { text: chars.slice(0, 11).join('') + '…', full: text, truncated: true };
  }
  return { text: text, full: text, truncated: false };
}

// labels: string[]；決策以「截斷後最長標籤的估寬」為準，套用同一個 mode 到整組軸標籤
function decideLabelLayout(labels, B, fontSize) {
  fontSize = fontSize || CHART_FONT_SIZE;
  var truncated = labels.map(truncateLabel);
  var maxW = 0;
  truncated.forEach(function (t) {
    var w = estimateLabelWidth(t.text);
    if (w > maxW) maxW = w;
  });

  if (maxW <= B - 4) {
    return { mode: 'horizontal', k: 1, truncated: truncated };
  }
  if (B >= fontSize * 1.2) {
    return { mode: 'rotate', k: 1, truncated: truncated };
  }
  var k = Math.ceil((fontSize * 1.2) / B);
  return { mode: 'thin', k: k, truncated: truncated };
}

// ---------- SVG 字串組裝 ----------

function svgOpen(width, height) {
  return '<div style="overflow-x:auto"><svg width="' + width + '" height="' + height +
    '" viewBox="0 0 ' + width + ' ' + height +
    '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">';
}

function svgClose() {
  return '</svg></div>';
}

function chartEmptyHtml(message) {
  return '<div class="chart-empty">' + escapeHtml(message) + '</div>';
}

function appendXLabel(parts, layout, i, cx, axisY, fontSize, isBar) {
  var t = layout.truncated[i];
  var showLabel = layout.mode !== 'thin' || (i % layout.k === 0);
  if (!showLabel) {
    parts.push('<line x1="' + cx.toFixed(2) + '" y1="' + axisY.toFixed(2) + '" x2="' + cx.toFixed(2) +
      '" y2="' + (axisY + 4).toFixed(2) + '" stroke="#999999" stroke-width="1"/>');
    return;
  }
  var titleTag = t.truncated ? ('<title>' + escapeHtml(t.full) + '</title>') : '';
  if (layout.mode === 'horizontal') {
    parts.push('<text x="' + cx.toFixed(2) + '" y="' + (axisY + 16).toFixed(2) +
      '" font-size="' + fontSize + '" text-anchor="middle" fill="#333333">' +
      escapeHtml(t.text) + titleTag + '</text>');
  } else {
    var anchorX = cx;
    var anchorY = axisY + 8;
    parts.push('<text x="' + anchorX.toFixed(2) + '" y="' + anchorY.toFixed(2) +
      '" font-size="' + fontSize + '" text-anchor="end" fill="#333333" transform="rotate(-45 ' +
      anchorX.toFixed(2) + ' ' + anchorY.toFixed(2) + ')">' + escapeHtml(t.text) + titleTag + '</text>');
  }
}

function appendYAxis(parts, ticks, decimals, plotLeft, plotRight, fontSize, yFn) {
  ticks.forEach(function (t) {
    var ty = yFn(t);
    parts.push('<line x1="' + plotLeft.toFixed(2) + '" y1="' + ty.toFixed(2) +
      '" x2="' + plotRight.toFixed(2) + '" y2="' + ty.toFixed(2) +
      '" stroke="#e5e5e5" stroke-width="1"/>');
    parts.push('<text x="' + (plotLeft - 8).toFixed(2) + '" y="' + (ty + 4).toFixed(2) +
      '" font-size="' + fontSize + '" text-anchor="end" fill="#333333">' +
      escapeHtml(formatTick(t, decimals)) + '</text>');
  });
}

// ---------- renderBarChart ----------

function renderBarChart(series, opts) {
  opts = opts || {};
  series = (series || []).filter(function (s) {
    return typeof s.value === 'number' && Number.isFinite(s.value);
  });

  if (series.length === 0) {
    return chartEmptyHtml('沒有可繪製的資料。可能是 Filter 條件把所有列都排除了。');
  }

  var width = opts.width || CHART_DEFAULT_WIDTH;
  var height = opts.height || CHART_DEFAULT_HEIGHT;
  var plotW = width - CHART_PAD.left - CHART_PAD.right;
  var plotH = height - CHART_PAD.top - CHART_PAD.bottom;
  var fontSize = CHART_FONT_SIZE;

  var labels = series.map(function (s) { return String(s.label); });
  var values = series.map(function (s) { return s.value; });
  var hasNegative = values.some(function (v) { return v < 0; });
  var allZero = values.every(function (v) { return v === 0; });

  var ticks;
  if (allZero) {
    ticks = [0, 0.2, 0.4, 0.6, 0.8, 1];
  } else {
    // B2：Bar 圖 dataMin 一律夾到 min(0, 實際最小值)
    var dataMin = Math.min(0, Math.min.apply(null, values));
    var dataMax = Math.max(0, Math.max.apply(null, values));
    ticks = niceScale(dataMin, dataMax, 5);
  }

  var yMin = ticks[0], yMax = ticks[ticks.length - 1];
  var step = ticks[1] - ticks[0];
  var decimals = Math.max(0, -Math.floor(Math.log10(step)));

  function y(v) {
    return CHART_PAD.top + plotH * (yMax - v) / (yMax - yMin);
  }

  var n = series.length;
  var B = plotW / n;
  var barWidth = n === 1 ? Math.min(plotW / 3, 64) : Math.min(B * 0.7, 64);
  var axisY = CHART_PAD.top + plotH;

  var layout = decideLabelLayout(labels, B, fontSize);

  var parts = [];
  parts.push(svgOpen(width, height));

  appendYAxis(parts, ticks, decimals, CHART_PAD.left, width - CHART_PAD.right, fontSize, y);

  var zeroY = y(0);
  if (hasNegative) {
    parts.push('<line class="chart-zero-line" x1="' + CHART_PAD.left.toFixed(2) + '" y1="' + zeroY.toFixed(2) +
      '" x2="' + (width - CHART_PAD.right).toFixed(2) + '" y2="' + zeroY.toFixed(2) +
      '" stroke="#666666" stroke-width="1"/>');
  }

  series.forEach(function (s, i) {
    var cx = CHART_PAD.left + B * (i + 0.5);
    var bx = cx - barWidth / 2;
    var v = s.value;

    if (allZero) {
      parts.push('<rect x="' + bx.toFixed(2) + '" y="' + (zeroY - 2).toFixed(2) +
        '" width="' + barWidth.toFixed(2) + '" height="2" fill="' + CHART_PRIMARY + '">' +
        '<title>' + escapeHtml(labels[i]) + '</title></rect>');
    } else {
      var top = v >= 0 ? y(v) : zeroY;
      var bottom = v >= 0 ? zeroY : y(v);
      var rectY = Math.min(top, bottom);
      var rectH = Math.max(0, bottom - top);
      parts.push('<rect x="' + bx.toFixed(2) + '" y="' + rectY.toFixed(2) +
        '" width="' + barWidth.toFixed(2) + '" height="' + rectH.toFixed(2) + '" fill="' + CHART_PRIMARY + '">' +
        '<title>' + escapeHtml(labels[i]) + '：' + v + '</title></rect>');
    }

    appendXLabel(parts, layout, i, cx, axisY, fontSize, true);
  });

  parts.push(svgClose());

  var notes = [];
  if (allZero) notes.push('所有數值皆為 0');
  if (layout.mode === 'thin') notes.push('類別過多，每 ' + layout.k + ' 個顯示 1 個標籤');
  if (notes.length) parts.push('<div class="chart-note">' + escapeHtml(notes.join('；')) + '</div>');

  return parts.join('');
}

// ---------- renderLineChart ----------

function renderLineChart(series, opts) {
  opts = opts || {};
  series = (series || []).filter(function (s) {
    return typeof s.value === 'number' && Number.isFinite(s.value);
  });

  if (series.length === 0) {
    return chartEmptyHtml('沒有可繪製的資料。可能是 Filter 條件把所有列都排除了。');
  }

  var width = opts.width || CHART_DEFAULT_WIDTH;
  var height = opts.height || CHART_DEFAULT_HEIGHT;
  var plotW = width - CHART_PAD.left - CHART_PAD.right;
  var plotH = height - CHART_PAD.top - CHART_PAD.bottom;
  var fontSize = CHART_FONT_SIZE;

  var labels = series.map(function (s) { return String(s.label); });
  var values = series.map(function (s) { return s.value; });
  var n = series.length;

  // B5-2：單一資料點，畫圓點加水平虛線，不畫完整座標軸
  if (n === 1) {
    var val = values[0];
    var midY = CHART_PAD.top + plotH / 2;
    var cxp = CHART_PAD.left + plotW / 2;
    var p0 = [];
    p0.push(svgOpen(width, height));
    p0.push('<line x1="' + CHART_PAD.left.toFixed(2) + '" y1="' + midY.toFixed(2) + '" x2="' +
      (width - CHART_PAD.right).toFixed(2) + '" y2="' + midY.toFixed(2) +
      '" stroke="' + CHART_PRIMARY + '" stroke-width="1.5" stroke-dasharray="4 4"/>');
    p0.push('<circle cx="' + cxp.toFixed(2) + '" cy="' + midY.toFixed(2) + '" r="4" fill="' + CHART_PRIMARY + '">' +
      '<title>' + escapeHtml(labels[0]) + '：' + val + '</title></circle>');
    p0.push(svgClose());
    p0.push('<div class="chart-note">僅 1 個資料點，趨勢線無意義</div>');
    return p0.join('');
  }

  var hasNegative = values.some(function (v) { return v < 0; });
  var allZero = values.every(function (v) { return v === 0; });

  var ticks;
  if (allZero) {
    ticks = [0, 0.2, 0.4, 0.6, 0.8, 1];
  } else if (hasNegative) {
    ticks = niceScale(Math.min(0, Math.min.apply(null, values)), Math.max(0, Math.max.apply(null, values)), 5);
  } else {
    var range = safeRange(Math.min.apply(null, values), Math.max.apply(null, values));
    ticks = niceScale(range[0], range[1], 5); // Line 不強制含 0
  }

  var yMin = ticks[0], yMax = ticks[ticks.length - 1];
  var step = ticks[1] - ticks[0];
  var decimals = Math.max(0, -Math.floor(Math.log10(step)));

  function y(v) {
    return CHART_PAD.top + plotH * (yMax - v) / (yMax - yMin);
  }
  function x(i) {
    return CHART_PAD.left + plotW * i / (n - 1);
  }

  var axisY = CHART_PAD.top + plotH;
  var B = plotW / n;
  var layout = decideLabelLayout(labels, B, fontSize);

  var parts = [];
  parts.push(svgOpen(width, height));

  appendYAxis(parts, ticks, decimals, CHART_PAD.left, width - CHART_PAD.right, fontSize, y);

  if (hasNegative) {
    var zeroY = y(0);
    parts.push('<line class="chart-zero-line" x1="' + CHART_PAD.left.toFixed(2) + '" y1="' + zeroY.toFixed(2) +
      '" x2="' + (width - CHART_PAD.right).toFixed(2) + '" y2="' + zeroY.toFixed(2) +
      '" stroke="#666666" stroke-width="1"/>');
  }

  var pts = series.map(function (s, i) {
    return { x: x(i), y: y(s.value) };
  });

  var d = pts.map(function (p, i) {
    return (i === 0 ? 'M' : 'L') + p.x.toFixed(2) + ',' + p.y.toFixed(2);
  }).join(' ');
  parts.push('<path d="' + d + '" fill="none" stroke="' + CHART_PRIMARY + '" stroke-width="2"/>');

  pts.forEach(function (p, i) {
    parts.push('<circle cx="' + p.x.toFixed(2) + '" cy="' + p.y.toFixed(2) + '" r="3" fill="' + CHART_PRIMARY + '">' +
      '<title>' + escapeHtml(labels[i]) + '：' + series[i].value + '</title></circle>');
    appendXLabel(parts, layout, i, p.x, axisY, fontSize, false);
  });

  parts.push(svgClose());

  var notes = [];
  if (allZero) notes.push('所有數值皆為 0');
  if (layout.mode === 'thin') notes.push('類別過多，每 ' + layout.k + ' 個顯示 1 個標籤');
  if (notes.length) parts.push('<div class="chart-note">' + escapeHtml(notes.join('；')) + '</div>');

  return parts.join('');
}

// ---------- renderPieChart ----------

function polarToCartesian(cx, cy, r, angleDeg) {
  var rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describePieSlicePath(cx, cy, r, startAngle, endAngle) {
  var start = polarToCartesian(cx, cy, r, startAngle);
  var end = polarToCartesian(cx, cy, r, endAngle);
  var largeArcFlag = (endAngle - startAngle) <= 180 ? '0' : '1';
  return [
    'M', cx.toFixed(2), cy.toFixed(2),
    'L', start.x.toFixed(2), start.y.toFixed(2),
    'A', r.toFixed(2), r.toFixed(2), 0, largeArcFlag, 1, end.x.toFixed(2), end.y.toFixed(2),
    'Z'
  ].join(' ');
}

function renderPieChart(series, opts) {
  opts = opts || {};
  series = (series || []).filter(function (s) {
    return typeof s.value === 'number' && Number.isFinite(s.value);
  });

  if (series.length === 0) {
    return chartEmptyHtml('沒有可繪製的資料。可能是 Filter 條件把所有列都排除了。');
  }

  var hasNegative = series.some(function (s) { return s.value < 0; });
  if (hasNegative) {
    return chartEmptyHtml('資料含負值，圓餅圖無法表達占比，請改用 Bar。');
  }

  var total = series.reduce(function (sum, s) { return sum + s.value; }, 0);
  if (total === 0) {
    return chartEmptyHtml('所有數值皆為 0，無法計算占比。');
  }

  var width = opts.width || CHART_DEFAULT_WIDTH;
  var height = opts.height || CHART_DEFAULT_HEIGHT;
  var maxSlices = opts.maxPieSlices || 8;

  // B5-6：依 Measure 值降冪排序；類別數 <= 9 全畫，>= 10 取前 8 + 「其他」
  var sorted = series.slice().sort(function (a, b) { return b.value - a.value; });

  var slices;
  if (sorted.length <= maxSlices + 1) {
    slices = sorted.map(function (s) {
      return { label: String(s.label), value: s.value, isOther: false };
    });
  } else {
    var top = sorted.slice(0, maxSlices);
    var rest = sorted.slice(maxSlices);
    var restSum = rest.reduce(function (sum, s) { return sum + s.value; }, 0);
    slices = top.map(function (s) {
      return { label: String(s.label), value: s.value, isOther: false };
    });
    slices.push({ label: '其他（' + rest.length + ' 個類別）', value: restSum, isOther: true });
  }

  var cx = width / 2, cy = height / 2;
  var r = Math.min(width, height) / 2 - 40;

  var parts = [];
  parts.push(svgOpen(width, height));

  // B5-2：單一分片，畫整圓 100%
  if (slices.length === 1) {
    var onlyColor = slices[0].isOther ? CHART_GRAY : CHART_COLORS[0];
    parts.push('<circle cx="' + cx.toFixed(2) + '" cy="' + cy.toFixed(2) + '" r="' + r.toFixed(2) +
      '" fill="' + onlyColor + '"><title>' + escapeHtml(slices[0].label) + ' 100%</title></circle>');
    parts.push('<text x="' + cx.toFixed(2) + '" y="' + cy.toFixed(2) + '" font-size="' + CHART_FONT_SIZE +
      '" text-anchor="middle" fill="#ffffff">' + escapeHtml(slices[0].label) + ' 100%</text>');
    parts.push(svgClose());
    return parts.join('');
  }

  var cumulative = 0;
  var legendParts = [];
  slices.forEach(function (s, i) {
    var color = s.isOther ? CHART_GRAY : CHART_COLORS[i % CHART_COLORS.length];
    var pct = s.value / total * 100;
    var startAngle = cumulative / total * 360;
    cumulative += s.value;
    var endAngle = cumulative / total * 360;

    if (s.value > 0) {
      var d = describePieSlicePath(cx, cy, r, startAngle, endAngle);
      parts.push('<path d="' + d + '" fill="' + color + '"><title>' + escapeHtml(s.label) + ' ' +
        pct.toFixed(1) + '%</title></path>');
    }
    legendParts.push('<div class="chart-legend-item"><span class="chart-legend-swatch" style="background:' +
      color + '"></span>' + escapeHtml(s.label) + '（' + pct.toFixed(1) + '%）</div>');
  });

  parts.push(svgClose());
  parts.push('<div class="chart-legend">' + legendParts.join('') + '</div>');
  if (sorted.length > maxSlices + 1) {
    parts.push('<div class="chart-note">已將第 ' + (maxSlices + 1) + ' 名以後的 ' +
      (sorted.length - maxSlices) + ' 個類別合併為「其他」</div>');
  }
  return parts.join('');
}

// ---------- Node 測試用出口（瀏覽器端 module 為 undefined，不影響 bundle） ----------

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    niceNum: niceNum,
    niceScale: niceScale,
    decideLabelLayout: decideLabelLayout,
    truncateLabel: truncateLabel,
    estimateLabelWidth: estimateLabelWidth,
    CHART_COLORS: CHART_COLORS,
    CHART_GRAY: CHART_GRAY,
    CHART_PAD: CHART_PAD,
    CHART_DEFAULT_WIDTH: CHART_DEFAULT_WIDTH,
    CHART_DEFAULT_HEIGHT: CHART_DEFAULT_HEIGHT,
    renderBarChart: renderBarChart,
    renderLineChart: renderLineChart,
    renderPieChart: renderPieChart
  };
}
