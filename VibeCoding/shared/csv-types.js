// shared/csv-types.js

function toNumber(s) {
  if (typeof s !== 'string') return NaN;
  var text = s.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) {
    return NaN;
  }
  var value = Number(text);
  return Number.isFinite(value) ? value : NaN;
}

function validCompactDate(year, month, day) {
  var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  if (month < 1 || month > 12) return false;
  if (month === 2 && leapYear) return day >= 1 && day <= 29;
  return day >= 1 && day <= daysInMonth[month - 1];
}

function dateParts(s) {
  if (typeof s !== 'string') return null;
  var match = /^(\d{4})([-/])(\d{2})\2(\d{2})$/.exec(s);
  if (match) {
    return { y: Number(match[1]), m: Number(match[3]), d: Number(match[4]) };
  }
  match = /^(\d{4})([-/])(\d)\2(\d)$/.exec(s);
  if (match) {
    return { y: Number(match[1]), m: Number(match[3]), d: Number(match[4]) };
  }
  match = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (match) {
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    return validCompactDate(year, month, day) ? { y: year, m: month, d: day } : null;
  }
  match = /^(\d{4})([-/])(\d{2})$/.exec(s);
  if (match) {
    return { y: Number(match[1]), m: Number(match[3]), d: null };
  }
  match = /^(\d{4})$/.exec(s);
  if (match) {
    return { y: Number(match[1]), m: null, d: null };
  }
  return null;
}

function isDateLike(s) {
  return dateParts(s) !== null;
}

function inferColumnTypes(table) {
  return table.headers.map(function (_, columnIndex) {
    var samples = [];

    table.rows.forEach(function (row) {
      var cell = row.cells[columnIndex];
      if (typeof cell === 'string' && cell !== '') {
        samples.push({ value: cell, line: row.line });
      }
    });

    var numericMatches = samples.filter(function (sample) {
      return !Number.isNaN(toNumber(sample.value));
    });
    var dateMatches = samples.filter(function (sample) {
      return isDateLike(sample.value);
    });
    var kind = 'text';
    var matched = samples.length;
    var mismatchLines = [];

    if (samples.length >= 3 && numericMatches.length / samples.length >= 0.9) {
      kind = 'number';
      matched = numericMatches.length;
      mismatchLines = samples.filter(function (sample) {
        return Number.isNaN(toNumber(sample.value));
      }).map(function (sample) {
        return sample.line;
      });
    } else if (samples.length >= 3 && dateMatches.length / samples.length >= 0.9) {
      kind = 'date';
      matched = dateMatches.length;
      mismatchLines = samples.filter(function (sample) {
        return !isDateLike(sample.value);
      }).map(function (sample) {
        return sample.line;
      });
    }

    return {
      kind: kind,
      sampleSize: samples.length,
      matched: matched,
      mismatchLines: mismatchLines
    };
  });
}
