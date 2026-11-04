// shared/csv-parse.js
// Papa Parse 5.6.0 must be bundled before this module.
if (typeof Papa === 'undefined' || !Papa || typeof Papa.parse !== 'function') {
  throw new Error('csv-parse.js requires the Papa Parse asset to be loaded first.');
}

function cellAt(row, i) {
  if (!row || !row.cells || !Number.isInteger(i) || i < 0 || i >= row.cells.length) {
    return '';
  }
  return typeof row.cells[i] === 'undefined' ? '' : row.cells[i];
}

function detectCsvLineEnding(text) {
  var withoutCrlf = text.replace(/\r\n/g, '');
  var hasCrlf = /\r\n/.test(text);
  var hasBareCr = /\r/.test(withoutCrlf);
  var hasBareLf = /\n/.test(withoutCrlf);

  if (hasCrlf && !hasBareCr && !hasBareLf) return 'crlf';
  if (!hasCrlf && !hasBareCr) return 'lf';
  return 'mixed';
}

function normalizeCsvLineEndings(text) {
  return text.replace(/\r\n?/g, '\n');
}

function detectCsvDelimiter(text) {
  var candidates = [',', '\t', ';'];
  var best = null;

  candidates.forEach(function (delimiter, priority) {
    var preview = Papa.parse(text, {
      delimiter: delimiter,
      preview: 10,
      skipEmptyLines: true,
      dynamicTyping: false
    }).data;
    var widths = {};
    var modeWidth = 0;
    var modeCount = 0;

    preview.forEach(function (row) {
      var width = row.length;
      widths[width] = (widths[width] || 0) + 1;
      if (widths[width] > modeCount) {
        modeWidth = width;
        modeCount = widths[width];
      }
    });

    // A delimiter absent from every row makes a stable one-cell result. It is
    // not evidence that the delimiter is in use, so do not select it.
    if (!preview.length || modeWidth < 2) return;

    var candidate = {
      delimiter: delimiter,
      stability: modeCount / preview.length,
      width: modeWidth,
      priority: priority
    };
    if (!best || candidate.stability > best.stability ||
        (candidate.stability === best.stability && candidate.width > best.width) ||
        (candidate.stability === best.stability && candidate.width === best.width &&
         candidate.priority < best.priority)) {
      best = candidate;
    }
  });

  return best ? best.delimiter : ',';
}

function parseCsv(text, opts) {
  opts = opts || {};
  var beginsWithBom = text.charCodeAt(0) === 0xfeff;
  if (beginsWithBom) text = text.slice(1);
  var lineEnding = detectCsvLineEnding(text);
  var normalizedText = normalizeCsvLineEndings(text);
  var delimiter = opts.delimiter || detectCsvDelimiter(normalizedText);
  var parsedRows = [];
  var previousCursor = 0;
  var currentLine = 1;

  Papa.parse(normalizedText, {
    delimiter: delimiter,
    dynamicTyping: false,
    step: function (result) {
      var consumed = normalizedText.slice(previousCursor, result.meta.cursor);
      var newlineCount = (consumed.match(/\n/g) || []).length;

      parsedRows.push({
        line: currentLine,
        cells: result.data.map(String)
      });
      currentLine += newlineCount;
      previousCursor = result.meta.cursor;
    }
  });
  if (parsedRows.length && parsedRows[parsedRows.length - 1].cells.length === 1 &&
      parsedRows[parsedRows.length - 1].cells[0] === '') {
    parsedRows.pop();
  }

  var headers = parsedRows.length ? parsedRows.shift().cells : [];
  var raggedRows = parsedRows.filter(function (row) {
    return !(row.cells.length === 1 && row.cells[0] === '') &&
      row.cells.length !== headers.length;
  }).map(function (row) {
    return row.line;
  });

  return {
    headers: headers,
    rows: parsedRows,
    meta: {
      encoding: opts.encoding || 'utf-8',
      hadBom: beginsWithBom || opts.hadBom === true,
      lineEnding: lineEnding,
      delimiter: delimiter,
      headerCount: headers.length,
      raggedRows: raggedRows
    }
  };
}
