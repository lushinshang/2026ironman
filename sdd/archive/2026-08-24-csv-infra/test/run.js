#!/usr/bin/env node

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '../../..');
const shared = path.join(root, 'VibeCoding/shared');
let fileReaderConstructed = 0;

function TestFileReader() {
  fileReaderConstructed += 1;
  this.result = null;
}

TestFileReader.prototype.readAsText = function (file) {
  this.result = file.text;
  this.onload();
};

TestFileReader.prototype.readAsArrayBuffer = function (file) {
  this.result = file.bytes;
  this.onload();
};

function loadContext() {
  const context = vm.createContext({
    Array,
    ArrayBuffer,
    Blob,
    Date,
    Error,
    FileReader: TestFileReader,
    Int32Array,
    Math,
    Number,
    Object,
    RegExp,
    String,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    Uint16Array
  });
  context.globalThis = context;
  context.self = context;
  [
    'vendor/papaparse-5.6.0.min.js',
    'vendor/fflate.umd.js',
    'csv-decode.js',
    'csv-parse.js',
    'csv-write.js',
    'csv-types.js',
    'io-zip.js',
    'io-dropzone.js'
  ].forEach(function (file) {
    vm.runInContext(fs.readFileSync(path.join(shared, file), 'utf8'), context, {
      filename: file
    });
  });
  return context;
}

function comparable(value) {
  return JSON.parse(JSON.stringify(value));
}

function same(actual, expected) {
  assert.deepStrictEqual(comparable(actual), expected);
}

function element() {
  return {
    listeners: {},
    classList: {
      add: function () {},
      remove: function () {}
    },
    addEventListener: function (name, listener) {
      this.listeners[name] = listener;
    }
  };
}

function drop(target, file) {
  target.listeners.drop({
    preventDefault: function () {},
    dataTransfer: { files: [file] }
  });
}

function change(target, file) {
  target.files = [file];
  target.listeners.change();
}

function makeTypeTable(values) {
  return {
    headers: ['value'],
    rows: values.map(function (value, index) {
      return { line: index + 2, cells: [value] };
    })
  };
}

async function verifyZip(context) {
  const blob = context.createZipBlob([
    { name: '業務部.csv', text: 'a,b\n1,2\n' },
    { name: 'plain.csv', text: 'x,y\n3,4\n' }
  ]);
  assert.ok(blob instanceof Blob);
  assert.strictEqual(blob.type, 'application/zip');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-infra-'));
  const zipPath = path.join(tempDir, 'output.zip');
  try {
    fs.writeFileSync(zipPath, Buffer.from(await blob.arrayBuffer()));
    const python = [
      'import struct, sys, zipfile',
      'zip_path = sys.argv[1]',
      'with zipfile.ZipFile(zip_path) as archive:',
      "    assert archive.namelist() == ['業務部.csv', 'plain.csv']", 
      "    assert archive.read('業務部.csv') == b'a,b\\n1,2\\n'",
      "    assert archive.read('plain.csv') == b'x,y\\n3,4\\n'",
      'data = open(zip_path, "rb").read()',
      'flags = {}',
      'offset = 0',
      'while data[offset:offset + 4] == b"PK\\x03\\x04":',
      '    flag = struct.unpack_from("<H", data, offset + 6)[0]',
      '    compressed_size = struct.unpack_from("<I", data, offset + 18)[0]',
      '    name_length = struct.unpack_from("<H", data, offset + 26)[0]',
      '    extra_length = struct.unpack_from("<H", data, offset + 28)[0]',
      '    raw_name = data[offset + 30:offset + 30 + name_length]',
      '    name = raw_name.decode("utf-8") if flag & 0x0800 else raw_name.decode("ascii")',
      '    flags[name] = flag',
      '    offset += 30 + name_length + extra_length + compressed_size',
      'assert flags["業務部.csv"] & 0x0800',
      'assert not (flags["plain.csv"] & 0x0800)',
      'print("ZIP extraction and local-header EFS flags: PASS")'
    ].join('\n');
    const result = childProcess.spawnSync('python3', ['-c', python, zipPath], {
      encoding: 'utf8'
    });
    assert.strictEqual(result.status, 0, result.stdout + result.stderr);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

const context = loadContext();
const tests = [];

function test(name, fn) {
  tests.push({ name: name, fn: fn });
}

test('decode: BOM / strict UTF-8 / Big5 fallback', function () {
  const bom = context.decodeCsvBytes(new Uint8Array([0xef, 0xbb, 0xbf, 0x61]).buffer);
  assert.strictEqual(bom.text, 'a');
  assert.strictEqual(bom.encoding, 'utf-8');
  assert.strictEqual(bom.hadBom, true);
  assert.strictEqual(bom.confidence, 'bom');

  const strict = context.decodeCsvBytes(new TextEncoder().encode('測試').buffer);
  assert.strictEqual(strict.text, '測試');
  assert.strictEqual(strict.confidence, 'strict');

  const fallback = context.decodeCsvBytes(new Uint8Array([0xa4, 0xa4]).buffer);
  assert.strictEqual(fallback.text, '中');
  assert.strictEqual(fallback.encoding, 'big5');
  assert.strictEqual(fallback.confidence, 'fallback');
});

test('decode: byte-size gates', function () {
  const mb = 1024 * 1024;
  same(context.checkCsvFileSize(4 * mb), { ok: true, level: 'ok', message: '' });
  const warning = context.checkCsvFileSize(10 * mb);
  assert.strictEqual(warning.ok, true);
  assert.strictEqual(warning.level, 'warn');
  assert.match(warning.message, /較大|數秒/);
  const rejected = context.checkCsvFileSize(25 * mb);
  assert.strictEqual(rejected.ok, false);
  assert.strictEqual(rejected.level, 'reject');
  assert.ok(rejected.message.length > 0);
});

test('parse: mixed line endings and delimiter detection', function () {
  const mixed = context.parseCsv('a,b\r\n1,2\n3,4\r\n');
  assert.strictEqual(mixed.meta.lineEnding, 'mixed');
  same(mixed.rows.map(function (row) { return row.cells; }), [['1', '2'], ['3', '4']]);
  assert.strictEqual(context.parseCsv('a;b\n1;2\n3;4').meta.delimiter, ';');
  assert.strictEqual(context.parseCsv('a\tb\n1\t2\n3\t4').meta.delimiter, '\t');
});

test('parse: BOM, decode metadata, and all six meta fields', function () {
  const table = context.parseCsv('\ufeffa,b\n1,2\n3,4\n', {
    encoding: 'big5', hadBom: false
  });
  same(table.rows.map(function (row) { return row.line; }), [2, 3]);
  same(table.meta, {
    encoding: 'big5',
    hadBom: true,
    lineEnding: 'lf',
    delimiter: ',',
    headerCount: 2,
    raggedRows: []
  });
  const decodedBom = context.parseCsv('a,b\n1,2\n', { encoding: 'utf-8', hadBom: true });
  assert.strictEqual(decodedBom.meta.hadBom, true);
});

test('parse: terminal blank row, quoted-newline line numbers, cellAt, and Table rules', function () {
  assert.strictEqual(context.parseCsv('a,b\n1,2\n').rows.length, 1);
  const withMiddleBlank = context.parseCsv('a,b\n1,2\n\n');
  same(withMiddleBlank.rows.map(function (row) { return row.cells; }), [['1', '2'], ['']]);
  const multiline = context.parseCsv('a,b\n"x\ny",2\n3,4\n');
  same(multiline.rows.map(function (row) { return row.line; }), [2, 4]);

  const ragged = context.parseCsv('a,b,c\n1,2\n\n3,4,5,6\n');
  same(ragged.rows.map(function (row) { return row.cells.length; }), [2, 1, 4]);
  same(ragged.meta.raggedRows, [2, 4]);
  assert.strictEqual(typeof ragged.rows[0].cells[0], 'string');
  assert.strictEqual(ragged.rows[0].cells[2], undefined);
  assert.strictEqual(context.cellAt(ragged.rows[0], 2), '');
  assert.strictEqual(context.cellAt(ragged.rows[0], -1), '');
  assert.strictEqual(context.cellAt(ragged.rows[0], 1.5), '');
  same(context.parseCsv('a,a,b\n1,2,3\n').headers, ['a', 'a', 'b']);
  const empty = context.parseCsv('a,,b\n');
  assert.strictEqual(empty.headers[1], '');
  const spaces = context.parseCsv('a,"  ",b\n');
  assert.strictEqual(spaces.headers[1], '  ');
});

test('write: BOM, comma output, RFC 4180 quoting, and column indexes', function () {
  const table = {
    headers: ['a', 'b'],
    meta: { delimiter: ';' },
    rows: [{ line: 2, cells: ['He said "hi"', '123'] }]
  };
  const withBom = context.toCsv(table);
  assert.ok(withBom.startsWith('\ufeff'));
  assert.ok(withBom.includes('"He said ""hi"""'));
  assert.ok(withBom.endsWith(',123'));
  assert.ok(!context.toCsv(table, { bom: false }).startsWith('\ufeff'));
  assert.strictEqual(context.toCsv(table, { bom: false, delimiter: ';' }),
    'a,b\r\n"He said ""hi""",123');
  assert.strictEqual(context.toCsv(table, { bom: false, columns: [1, 0] }),
    'b,a\r\n123,"He said ""hi"""');
  [null, ['a'], [1.5], [-1], [2]].forEach(function (columns) {
    assert.throws(function () {
      context.toCsv(table, { columns: columns });
    }, /opts\.columns/);
  });
});

test('write: short-row padding is identical whether or not columns is passed', function () {
  const raggedTable = context.parseCsv('a,b,c\n1\n');
  assert.strictEqual(raggedTable.rows[0].cells.length, 1);
  same(raggedTable.meta.raggedRows, [2]);

  const withoutColumns = context.toCsv(raggedTable, { bom: false });
  const withColumns = context.toCsv(raggedTable, { bom: false, columns: [0, 1, 2] });
  assert.strictEqual(withoutColumns, withColumns);
  assert.strictEqual(withoutColumns, 'a,b,c\r\n1,,');

  // regression: parseCsv() itself must stay unaffected by the export padding change
  assert.strictEqual(raggedTable.rows[0].cells.length, 1);
  same(raggedTable.meta.raggedRows, [2]);
});

test('types: 0.9 number threshold, 0.8 text threshold, and no mutation', function () {
  const atThreshold = makeTypeTable(['1', '2', 'abc', '4', '5', '6', '7', '8', '9', '10']);
  const before = comparable(atThreshold.rows);
  const numberType = context.inferColumnTypes(atThreshold)[0];
  same(numberType, { kind: 'number', sampleSize: 10, matched: 9, mismatchLines: [4] });
  same(atThreshold.rows, before);
  const belowThreshold = makeTypeTable(['1', '2', 'abc', 'xyz', '5', '6', '7', '8', '9', '10']);
  same(context.inferColumnTypes(belowThreshold)[0], {
    kind: 'text', sampleSize: 10, matched: 10, mismatchLines: []
  });
});

test('types: NaN rejections, date whitelist, and mechanical date parts', function () {
  ['1,234', '$5', '12%', '(3)', '１２３'].forEach(function (value) {
    assert.ok(Number.isNaN(context.toNumber(value)), value);
  });
  ['2026-08-23', '2026/8/3', '20260823', '2026-08', '2026'].forEach(function (value) {
    assert.strictEqual(context.isDateLike(value), true, value);
  });
  ['115/08/23', 'abc 2026'].forEach(function (value) {
    assert.strictEqual(context.isDateLike(value), false, value);
  });
  same(context.dateParts('2026-08-23'), { y: 2026, m: 8, d: 23 });
  same(context.dateParts('2026-08'), { y: 2026, m: 8, d: null });
  same(context.dateParts('2026'), { y: 2026, m: null, d: null });
  assert.strictEqual(context.dateParts('abc'), null);
});

test('zip: Python extraction and EFS-bit inspection', function () {
  return verifyZip(context);
});

test('parse and ZIP: missing bundled dependencies fail clearly', function () {
  const parseSource = fs.readFileSync(path.join(shared, 'csv-parse.js'), 'utf8');
  const zipSource = fs.readFileSync(path.join(shared, 'io-zip.js'), 'utf8');
  assert.throws(function () {
    vm.runInNewContext(parseSource, { Number: Number });
  }, /csv-parse\.js requires the Papa Parse asset/);
  assert.throws(function () {
    vm.runInNewContext(zipSource, {});
  }, /io-zip\.js requires the fflate asset/);
});

test('dropzone: legacy text, bytes, gates, and equivalent picker/drop', function () {
  const textFile = { name: 'legacy.txt', text: 'legacy text' };
  const legacyDrop = element();
  let legacyResult;
  fileReaderConstructed = 0;
  context.setupDropZone(legacyDrop, function (data, name) { legacyResult = [data, name]; });
  drop(legacyDrop, textFile);
  same(legacyResult, ['legacy text', 'legacy.txt']);
  assert.strictEqual(fileReaderConstructed, 1);

  const bytesFile = { name: 'data.csv', bytes: new Uint8Array([65, 66]).buffer };
  const bytesDrop = element();
  let bytesResult;
  context.setupDropZone(bytesDrop, function (data) { bytesResult = data; }, {
    mode: 'bytes', accept: ['.csv']
  });
  drop(bytesDrop, bytesFile);
  assert.ok(bytesResult instanceof ArrayBuffer);

  fileReaderConstructed = 0;
  let errors = [];
  let blockedDataCalls = 0;
  const blockedOptions = {
    accept: ['.csv'],
    gate: function () { return { ok: false, level: 'reject', message: '太大' }; },
    onError: function (message) { errors.push(message); }
  };
  const blockedDrop = element();
  const blockedPicker = element();
  context.setupDropZone(blockedDrop, function () { blockedDataCalls += 1; }, blockedOptions);
  context.setupFilePicker(blockedPicker, function () { blockedDataCalls += 1; }, blockedOptions);
  drop(blockedDrop, bytesFile);
  change(blockedPicker, bytesFile);
  same(errors, ['太大', '太大']);
  assert.strictEqual(blockedDataCalls, 0);
  assert.strictEqual(fileReaderConstructed, 0);

  fileReaderConstructed = 0;
  const allowedDrop = element();
  let allowedData;
  context.setupDropZone(allowedDrop, function (data, name) { allowedData = [data, name]; }, {
    mode: 'bytes', accept: ['.csv'], gate: function () { return { ok: true }; }
  });
  drop(allowedDrop, bytesFile);
  assert.ok(allowedData[0] instanceof ArrayBuffer);
  assert.strictEqual(allowedData[1], 'data.csv');
  assert.strictEqual(fileReaderConstructed, 1);

  const sameDrop = element();
  const samePicker = element();
  let dropped;
  let picked;
  const sharedOptions = { mode: 'bytes', accept: ['.csv'] };
  context.setupDropZone(sameDrop, function (data, name) { dropped = [data, name]; }, sharedOptions);
  context.setupFilePicker(samePicker, function (data, name) { picked = [data, name]; }, sharedOptions);
  drop(sameDrop, bytesFile);
  change(samePicker, bytesFile);
  assert.strictEqual(dropped[1], picked[1]);
  assert.ok(dropped[0] instanceof ArrayBuffer);
  assert.ok(picked[0] instanceof ArrayBuffer);
  same(Array.from(new Uint8Array(dropped[0])), Array.from(new Uint8Array(picked[0])));
});

(async function run() {
  let failed = 0;
  for (const item of tests) {
    try {
      await item.fn();
      console.log('PASS ' + item.name);
    } catch (error) {
      failed += 1;
      console.error('FAIL ' + item.name + ': ' + (error.stack || error.message));
    }
  }
  process.exitCode = failed ? 1 : 0;
  console.log(failed ? 'FAILURES ' + failed : 'ALL PASS ' + tests.length);
})();
