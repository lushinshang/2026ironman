// shared/csv-write.js

// 試算表公式注入防護（見 CSV_CONTRACT.md 第 4.2a 節、LEVEL1B_RULINGS.md 裁示 17）
var CSV_FORMULA_LEAD = /^[=+\-@\t\r]/;

function needsFormulaGuard(text) {
  if (!CSV_FORMULA_LEAD.test(text)) return false;
  // 單一字元構不成公式，且 '-' 單獨一格是報表常見的「無資料」標記，不逃脫。
  if (text.length < 2) return false;
  if (typeof toNumber !== 'function') {
    throw new Error('csv-write.js requires csv-types.js (toNumber) to be bundled first.');
  }
  // 數字不逃脫：'-5.6' 是合法數值，逃脫它會把整個數值欄變成文字。
  return Number.isNaN(toNumber(text));
}

function csvCell(value, delimiter) {
  var text = String(value);
  if (needsFormulaGuard(text)) {
    text = "'" + text;
  }
  if (text.indexOf(delimiter) !== -1 || text.indexOf('"') !== -1 ||
      text.indexOf('\r') !== -1 || text.indexOf('\n') !== -1) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

function toCsv(table, opts) {
  opts = opts || {};
  var delimiter = ',';
  var columns = opts.columns;
  var lines = [];

  if (Object.prototype.hasOwnProperty.call(opts, 'columns')) {
    if (!Array.isArray(columns)) {
      throw new Error('opts.columns must be an array of column indexes.');
    }
    columns.forEach(function (index) {
      if (!Number.isInteger(index) || index < 0 || index >= table.headers.length) {
        throw new Error('opts.columns contains an invalid column index: ' + index);
      }
    });
  }

  var headerCount = (table.meta && Number.isInteger(table.meta.headerCount))
    ? table.meta.headerCount
    : table.headers.length;

  function selectHeader() {
    if (!columns) return table.headers;
    return columns.map(function (index) {
      return table.headers[index];
    });
  }

  function selectCells(row) {
    if (!columns) {
      var full = [];
      for (var i = 0; i < headerCount; i += 1) {
        full.push(cellAt(row, i));
      }
      return full;
    }
    return columns.map(function (index) {
      return cellAt(row, index);
    });
  }

  lines.push(selectHeader().map(function (cell) {
    return csvCell(cell, delimiter);
  }).join(delimiter));
  table.rows.forEach(function (row) {
    lines.push(selectCells(row).map(function (cell) {
      return csvCell(cell, delimiter);
    }).join(delimiter));
  });

  return (opts.bom === false ? '' : '\ufeff') + lines.join('\r\n');
}
